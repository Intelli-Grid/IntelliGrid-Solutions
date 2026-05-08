// Backend/src/services/agentOrchestrator.js
// War Room — Central nervous system for all AI agents.
// Provides: activity logging, SSE broadcasting, approval queue management.
// Every agent imports from this file — never the reverse.

import AgentLog from '../models/AgentLog.js'
import PendingAction from '../models/PendingAction.js'

// ── In-memory Agent Registry ───────────────────────────────────────────────
// Tracks the last-known status of each agent. Persists in RAM between cron
// runs. Reset on server restart (which is fine — logs are in MongoDB).
const agentRegistry = {
  scraper:    { status: 'idle', lastRun: null, lastMessage: 'Not yet run', errorCount: 0 },
  content:    { status: 'idle', lastRun: null, lastMessage: 'Not yet run', errorCount: 0 },
  submission: { status: 'idle', lastRun: null, lastMessage: 'Not yet run', errorCount: 0 },
  uptime:     { status: 'idle', lastRun: null, lastMessage: 'Not yet run', errorCount: 0 },
}

// ── SSE Client Registry ────────────────────────────────────────────────────
// Holds open HTTP response objects for all connected War Room browser tabs.
const sseClients = new Set()

/**
 * Register an SSE client (called by the /war-room/stream route on connect).
 * Immediately sends the current registry snapshot so the UI is populated
 * without waiting for the next agent event.
 * @param {import('express').Response} res
 */
export function addSSEClient(res) {
  sseClients.add(res)
  // Send current snapshot immediately on connect
  res.write(
    `data: ${JSON.stringify({ type: 'snapshot', registry: agentRegistry })}\n\n`
  )
}

/**
 * Remove an SSE client on disconnect/close.
 * @param {import('express').Response} res
 */
export function removeSSEClient(res) {
  sseClients.delete(res)
}

/**
 * Broadcast a JSON event to all connected War Room browser tabs.
 * Silently removes dead connections (browser closed tab).
 * @param {Object} event
 */
function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const client of sseClients) {
    try {
      client.write(payload)
    } catch (_) {
      // Client disconnected without cleanup — remove it
      sseClients.delete(client)
    }
  }
}

/**
 * Agents call this to log an activity.
 * - Updates in-memory registry (instant War Room status update)
 * - Broadcasts to all open War Room browser tabs via SSE
 * - Persists to MongoDB AgentLog collection (non-blocking)
 *
 * @param {string} agentName  - 'scraper' | 'content' | 'submission' | 'uptime' | 'orchestrator'
 * @param {string} message    - Human-readable description of the action
 * @param {string} level      - 'info' | 'warning' | 'success' | 'error'
 * @param {Object} metadata   - Optional extra data (tool name, url, score, etc.)
 */
export async function agentLog(agentName, message, level = 'info', metadata = {}) {
  // Update in-memory registry status
  if (agentRegistry[agentName]) {
    const isError = level === 'error'
    const isDone = level === 'success'

    agentRegistry[agentName] = {
      ...agentRegistry[agentName],
      status: isError ? 'error' : isDone ? 'idle' : 'running',
      lastRun: new Date(),
      lastMessage: message,
      errorCount: isError
        ? (agentRegistry[agentName].errorCount || 0) + 1
        : agentRegistry[agentName].errorCount,
    }
  }

  // Broadcast to all open War Room tabs immediately
  broadcast({
    type: 'log',
    agentName,
    message,
    level,
    metadata,
    timestamp: new Date().toISOString(),
  })

  // Persist to MongoDB — non-blocking, never throw
  AgentLog.create({ agentName, message, level, metadata }).catch((err) => {
    console.error('[AgentOrchestrator] Log persist error:', err.message)
  })
}

/**
 * Agents call this to queue an action for human approval.
 * The action is NOT executed until an admin clicks Approve in the War Room.
 * Also pings the Telegram owner bot.
 *
 * @param {Object} opts
 * @param {string} opts.agentName   - Which agent is queuing this
 * @param {string} opts.actionType  - 'index_tool' | 'publish_blog_post' | 'send_welcome_email' | 'mark_tool_offline' | 'reject_submission'
 * @param {string} opts.title       - Short human-readable summary (shown in War Room card)
 * @param {string} opts.description - Full context for the approver
 * @param {Object} opts.payload     - Data to act on when approved
 * @returns {Promise<import('mongoose').Document>} The created PendingAction document
 */
export async function queueForApproval({ agentName, actionType, title, description, payload }) {
  try {
    const action = await PendingAction.create({
      agentName,
      actionType,
      title,
      description,
      payload,
    })

    // Broadcast the new pending action to all War Room tabs
    broadcast({ type: 'pending_action', action })

    // Log it as well so it appears in the live log stream
    await agentLog(
      agentName,
      `✋ Queued for approval: ${title}`,
      'warning',
      { actionId: action._id.toString(), actionType }
    )

    // Ping Telegram owner bot (non-blocking, non-critical)
    try {
      const { sendOwnerMessage } = await import('./telegramBot.js')
      await sendOwnerMessage(
        `⚡ *New action queued for approval*\n` +
        `*Agent:* ${agentName}\n` +
        `*Action:* ${title}\n\n` +
        `Approve at: https://www.intelligrid.online/admin/war-room`
      )
    } catch (_) {
      // Telegram failure must never block the agent workflow
    }

    return action
  } catch (err) {
    console.error('[AgentOrchestrator] queueForApproval error:', err.message)
    throw err
  }
}

/**
 * Returns the current in-memory agent registry snapshot.
 * Used by the War Room /status endpoint on initial page load.
 * @returns {Object}
 */
export function getAgentRegistry() {
  return agentRegistry
}

/**
 * Manually update agent status (called by agents at start/end of a run).
 * @param {string} agentName
 * @param {'idle'|'running'|'error'} status
 */
export function setAgentStatus(agentName, status) {
  if (agentRegistry[agentName]) {
    agentRegistry[agentName].status = status
    agentRegistry[agentName].lastRun = new Date()
    broadcast({ type: 'status_update', agentName, status, timestamp: new Date().toISOString() })
  }
}
