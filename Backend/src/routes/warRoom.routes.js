// Backend/src/routes/warRoom.routes.js
// War Room — All admin API endpoints for agent monitoring and approvals.
// All routes require admin authentication via requireAdmin middleware.

import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import AgentLog from '../models/AgentLog.js'
import PendingAction from '../models/PendingAction.js'
import {
  addSSEClient,
  removeSSEClient,
  getAgentRegistry,
  agentLog,
} from '../services/agentOrchestrator.js'

const router = Router()

// All War Room routes require admin role
router.use(requireAdmin)

// ── GET /api/v1/admin/war-room/status ─────────────────────────────────────
// Returns current in-memory agent registry snapshot (status, lastRun, etc.)
router.get('/status', (req, res) => {
  res.json({ success: true, registry: getAgentRegistry() })
})

// ── GET /api/v1/admin/war-room/stream ─────────────────────────────────────
// SSE endpoint — keeps connection open and streams agent events in real time.
// The War Room dashboard connects here on page load.
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable Nginx buffering on Railway
  res.flushHeaders()

  // Register this browser tab as an SSE client
  addSSEClient(res)

  // Heartbeat every 25 seconds to prevent proxy/load-balancer timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch (_) {
      clearInterval(heartbeat)
    }
  }, 25000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    removeSSEClient(res)
  })
})

