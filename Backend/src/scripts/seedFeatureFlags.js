/**
 * Script: Seed / sync all IntelliGrid feature flags to the database.
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * It INSERTS new flags that don't exist, and SKIPS existing ones
 * (preserving their current enabled/disabled state in production).
 *
 * Usage:
 *   node src/scripts/seedFeatureFlags.js
 *
 * Run this whenever a new feature flag is added to the plan.
 * ALWAYS run on staging before production.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set. Check your .env file.')
    process.exit(1)
}

// All feature flags in the IntelliGrid system — in deployment order.
// enabled: false by default — flip via Admin → Feature Flags tab.
const FLAGS = [
    {
        key: 'REVERSE_TRIAL',
        description: '14-day full Pro trial for every new signup (no card required). Cron-managed expiry.',
        enabled: false,
    },
    {
        key: 'NEW_PRICING_TIERS',
        description: 'PricingV2 — 3-tier layout with annual toggle, feature table, and FAQ.',
        enabled: false,
    },
    {
        key: 'AI_STACK_ADVISOR',
        description: 'Groq-powered personalised AI tool recommendations flow.',
        enabled: false,
    },
    {
        key: 'CONTEXTUAL_NUDGES',
        description: 'Upgrade nudge panels triggered by 7 limit/feature events.',
        enabled: false,
    },
    {
        key: 'VENDOR_LISTINGS',
        description: 'B2B vendor featured listing programme — paid placement in search results.',
        enabled: false,
    },
    {
        key: 'NEWSLETTER_SIGNUP',
        description: 'Newsletter opt-in capture forms and weekly digest delivery via Brevo.',
        enabled: false,
    },
    {
        key: 'ONBOARDING_EMAILS',
        description: '14-day lifecycle email sequence fired on signup via Brevo.',
        enabled: false,
    },
    {
        key: 'AFFILIATE_TRACKING',
        description: 'Route all tool visits through /api/v1/tools/slug/:slug/visit for affiliate click tracking.',
        enabled: false,
    },
    {
        key: 'PROGRAMMATIC_SEO',
        description: 'AI-generated FAQ + use case content on tool detail pages.',
        enabled: false,
    },
    {
        key: 'ANNUAL_PRICING_V2',
        description: 'Corrected annual plan pricing ($79.99 Pro / $199.99 Team) with 4-months-free framing.',
        enabled: false,
    },
    {
        key: 'CANCELLATION_RESCUE',
        description: 'Exit-intent interstitial on cancel flow offering a discount before churn.',
        enabled: false,
    },
]

const featureFlagSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: false },
        enabledForRoles: { type: [String], default: [] },
        description: String,
    },
    { timestamps: true }
)

async function main() {
    await mongoose.connect(MONGODB_URI)
    console.log('✅  Connected to MongoDB')

    const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema)

    let inserted = 0
    let skipped = 0

    for (const flag of FLAGS) {
        try {
            const existing = await FeatureFlag.findOne({ key: flag.key })
            if (existing) {
                console.log(`   ⏭  SKIP  ${flag.key}  (already exists, enabled=${existing.enabled})`)
                skipped++
            } else {
                await FeatureFlag.create(flag)
                console.log(`   ✅  INSERT  ${flag.key}`)
                inserted++
            }
        } catch (err) {
            console.error(`   ❌  ERROR  ${flag.key}:`, err.message)
        }
    }

    console.log(`\n📊  Done — ${inserted} inserted, ${skipped} already existed.`)
    await mongoose.disconnect()
}

main().catch((err) => {
    console.error('Fatal:', err)
    process.exit(1)
})
