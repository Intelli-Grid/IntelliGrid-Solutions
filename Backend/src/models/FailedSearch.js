// Backend/src/models/FailedSearch.js
// War Room — Tracks search queries that returned 0 results.
// The Content Agent reads this collection nightly to draft SEO blog posts
// targeting the most common failed search terms.

import mongoose from 'mongoose'

const failedSearchSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Set to true once the Content Agent has drafted a blog post for this term
    blogPostDrafted: {
      type: Boolean,
      default: false,
    },
    // Reference to the drafted blog post (set when blogPostDrafted = true)
    blogPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost',
      default: null,
    },
    lastSearchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Most-searched failed terms first (Content Agent query)
failedSearchSchema.index({ count: -1 })

// Content Agent query: un-drafted terms sorted by count
failedSearchSchema.index({ blogPostDrafted: 1, count: -1 })

// Term lookup for upsert dedup
failedSearchSchema.index({ term: 1 }, { unique: true })

export default mongoose.model('FailedSearch', failedSearchSchema)
