// Backend/src/jobs/scraperAgentCron.js
// War Room — Scraper Agent (Phase 2)
// Runs every 6 hours. Discovers new AI tools from Product Hunt + GitHub Trending.
// All discovered tools are queued for human approval — NEVER auto-published.
// Integrates with the existing productHuntScraper.js and githubTrendingScraper.js.

import cron from 'node-cron'
import Tool from '../models/Tool.js'
import { fetchProductHuntTools, mapPHTool } from '../services/productHuntScraper.js'
import { fetchGitHubTrendingAI } from '../services/githubTrendingScraper.js'
import { agentLog, queueForApproval, setAgentStatus } from '../services/agentOrchestrator.js'

/**
 * Slugify a tool name to a URL-safe slug.
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80)
}

/**
 * Check if a tool already exists in the database.
 * Checks by URL (officialUrl) and by slug to prevent duplicates.
 * @param {string} url
 * @param {string} slug
 * @returns {Promise<boolean>}
 */
async function isDuplicate(url, slug) {
  try {
    const existing = await Tool.findOne({
      $or: [
        { officialUrl: url },
        { slug },
        { sourceUrl: url },
      ],
    }).lean()
    return !!existing
  } catch {
    return false
  }
}

/**
 * Process a discovered tool — dedup, create a pending draft, queue for approval.
 * @param {Object} toolData
 * @param {string} toolData.name
 * @param {string} toolData.url
 * @param {string} toolData.source
 * @param {string} toolData.sourceUrl
 * @param {string} [toolData.description]
 * @param {string} [toolData.logoUrl]
 * @param {string} [toolData.tagline]
 */
async function processDiscoveredTool(toolData) {
  const { name, url, source, sourceUrl, description, logoUrl, tagline } = toolData

  if (!name || !url) {
    return { status: 'skipped', reason: 'missing name or url' }
  }

  const slug = slugify(name)

  // Dedup check — skip if we already have this tool
  const alreadyExists = await isDuplicate(url, slug)
  if (alreadyExists) {
    await agentLog('scraper', `⏭️ Skipping duplicate: ${name}`, 'info', { url })
    return { status: 'skipped', reason: 'duplicate' }
  }

  // Create a draft Tool record — status 'pending', isActive: false
  // This tool is HIDDEN from the public until an admin approves it in the War Room
  let draft
  try {
    draft = await Tool.create({
      name,
      slug,
      officialUrl: url,
      shortDescription: tagline || (description || '').slice(0, 200) || `AI tool: ${name}`,
      sourceFoundBy: source,
      sourceUrl,
      logo: logoUrl || '',
      status: 'pending',
      isActive: false,
      dataQualityFlags: ['agent_discovered'],
    })
  } catch (err) {
    // Slug collision from concurrent run — skip gracefully
    if (err.code === 11000) {
      await agentLog('scraper', `⏭️ Slug collision (race): ${name}`, 'info', { slug })
      return { status: 'skipped', reason: 'slug_collision' }
    }
    throw err
  }

  // Log discovery
  await agentLog(
    'scraper',
    `🔍 Found new tool: ${name} (via ${source})`,
    'info',
    { toolId: draft._id.toString(), url, source }
  )

  // Queue for human approval in the War Room
  await queueForApproval({
    agentName: 'scraper',
    actionType: 'index_tool',
    title: `Index new tool: ${name}`,
    description:
      `Source: ${source}\n` +
      `URL: ${url}\n` +
      `Source page: ${sourceUrl}\n\n` +
      (description || tagline || 'No description available.'),
    payload: {
      toolId: draft._id.toString(),
      toolName: name,
      toolUrl: url,
      toolSlug: slug,
      source,
    },
  })

  return { status: 'queued', toolId: draft._id.toString() }
}

/**
 * Main scraper agent run function.
 * Exported so it can be triggered manually from the War Room UI.
 */
