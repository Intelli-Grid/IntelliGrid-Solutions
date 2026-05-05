/**
 * vendorOutreachAudit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-off audit script for the IMPL-B vendor outreach campaign.
 * Queries top 200 tools by views, segments them by contactEmail availability,
 * and exports a CSV for manual enrichment of the missing contact emails.
 *
 * Usage:
 *   node src/scripts/vendorOutreachAudit.js
 *   node src/scripts/vendorOutreachAudit.js --limit 500
 *   node src/scripts/vendorOutreachAudit.js --csv  (writes outreach_candidates.csv)
 *
 * Output files:
 *   outreach_candidates.csv  — tools needing manual email research
 *   outreach_ready.csv       — tools with contactEmail, ready to send invites
 */

import mongoose from 'mongoose'
import { createWriteStream } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const writeCSV = args.includes('--csv')
const limitArg = args.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 200

// ── Mongoose connection ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI env var not set. Run: MONGODB_URI="..." node src/scripts/vendorOutreachAudit.js')
    process.exit(1)
}

await mongoose.connect(MONGODB_URI)
console.log('✅  Connected to MongoDB\n')

// ── Inline Tool model (avoids circular import issues in script context) ───────
const toolSchema = new mongoose.Schema({
    name: String,
    slug: String,
    officialUrl: String,
    contactEmail: String,
    affiliateUrl: String,
    views: { type: Number, default: 0 },
    isFeatured: Boolean,
    isVerified: Boolean,
    pricing: String,
    status: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    claimedBy: mongoose.Schema.Types.ObjectId,
}, { collection: 'tools' })

const Tool = mongoose.models.Tool || mongoose.model('Tool', toolSchema)

// ── Query ─────────────────────────────────────────────────────────────────────
console.log(`📊  Querying top ${LIMIT} tools by views...\n`)

const tools = await Tool.find({ status: 'active' })
    .sort({ views: -1 })
    .limit(LIMIT)
    .select('name slug officialUrl contactEmail affiliateUrl views isFeatured isVerified pricing')
    .lean()

// ── Segment ───────────────────────────────────────────────────────────────────
const hasEmail = tools.filter(t => t.contactEmail && t.contactEmail.trim() !== '')
const noEmail   = tools.filter(t => !t.contactEmail || t.contactEmail.trim() === '')

// ── Report ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════')
console.log(`  VENDOR OUTREACH AUDIT — Top ${LIMIT} Tools by Views`)
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Total queried:          ${tools.length}`)
console.log(`  ✅  Has contactEmail:   ${hasEmail.length}  (ready to send invite)`)
console.log(`  🔴  Missing email:      ${noEmail.length}  (needs manual research)`)
console.log(`  📬  Outreach coverage:  ${tools.length > 0 ? ((hasEmail.length / tools.length) * 100).toFixed(1) : 0}%`)
console.log('═══════════════════════════════════════════════════════════\n')

// ── Top 20 by views — detail view ────────────────────────────────────────────
console.log('TOP 20 TOOLS BY VIEWS:')
console.log('─'.repeat(70))
const top20 = tools.slice(0, 20)
top20.forEach((t, i) => {
    const emailStatus = t.contactEmail ? `✅ ${t.contactEmail}` : '🔴 MISSING'
    console.log(`${String(i + 1).padStart(2)}.  ${t.name.padEnd(35)} views: ${String(t.views || 0).padStart(5)}  email: ${emailStatus}`)
})

// ── Tools that have contactEmail — ready to outreach ─────────────────────────
if (hasEmail.length > 0) {
    console.log(`\n✅  OUTREACH-READY TOOLS (${hasEmail.length}):`)
    console.log('─'.repeat(70))
    hasEmail.slice(0, 20).forEach((t, i) => {
        console.log(`${String(i + 1).padStart(2)}.  ${t.name.padEnd(35)} → ${t.contactEmail}`)
    })
    if (hasEmail.length > 20) console.log(`    ... and ${hasEmail.length - 20} more`)
}

// ── CSV export ────────────────────────────────────────────────────────────────
if (writeCSV) {
    const csvEscape = (val) => {
        if (val == null) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
    }

    // outreach_candidates.csv — missing email, needs research
    const candidatesPath = resolve(__dirname, '../../../outreach_candidates.csv')
    const candidateStream = createWriteStream(candidatesPath)
    candidateStream.write('name,slug,officialUrl,views,pricing,affiliateUrl\n')
    noEmail.forEach(t => {
        candidateStream.write([
            csvEscape(t.name),
            csvEscape(t.slug),
            csvEscape(t.officialUrl),
            csvEscape(t.views || 0),
            csvEscape(t.pricing),
            csvEscape(t.affiliateUrl),
        ].join(',') + '\n')
    })
    candidateStream.end()
    console.log(`\n📄  Wrote ${noEmail.length} rows → ${candidatesPath}`)

    // outreach_ready.csv — has email, ready to send
    const readyPath = resolve(__dirname, '../../../outreach_ready.csv')
    const readyStream = createWriteStream(readyPath)
    readyStream.write('name,slug,contactEmail,views,pricing\n')
    hasEmail.forEach(t => {
        readyStream.write([
            csvEscape(t.name),
            csvEscape(t.slug),
            csvEscape(t.contactEmail),
            csvEscape(t.views || 0),
            csvEscape(t.pricing),
        ].join(',') + '\n')
    })
    readyStream.end()
    console.log(`📄  Wrote ${hasEmail.length} rows → ${readyPath}`)
}

console.log('\n💡  NEXT STEPS:')
console.log('  1. Open outreach_candidates.csv and research contact emails for top 50 tools')
console.log('  2. Use admin panel (Tools > Edit) to set contactEmail on each tool')
console.log('  3. Run: POST /api/admin/vendor-outreach/batch with dryRun:true to preview')
console.log('  4. Run with dryRun:false to send batch invites\n')

await mongoose.disconnect()
process.exit(0)
