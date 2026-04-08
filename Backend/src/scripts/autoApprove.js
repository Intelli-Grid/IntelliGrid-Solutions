/**
 * autoApprove.js
 * ==============
 * Stages enriched pending tools into `auto_approved` status for owner review.
 *
 * TWO-STEP FLOW:
 *   1. runAutoStage() promotes quality-passing tools from `pending` → `auto_approved`
 *      (NOT active — they are staged but NOT live on the website)
 *   2. Owner receives a Telegram notification with /reviewbatch command
 *   3. Owner reviews via inline keyboard in Telegram (✅ Accept / ❌ Reject)
 *   4. Only after the owner taps ✅ does a tool go `active` (live)
 *
 * Approval criteria (all 3 must pass):
 *   1. status === 'pending'
 *   2. isEnriched === true  (Groq enrichment has been run)
 *   3. enrichmentScore >= QUALITY_THRESHOLD (default: 60)
 *
 * Tools not meeting criteria remain `pending` for manual review.
 * This script NEVER makes tools live directly.
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/autoApprove.js
 *   node src/scripts/autoApprove.js --threshold=70
 *   node src/scripts/autoApprove.js --dry-run
 *
 * Also exported as runAutoStage() for use by the enrichment cron scheduler.
 *
 * Pipeline position:
 *   [importAll.js] → [bulkEnrich.js] → [autoApprove.js] → [Telegram /reviewbatch] → [active]
 *
 * Run from Backend/ directory with MONGODB_URI in .env
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js' // register schema
import { sendOwnerAlert } from '../services/telegramBot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = path.join(__dirname, '../../logs')

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED FUNCTION — called by cron scheduler (DB already connected)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stages all enriched pending tools that meet the quality threshold.
 * Assumes MongoDB is already connected (used by crawlerScheduler.js cron).
 *
 * @param {object}  options
 * @param {number}  options.threshold  - Minimum enrichmentScore to stage (default: 60)
 * @param {boolean} options.dryRun     - If true, reports only — no DB writes
 * @param {boolean} options.silent     - If true, skips Telegram alert (for testing)
 * @returns {Promise<{staged: number, alreadyStaged: number, remaining: number}>}
 */
