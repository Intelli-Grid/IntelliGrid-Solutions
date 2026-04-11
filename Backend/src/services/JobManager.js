/**
 * JobManager.js
 * IntelliGrid — Persistent background job manager.
 *
 * This is the ONLY gateway for starting, stopping, and querying all background jobs.
 * Nothing starts a crawler or enrichment run except through this service.
 *
 * Features:
 *  - Spawns Python / Node.js child processes via child_process.spawn()
 *  - Tracks state in MongoDB (JobState) for cross-restart persistence
 *  - Heartbeat every 30s to detect Railway restarts & zombie jobs
 *  - Parses "PROGRESS:processed:N:total:M" stdout lines for progress reporting
 *  - Streams last 100 log lines and last 20 error lines to MongoDB
 *  - Sends Telegram push alerts on completion, stop, and failure
 *  - Supports graceful shutdown via SIGTERM (Python checkpointing pattern)
 */

import { spawn }          from 'child_process'
import path               from 'path'
import { fileURLToPath }  from 'url'
import JobState           from '../models/JobState.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── In-memory process registry: { jobId → ChildProcess } ──────────────────────
const runningProcesses = new Map()

// ── Job definitions ─────────────────────────────────────────────────────────────
// Maps a stable jobId to its executable details.
//
// ALL crawlers use runtime: 'node' — the JS crawler wrappers in src/scripts/
// replace the old Python scripts entirely. This means:
//   - No Python runtime required on Railway (nixpacks stays Node-only)
//   - Single runtime to maintain
//   - Existing JS crawlers in src/jobs/crawlers/ are already proven to work
const JOB_DEFINITIONS = {
  crawler_futurepedia: {
    runtime: 'node',
    script:  path.join(__dirname, '../scripts/runCrawlerFuturepedia.js'),
    label:   'Futurepedia Crawler',
    singleton: true,
  },
  crawler_aixploria: {
    runtime: 'node',
    script:  path.join(__dirname, '../scripts/runCrawlerAixploria.js'),
    label:   'AIxploria Crawler',
    singleton: true,
  },
  crawler_futuretools: {
    runtime: 'node',
    // FutureTools JS crawler not yet ported — kept as a no-op placeholder.
    // Create src/scripts/runCrawlerFuturetools.js when ready to re-enable.
    script:  path.join(__dirname, '../scripts/runCrawlerFuturepedia.js'),
    label:   'FutureTools Crawler',
    singleton: true,
  },
  crawler_taaft: {
    runtime: 'node',
    script:  path.join(__dirname, '../scripts/runCrawlerTaaft.js'),
    label:   'TAAFT Crawler',
    singleton: true,
  },
  enrichment: {
    runtime: 'node',
    script:  path.join(__dirname, '../scripts/bulkEnrich.js'),
    label:   'Groq Enrichment',
    singleton: true,
  },
  importer: {
    runtime: 'node',
    script:  path.join(__dirname, '../scripts/importAll.js'),
    label:   'CSV Importer',
    singleton: true,
  },
}

// ── Telegram notify helper (lazy import to avoid circular deps) ────────────────
async function notifyOwner(message) {
  try {
    const mod = await import('./telegramBot.js')
    const sendAlert = mod.sendOwnerAlert
    if (typeof sendAlert === 'function') await sendAlert(message)
  } catch {
    // Silently swallow — Telegram failures must not crash jobs
  }
}