export async function runScraperAgent() {
  // Guard against concurrent runs
  if (runScraperAgent._running) {
    await agentLog('scraper', '⚠️ Scraper agent already running — skipping this trigger', 'warning')
    return
  }

  runScraperAgent._running = true
  setAgentStatus('scraper', 'running')

  const stats = {
    productHuntFound: 0,
    githubFound: 0,
    queued: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    await agentLog('scraper', '⏰ Scraper agent starting 6-hour discovery run', 'info')

    // ── Source 1: Product Hunt ────────────────────────────────────────────────
    try {
      await agentLog('scraper', '📡 Fetching from Product Hunt...', 'info')
      const phPosts = await fetchProductHuntTools(1) // Last 24 hours
      const phTools = phPosts.map(mapPHTool)
      stats.productHuntFound = phTools.length

      await agentLog('scraper', `📦 Product Hunt: ${phTools.length} tools fetched`, 'info')

      for (const tool of phTools) {
        try {
          const result = await processDiscoveredTool({
            name: tool.name,
            url: tool.url,
            source: 'producthunt',
            sourceUrl: tool.sourceUrl,
            description: tool.description,
            logoUrl: tool.logoUrl,
            tagline: tool.tagline,
          })
          if (result.status === 'queued') stats.queued++
          else stats.skipped++
        } catch (err) {
          stats.errors++
          console.error(`[ScraperAgent] Error processing PH tool "${tool.name}":`, err.message)
        }
      }
    } catch (err) {
      stats.errors++
      await agentLog('scraper', `❌ Product Hunt fetch failed: ${err.message}`, 'error')
    }

    // ── Source 2: GitHub Trending ────────────────────────────────────────────
    try {
      await agentLog('scraper', '📡 Fetching from GitHub Trending...', 'info')
      const ghTools = await fetchGitHubTrendingAI()
      stats.githubFound = ghTools.length

      await agentLog('scraper', `📦 GitHub Trending: ${ghTools.length} AI tools fetched`, 'info')

      for (const tool of ghTools) {
        try {
          const result = await processDiscoveredTool(tool)
          if (result.status === 'queued') stats.queued++
          else stats.skipped++
        } catch (err) {
          stats.errors++
          console.error(`[ScraperAgent] Error processing GitHub tool "${tool.name}":`, err.message)
        }
      }
    } catch (err) {
      stats.errors++
      await agentLog('scraper', `❌ GitHub Trending fetch failed: ${err.message}`, 'error')
    }

    // ── Final summary ─────────────────────────────────────────────────────────
    const summary =
      `✅ Scraper run complete — ` +
      `PH: ${stats.productHuntFound}, GH: ${stats.githubFound} | ` +
      `Queued: ${stats.queued}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`

    await agentLog('scraper', summary, 'success', stats)

    // Telegram summary (if there's anything meaningful to report)
    if (stats.queued > 0) {
      try {
        const { sendOwnerMessage } = await import('../services/telegramBot.js')
        await sendOwnerMessage(
          `🔍 *Scraper Agent Complete*\n` +
          `Found *${stats.queued} new tool(s)* awaiting your approval.\n\n` +
          `📊 PH: ${stats.productHuntFound} | GitHub: ${stats.githubFound}\n` +
          `⏭️ Skipped: ${stats.skipped} (duplicates)\n\n` +
          `Approve at: https://www.intelligrid.online/admin/war-room`
        )
      } catch (_) {
        // Telegram failure is non-critical
      }
    }
  } catch (err) {
    stats.errors++
    await agentLog('scraper', `❌ Scraper agent fatal error: ${err.message}`, 'error')
    console.error('[ScraperAgent] Fatal error:', err)
  } finally {
    runScraperAgent._running = false
    setAgentStatus('scraper', stats.errors > 0 ? 'error' : 'idle')
  }

  return stats
}
runScraperAgent._running = false

// ── Cron Registration ───────────────────────────────────────────────────────
// Runs every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC
// Only activates when WAR_ROOM_ENABLED=true is set in Railway env vars
let scraperScheduled = false

export function startScraperAgentCron() {
  if (scraperScheduled) return
  scraperScheduled = true

  if (process.env.WAR_ROOM_ENABLED !== 'true') {
    console.log('⚠️  [ScraperAgent] Disabled (set WAR_ROOM_ENABLED=true to activate)')
    return
  }

  cron.schedule(
    '0 */6 * * *',
    () => {
      runScraperAgent().catch((err) =>
        console.error('[ScraperAgent] Unhandled cron error:', err.message)
      )
    },
    { timezone: 'UTC' }
  )

  console.log('✅ [ScraperAgent] Scheduled — every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)')
}