export async function runAutoStage({ threshold = 60, dryRun = false, silent = false } = {}) {
    console.log(`[AutoStage] Starting — threshold: score >= ${threshold}, dryRun: ${dryRun}`)

    const eligibleToStage = await Tool.countDocuments({
        status: 'pending',
        isEnriched: true,
        enrichmentScore: { $gte: threshold },
    })

    const alreadyStaged = await Tool.countDocuments({ status: 'auto_approved' })

    console.log(`[AutoStage] Eligible: ${eligibleToStage}, Already staged: ${alreadyStaged}`)

    if (eligibleToStage === 0) {
        console.log('[AutoStage] Nothing to stage — all pending tools are unenriched or below threshold.')
        return { staged: 0, alreadyStaged, remaining: await Tool.countDocuments({ status: 'pending' }) }
    }

    if (dryRun) {
        console.log(`[AutoStage] DRY RUN — would stage ${eligibleToStage} tools. No changes made.`)
        return { staged: 0, alreadyStaged, remaining: await Tool.countDocuments({ status: 'pending' }) }
    }

    // Move pending → auto_approved (NOT live)
    const result = await Tool.updateMany(
        {
            status: 'pending',
            isEnriched: true,
            enrichmentScore: { $gte: threshold },
        },
        {
            $set: {
                status: 'auto_approved',  // Staged — awaiting owner review in Telegram
                isActive: false,          // NOT live until owner approves
                stagedAt: new Date(),
                approvedBy: 'auto-approve-script',
            }
        }
    )

    const pendingAfter = await Tool.countDocuments({ status: 'pending' })
    const stagedAfter = await Tool.countDocuments({ status: 'auto_approved' })

    console.log(`[AutoStage] ✅ Staged ${result.modifiedCount} tools as auto_approved. Remaining pending: ${pendingAfter}`)

    // Save JSON report log
    try {
        if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
        const reportPath = path.join(LOGS_DIR, `autoApprove-stage-report-${Date.now()}.json`)
        fs.writeFileSync(reportPath, JSON.stringify({
            runAt: new Date().toISOString(),
            qualityThreshold: threshold,
            staged: result.modifiedCount,
            safety: {
                pendingAfter,
                totalStaged: stagedAfter,
            },
            nextStep: 'Owner must run /reviewbatch in Telegram to review and publish tools',
        }, null, 2))
    } catch (err) {
        console.warn('[AutoStage] Could not save report:', err.message)
    }

    // Notify owner via Telegram
    if (!silent && result.modifiedCount > 0) {
        try {
            await sendOwnerAlert(
                `🔍 *${result.modifiedCount} Tools Ready for Your Review*\n\n` +
                `Quality threshold: score ≥ ${threshold}\n` +
                `Status: staged as \`auto_approved\` (NOT live yet)\n\n` +
                `📱 *Type /reviewbatch to review them one by one*\n` +
                `You'll get Accept ✅ / Reject ❌ buttons for each tool.\n\n` +
                `💡 Tip: /approvebatch publishes ALL staged tools at once if you trust the batch.`
            )
        } catch (err) {
            console.warn('[AutoStage] Telegram alert failed:', err.message)
        }
    }

    return { staged: result.modifiedCount, alreadyStaged: stagedAfter, remaining: pendingAfter }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI ENTRY POINT — only runs when invoked directly as a script
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    import('dotenv/config')

    if (!process.env.MONGODB_URI) {
        console.error('\n❌ MONGODB_URI not set in .env')
        process.exit(1)
    }

    const DRY_RUN = process.argv.includes('--dry-run')
    const thresholdArg = process.argv.find(a => a.startsWith('--threshold='))
    const QUALITY_THRESHOLD = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 60

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('\n✅ Connected to MongoDB')

    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║        IntelliGrid · Auto-Stage Engine (Step 1/2)    ║')
    if (DRY_RUN) console.log('║                  ⚠️  DRY RUN MODE                    ║')
    console.log('╚══════════════════════════════════════════════════════╝')
    console.log(`\n  Quality Threshold:    enrichmentScore >= ${QUALITY_THRESHOLD}`)
    console.log('  Staging state:        pending → auto_approved (NOT live yet)')
    console.log('  Owner must review:    /reviewbatch in Telegram to publish\n')

    // Print current state before running
    const activeCountBefore = await Tool.countDocuments({ status: 'active', isActive: true })
    const pendingTotal = await Tool.countDocuments({ status: 'pending' })
    const eligibleToStage = await Tool.countDocuments({
        status: 'pending',
        isEnriched: true,
        enrichmentScore: { $gte: QUALITY_THRESHOLD },
    })
    const alreadyStaged = await Tool.countDocuments({ status: 'auto_approved' })
    const unenrichedPending = await Tool.countDocuments({ status: 'pending', isEnriched: { $ne: true } })
    const lowScorePending = await Tool.countDocuments({
        status: 'pending',
        isEnriched: true,
        enrichmentScore: { $lt: QUALITY_THRESHOLD },
    })

    console.log(`📊 Current State:`)
    console.log(`   Active tools (live):         ${activeCountBefore}`)
    console.log(`   Currently staged (awaiting): ${alreadyStaged}`)
    console.log(`   Total pending:               ${pendingTotal}`)
    console.log(`   ├─ Ready to stage:           ${eligibleToStage}  ← Will move to auto_approved`)
    console.log(`   ├─ Low score (< ${QUALITY_THRESHOLD}):          ${lowScorePending}  ← Stays pending`)
    console.log(`   └─ Not yet enriched:         ${unenrichedPending}  ← Stays pending (run bulkEnrich.js first)`)

    const stats = await runAutoStage({ threshold: QUALITY_THRESHOLD, dryRun: DRY_RUN })

    console.log('\n' + '═'.repeat(56))
    console.log('✅ AUTO-STAGE COMPLETE (Step 1 of 2)')
    console.log(`   Tools staged as auto_approved:  ${stats.staged}`)
    console.log(`   Active tools (unchanged):        ${activeCountBefore}  ← No new live tools yet`)
    console.log(`   Total awaiting review:           ${stats.alreadyStaged}`)
    console.log(`   Remaining pending:               ${stats.remaining}`)
    console.log('\n💡 Step 2: Open Telegram → /reviewbatch')
    console.log('   Each tool shows ✅ Accept / ❌ Reject buttons')
    console.log('   OR type /approvebatch to bulk-publish all staged tools')
    console.log('═'.repeat(56) + '\n')

    await mongoose.disconnect()
    process.exit(0)
}

// Only run main() when this file is the entry point
const isMain = process.argv[1]?.endsWith('autoApprove.js')
if (isMain) {
    main().catch(err => {
        console.error('\nFatal error:', err)
        process.exit(1)
    })
}