// ── GET /api/v1/admin/war-room/logs ──────────────────────────────────────
// Paginated agent activity logs from MongoDB.
// Query params: agentName, level, limit (default 50), page (default 1)
router.get('/logs', async (req, res) => {
  try {
    const { agentName, level, limit = 50, page = 1 } = req.query
    const filter = {}
    if (agentName) filter.agentName = agentName
    if (level) filter.level = level

    const logs = await AgentLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await AgentLog.countDocuments(filter)

    res.json({ success: true, logs, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ── GET /api/v1/admin/war-room/pending ───────────────────────────────────
// Returns all pending actions awaiting admin approval.
router.get('/pending', async (req, res) => {
  try {
    const { agentName } = req.query
    const filter = { status: 'pending' }
    if (agentName) filter.agentName = agentName

    const actions = await PendingAction.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    res.json({ success: true, actions, total: actions.length })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ── POST /api/v1/admin/war-room/pending/:id/approve ──────────────────────
// Admin approves a pending action — triggers execution.
router.post('/pending/:id/approve', async (req, res) => {
  try {
    const action = await PendingAction.findById(req.params.id)

    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found' })
    }
    if (action.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Action is already ${action.status}`,
      })
    }

    // Mark as approved immediately so UI updates fast
    action.status = 'approved'
    action.approvedBy = req.user?.id || req.user?.userId || 'admin'
    action.approvedAt = new Date()
    await action.save()

    // Execute asynchronously — don't block the HTTP response
    executeApprovedAction(action).catch((err) =>
      console.error('[WarRoom] Async execution error:', err.message)
    )

    res.json({ success: true, message: 'Action approved and queued for execution', action })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ── POST /api/v1/admin/war-room/pending/:id/reject ───────────────────────
// Admin rejects a pending action — no execution, just marks as rejected.
router.post('/pending/:id/reject', async (req, res) => {
  try {
    const action = await PendingAction.findById(req.params.id)

    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found' })
    }
    if (action.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Action is already ${action.status}`,
      })
    }

    action.status = 'rejected'
    action.approvedBy = req.user?.id || req.user?.userId || 'admin'
    action.approvedAt = new Date()
    await action.save()

    await agentLog(
      action.agentName,
      `❌ Action rejected by admin: ${action.title}`,
      'warning',
      { actionId: action._id.toString() }
    )

    res.json({ success: true, message: 'Action rejected', action })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ── POST /api/v1/admin/war-room/agents/:agentName/run ────────────────────
// Manually trigger an agent run from the War Room UI.
router.post('/agents/:agentName/run', async (req, res) => {
  const { agentName } = req.params
  const validAgents = ['scraper', 'content', 'submission', 'uptime']

  if (!validAgents.includes(agentName)) {
    return res.status(400).json({ success: false, message: 'Invalid agent name' })
  }

  await agentLog('orchestrator', `🚀 Manual run triggered for ${agentName} agent by admin`, 'info')
  res.json({ success: true, message: `${agentName} agent run triggered` })

  // Trigger the agent asynchronously after responding
  try {
    switch (agentName) {
      case 'scraper': {
        const { runScraperAgent } = await import('../jobs/scraperAgentCron.js')
        runScraperAgent().catch((err) =>
          console.error('[WarRoom] Scraper manual run error:', err.message)
        )
        break
      }
      case 'content': {
        const { runContentAgent } = await import('../jobs/contentAgentCron.js')
        runContentAgent().catch((err) =>
          console.error('[WarRoom] Content manual run error:', err.message)
        )
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[WarRoom] Manual trigger error:', err.message)
  }
})

// ── Action Executor ────────────────────────────────────────────────────────
// Runs AFTER admin clicks Approve. Routes to correct handler by actionType.
// Called asynchronously — never blocks the HTTP response.
async function executeApprovedAction(action) {
  try {
    action.status = 'executed'
    action.executedAt = new Date()

    switch (action.actionType) {
      // Scraper Agent: activate a pending tool into the live directory
      case 'index_tool': {
        const Tool = (await import('../models/Tool.js')).default
        await Tool.findByIdAndUpdate(action.payload.toolId, {
          status: 'active',
          isActive: true,
          approvedAt: new Date(),
        })
        // Sync to Algolia
        try {
          const { syncToolToAlgolia } = await import('./toolService.js')
          await syncToolToAlgolia(action.payload.toolId)
        } catch (_) {
          // Algolia sync failure is non-fatal — tool is still live in MongoDB
        }
        await agentLog(
          'scraper',
          `✅ Tool indexed: ${action.payload.toolName}`,
          'success',
          { toolId: action.payload.toolId }
        )
        break
      }

      // Content Agent: publish a blog post draft
      case 'publish_blog_post': {
        const BlogPost = (await import('../models/BlogPost.js')).default
        await BlogPost.findByIdAndUpdate(action.payload.postId, {
          status: 'published',
          publishedAt: new Date(),
        })
        await agentLog(
          'content',
          `✅ Blog post published: "${action.payload.postTitle}"`,
          'success',
          { postId: action.payload.postId, slug: action.payload.postSlug }
        )
        break
      }

      // Submission Agent: send welcome email to a high-quality tool founder
      case 'send_welcome_email': {
        const { sendEmail } = await import('./emailService.js')
        await sendEmail(action.payload)
        await agentLog(
          'submission',
          `✅ Welcome email sent to: ${action.payload.to}`,
          'success',
          { to: action.payload.to }
        )
        break
      }

      // Uptime Agent: confirm a tool is offline and update its status
      case 'mark_tool_offline': {
        const Tool = (await import('../models/Tool.js')).default
        await Tool.findByIdAndUpdate(action.payload.toolId, {
          linkStatus: 'dead',
          $addToSet: { dataQualityFlags: 'admin_confirmed_offline' },
        })
        await agentLog(
          'uptime',
          `✅ Tool marked offline: ${action.payload.toolName || action.payload.toolId}`,
          'success',
          { toolId: action.payload.toolId }
        )
        break
      }

      // Submission Agent: reject a low-quality submission
      case 'reject_submission': {
        const Submission = (await import('../models/Submission.js')).default
        await Submission.findByIdAndUpdate(action.payload.submissionId, {
          status: 'rejected',
          rejectionReason: action.payload.reason || 'Did not meet quality standards',
          reviewedAt: new Date(),
        })
        await agentLog(
          'submission',
          `✅ Submission rejected: ${action.payload.submissionName || action.payload.submissionId}`,
          'success',
          { submissionId: action.payload.submissionId }
        )
        break
      }

      default:
        throw new Error(`Unknown actionType: ${action.actionType}`)
    }

    await action.save()
  } catch (err) {
    action.status = 'failed'
    action.executionError = err.message
    await action.save()

    await agentLog(
      'orchestrator',
      `❌ Execution failed: ${action.title} — ${err.message}`,
      'error',
      { actionId: action._id.toString(), actionType: action.actionType }
    )
  }
}

export default router