// ── Duration formatter ─────────────────────────────────────────────────────────
function formatDuration(startedAt) {
  if (!startedAt) return 'unknown'
  const ms   = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs  = Math.floor(mins / 60)
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`
}

// ── START JOB ──────────────────────────────────────────────────────────────────
/**
 * Starts a registered background job.
 *
 * @param {string} jobId   - Key from JOB_DEFINITIONS (e.g. "crawler_futurepedia")
 * @param {object} options - Optional extra params stored in JobState.options
 * @returns {Promise<object>} The saved JobState document
 * @throws {Error} If jobId is unknown or a singleton is already running
 */
export async function startJob(jobId, options = {}) {
  const def = JOB_DEFINITIONS[jobId]
  if (!def) throw new Error(`Unknown job: "${jobId}". Valid jobs: ${Object.keys(JOB_DEFINITIONS).join(', ')}`)

  // Singleton guard — only one instance of this job at a time
  if (def.singleton && runningProcesses.has(jobId)) {
    throw new Error(`${def.label} is already running. Send /stopjob ${jobId} first.`)
  }

  // Upsert the JobState document (create new or reset existing)
  const jobState = await JobState.findOneAndUpdate(
    { jobId },
    {
      $set: {
        jobId,
        label:          def.label,
        status:         'running',
        startedAt:      new Date(),
        lastHeartbeat:  new Date(),
        toolsProcessed: 0,
        totalTools:     undefined,
        options,
        logs:           [],
        errors:         [],
        completedAt:    undefined,
      },
    },
    { upsert: true, new: true }
  )

  // All jobs use Node.js — Python runtime branch removed.
  // Crawlers now use JS wrapper scripts in src/scripts/ that import
  // the proven JS crawlers in src/jobs/crawlers/.
  const cmd  = 'node'
  const args = [def.script]

  const proc = spawn(cmd, args, {
    env:   { ...process.env },           // Forward all Railway environment vars
    stdio: ['ignore', 'pipe', 'pipe'],   // stdin closed, capture stdout+stderr
  })

  runningProcesses.set(jobId, proc)
  console.log(`[JobManager] Started job "${jobId}" (PID ${proc.pid})`)

  // ── Heartbeat: keep MongoDB updated every 30s ─────────────────────────────
  const heartbeatInterval = setInterval(async () => {
    if (!runningProcesses.has(jobId)) {
      clearInterval(heartbeatInterval)
      return
    }
    try {
      await JobState.updateOne({ jobId }, { $set: { lastHeartbeat: new Date() } })
    } catch { /* ignore */ }
  }, 30_000)

  // ── Stream stdout → MongoDB logs ──────────────────────────────────────────
  let stdoutBuffer = ''
  proc.stdout.on('data', async (chunk) => {
    stdoutBuffer += chunk.toString()
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() // Hold incomplete final line across chunks

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        // Structured progress line: PROGRESS:processed:500:total:4000
        if (trimmed.startsWith('PROGRESS:')) {
          const parts     = trimmed.split(':')
          const processed = parseInt(parts[2], 10) || 0
          const total     = parseInt(parts[4], 10) || 0
          await JobState.updateOne(
            { jobId },
            { $set: { toolsProcessed: processed, totalTools: total, lastHeartbeat: new Date() } }
          )
          console.log(`[JobManager][${jobId}] Progress: ${processed}/${total}`)
          continue
        }

        // Regular log line — stored (capped at last 100)
        console.log(`[JobManager][${jobId}] ${trimmed}`)
        await JobState.updateOne(
          { jobId },
          {
            $push: {
              logs: {
                $each:  [{ ts: new Date(), msg: trimmed.slice(0, 500) }],
                $slice: -100,
              },
            },
          }
        )
      } catch { /* non-fatal */ }
    }
  })

  // ── Stream stderr → MongoDB errors ────────────────────────────────────────
  proc.stderr.on('data', async (chunk) => {
    const msg = chunk.toString().trim().slice(0, 500)
    if (!msg) return
    console.error(`[JobManager][${jobId}] STDERR: ${msg}`)
    try {
      await JobState.updateOne(
        { jobId },
        {
          $push: {
            errors: {
              $each:  [{ ts: new Date(), msg }],
              $slice: -20,
            },
          },
        }
      )
    } catch { /* non-fatal */ }
  })

  // ── Process exit handler ────────────────────────────────────────────────
  proc.on('exit', async (code, signal) => {
    clearInterval(heartbeatInterval)
    runningProcesses.delete(jobId)
    console.log(`[JobManager] Job "${jobId}" exited — code=${code}, signal=${signal}`)

    let state
    try { state = await JobState.findOne({ jobId }) } catch { state = null }

    try {
      if (code === 0) {
        // ── Clean success ───────────────────────────────────────────────
        await JobState.updateOne({ jobId }, { $set: { status: 'completed', completedAt: new Date() } })
        await notifyOwner(
          `✅ *${def.label} completed*\n` +
          `🛠 Tools processed: *${state?.toolsProcessed || 0}*\n` +
          `⏱ Duration: ${formatDuration(state?.startedAt)}\n` +
          `📅 ${new Date().toUTCString()}`
        )
      } else if (signal === 'SIGTERM') {
        // ── Manual stop via /stopjob ────────────────────────────────────
        await JobState.updateOne({ jobId }, { $set: { status: 'stopped', completedAt: new Date() } })
        await notifyOwner(
          `⏹️ *${def.label} stopped*\n` +
          `Stopped manually via Telegram /stopjob\n` +
          `Tools at stop: ${state?.toolsProcessed || 0}`
        )
      } else {
        // ── Unexpected failure ──────────────────────────────────────────
        await JobState.updateOne({ jobId }, { $set: { status: 'failed', completedAt: new Date() } })
        const lastError = state?.errors?.slice(-1)[0]?.msg || 'No error details available'
        await notifyOwner(
          `❌ *${def.label} FAILED*\n` +
          `Exit code: ${code}\n` +
          `Last error: ${lastError.slice(0, 300)}\n` +
          `Use /crawl ${jobId.replace('crawler_', '')} to retry`
        )
      }
    } catch (err) {
      console.error(`[JobManager] Error updating state for "${jobId}" on exit:`, err.message)
    }
  })

  // Handle spawn error (e.g. python3 not found on Railway)
  proc.on('error', async (err) => {
    clearInterval(heartbeatInterval)
    runningProcesses.delete(jobId)
    console.error(`[JobManager] Spawn error for "${jobId}":`, err.message)
    try {
      await JobState.updateOne(
        { jobId },
        { $set: { status: 'failed', completedAt: new Date() } },
        { $push: { errors: { $each: [{ ts: new Date(), msg: `Spawn error: ${err.message}` }], $slice: -20 } } }
      )
      await notifyOwner(`❌ *${def.label} failed to start*\n${err.message}`)
    } catch { /* non-fatal */ }
  })

  return jobState
}

// ── STOP JOB ───────────────────────────────────────────────────────────────────
/**
 * Sends SIGTERM to a running job. The process should catch this and clean up.
 *
 * @param {string} jobId
 * @returns {Promise<boolean>} true if signal was sent
 * @throws {Error} if the job is not currently running
 */
export async function stopJob(jobId) {
  const proc = runningProcesses.get(jobId)
  if (!proc) {
    let state
    try { state = await JobState.findOne({ jobId }).lean() } catch { state = null }
    throw new Error(
      `${jobId} is not currently running. ` +
      `Last known status: ${state?.status || 'never started'}`
    )
  }

  proc.kill('SIGTERM') // Python catches this, saves checkpoint, exits 0
  runningProcesses.delete(jobId)

  try {
    await JobState.updateOne({ jobId }, { $set: { status: 'stopping' } })
  } catch { /* non-fatal */ }

  console.log(`[JobManager] SIGTERM sent to job "${jobId}"`)
  return true
}

// ── GET SINGLE JOB STATUS ──────────────────────────────────────────────────────
/**
 * Returns the current status of a job, detecting "zombie" states where MongoDB
 * says "running" but the process was lost due to a Railway restart.
 *
 * @param {string} jobId
 * @returns {Promise<object|null>} JobState document with appended `isRunning` boolean
 */
export async function getJobStatus(jobId) {
  let state
  try { state = await JobState.findOne({ jobId }).lean() } catch { return null }
  if (!state) return null

  const isRunning = runningProcesses.has(jobId)

  // Zombie detection: DB says running but no process in memory
  if (state.status === 'running' && !isRunning) {
    try {
      await JobState.updateOne({ jobId }, { $set: { status: 'interrupted' } })
    } catch { /* non-fatal */ }
    state.status = 'interrupted'
  }

  return { ...state, isRunning }
}

// ── GET ALL JOB STATUSES ───────────────────────────────────────────────────────
/**
 * Returns status of all known jobs that have ever been run.
 *
 * @returns {Promise<Array>} Array of JobState documents with appended `isRunning`
 */
export async function getAllJobStatuses() {
  let states
  try {
    states = await JobState.find({}).lean()
  } catch {
    states = []
  }
  return states.map(s => ({ ...s, isRunning: runningProcesses.has(s.jobId) }))
}

// ── IS RUNNING ─────────────────────────────────────────────────────────────────
/**
 * Quick in-memory check (no DB hit) to see if a job process is alive.
 *
 * @param {string} jobId
 * @returns {boolean}
 */
export function isRunning(jobId) {
  return runningProcesses.has(jobId)
}

// ── GET RUNNING JOBS ───────────────────────────────────────────────────────────
/**
 * Returns an array of jobIds that are currently running in memory.
 *
 * @returns {string[]}
 */
export function getRunningJobIds() {
  return [...runningProcesses.keys()]
}

// ── EXPORTS ─────────────────────────────────────────────────────────────────────
export { JOB_DEFINITIONS, runningProcesses }
