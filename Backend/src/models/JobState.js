/**
 * JobState.js
 * IntelliGrid — Persistent background job state model.
 *
 * Every crawler and enrichment run gets a document in this collection.
 * The JobManager service reads/writes this to provide:
 *   - Real-time progress in Telegram /jobstatus commands
 *   - Zombie detection when Railway restarts
 *   - Last-100 rolling log lines per job
 *   - Last-20 rolling error lines per job
 */

import mongoose from 'mongoose'

const LogEntrySchema = new mongoose.Schema(
  {
    ts:  { type: Date, default: Date.now },
    msg: { type: String, maxlength: 500 },
  },
  { _id: false }
)

const JobStateSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // e.g.  crawler_futurepedia | crawler_taaft | enrichment | importer
    },

    label: {
      type: String, // Human-readable display name
    },

    status: {
      type: String,
      enum: ['idle', 'running', 'stopping', 'stopped', 'completed', 'failed', 'interrupted'],
      default: 'idle',
      index: true,
    },

    // Timestamps
    startedAt:    { type: Date },
    completedAt:  { type: Date },
    lastHeartbeat:{ type: Date },

    // Progress counters — set by parsing PROGRESS:xxx:yyy lines from stdout
    toolsProcessed: { type: Number, default: 0 },
    totalTools:     { type: Number },

    // Arbitrary options object forwarded when the job was started (e.g. { limit: 500 })
    options: { type: mongoose.Schema.Types.Mixed },

    // Rolling logs — JobManager pushes lines here, capped at last 100
    logs:   { type: [LogEntrySchema], default: [] },

    // Rolling errors captured from stderr — capped at last 20
    errors: { type: [LogEntrySchema], default: [] },
  },
  {
    timestamps: true, // createdAt + updatedAt
    collection: 'jobstates',
  }
)

export default mongoose.model('JobState', JobStateSchema)
