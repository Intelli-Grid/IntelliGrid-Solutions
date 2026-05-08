// Backend/src/models/AgentLog.js
// War Room — Agent activity log. Immutable record of what each agent did.
// Auto-deletes entries older than 30 days via TTL index.

import mongoose from 'mongoose'

const agentLogSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
      enum: ['scraper', 'content', 'submission', 'uptime', 'orchestrator'],
      index: true,
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'success', 'error'],
      default: 'info',
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
)

// Reverse-chronological log feed for War Room dashboard
agentLogSchema.index({ createdAt: -1 })

// Per-agent log view (filter by agent + time)
agentLogSchema.index({ agentName: 1, createdAt: -1 })

// Auto-delete logs older than 30 days — prevents unbounded collection growth
agentLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
)

export default mongoose.model('AgentLog', agentLogSchema)
