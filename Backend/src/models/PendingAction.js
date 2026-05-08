// Backend/src/models/PendingAction.js
// War Room — Human-in-the-loop approval queue.
// Every agent action that needs admin approval is stored here.
// Unreviewed actions auto-expire after 7 days via TTL index.

import mongoose from 'mongoose'

const pendingActionSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
      enum: ['scraper', 'content', 'submission', 'uptime'],
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      // Possible values:
      // 'index_tool'        — approve a scraped tool into the live directory
      // 'publish_blog_post' — publish a content-agent drafted blog post
      // 'send_welcome_email'— send founder welcome email for high-quality submission
      // 'reject_submission' — confirm rejection of a low-quality submission
      // 'mark_tool_offline' — confirm a tool is offline and flag it in the DB
    },
    title: {
      type: String,
      required: true, // Short human-readable summary shown in War Room
    },
    description: {
      type: String,
      default: '', // Full context for the approver
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // The actual data to act on when approved
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'executed', 'failed'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: String,
      default: null, // Admin's Clerk userId
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    executionError: {
      type: String,
      default: null,
    },
    // Auto-expire unreviewed pending actions after 7 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
)

// TTL index — MongoDB removes documents when expiresAt is reached
pendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Efficient query: all pending actions sorted newest first (War Room queue)
pendingActionSchema.index({ status: 1, createdAt: -1 })

// Per-agent pending actions
pendingActionSchema.index({ agentName: 1, status: 1 })

export default mongoose.model('PendingAction', pendingActionSchema)
