/**
 * fixLogoUrls.js
 * ─────────────────────────────────────────────────────────────────
 * The Futurepedia scraper stored logos as OG image API URLs:
 *   https://www.futurepedia.io/api/og?title=...&image=https%3A%2F%2Fcdn.futurepedia.io%2F...
 *
 * This script extracts the real image URL from the `image=` parameter
 * and updates both `logo` and `metadata.logo` in the DB.
 *
 * Safe to re-run. Run: node scripts/fixLogoUrls.js
 * ─────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Extracts the actual CDN image from a Futurepedia OG wrapper URL.
 * Input:  https://www.futurepedia.io/api/og?title=Foo&image=https%3A%2F%2Fcdn.futurepedia.io%2Fxxx.png
 * Output: https://cdn.futurepedia.io/xxx.png
 *
 * If the URL is already a clean CDN/direct image, returns it unchanged.
 */
function extractCleanLogoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return ''

    // Already a clean CDN URL — not the OG wrapper
    if (rawUrl.includes('cdn.futurepedia.io') && !rawUrl.includes('/api/og')) {
        return rawUrl
    }

    // Strip Futurepedia OG wrapper and pull out the `image` param
    if (rawUrl.includes('futurepedia.io/api/og')) {
        try {
            // The URL might use encoded ampersands (&amp;) — normalize first
            const normalized = rawUrl.replace(/&amp;/g, '&')
            const url = new URL(normalized)
            const imageParam = url.searchParams.get('image')
            if (imageParam) {
                // imageParam is already decoded by URL parser — return as-is
                return imageParam
            }
        } catch {
            // Manual extraction as fallback
            const match = rawUrl.match(/[?&]image=([^&]+)/)
            if (match) {
                return decodeURIComponent(match[1])
            }
        }
        return '' // OG url but no image param found
    }

    // Any other direct image URL — keep it
    return rawUrl
}

async function main() {
    console.log('🔧 IntelliGrid — Fix Logo URLs')
    console.log('═══════════════════════════════════════════════════')
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '📥 LIVE (updating DB)'}\n`)

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB Connected\n')

    const col = mongoose.connection.collection('tools')

    // Find all tools that have the OG wrapper URL stored
    const ogTools = await col.find({
        $or: [
            { logo: { $regex: 'futurepedia\\.io/api/og', $options: 'i' } },
            { 'metadata.logo': { $regex: 'futurepedia\\.io/api/og', $options: 'i' } },
        ]
    }).toArray()

    console.log(`📊 Tools with OG wrapper URLs: ${ogTools.length}`)

    let fixed = 0, empty = 0, skipped = 0
    const sampleFixed = []
    const sampleEmpty = []

    for (const tool of ogTools) {
        const rawLogo = tool.logo || tool.metadata?.logo || ''
        const cleanLogo = extractCleanLogoUrl(rawLogo)

        if (cleanLogo && cleanLogo !== rawLogo) {
            if (sampleFixed.length < 3) {
                sampleFixed.push({ name: tool.name, raw: rawLogo, clean: cleanLogo })
            }

            if (!DRY_RUN) {
                await col.updateOne(
                    { _id: tool._id },
                    {
                        $set: {
                            logo: cleanLogo,
                            'metadata.logo': cleanLogo,
                            updatedAt: new Date(),
                        }
                    }
                )
            }
            fixed++
        } else if (!cleanLogo) {
            if (sampleEmpty.length < 3) {
                sampleEmpty.push({ name: tool.name, raw: rawLogo })
            }
            empty++
        } else {
            skipped++ // Already clean
        }
    }

    // Show samples
    console.log('\n📝 Sample fixed URLs (before → after):')
    sampleFixed.forEach(({ name, raw, clean }) => {
        console.log(`\n  ✅ ${name}`)
        console.log(`     BEFORE: ${raw.substring(0, 80)}...`)
        console.log(`     AFTER:  ${clean}`)
    })

    if (sampleEmpty.length > 0) {
        console.log('\n⚠️  Sample where image param was missing (set to empty):')
        sampleEmpty.forEach(({ name, raw }) => {
            console.log(`  • ${name}: ${raw.substring(0, 80)}`)
        })
    }

    console.log('\n✨ Fix Complete!')
    console.log('═══════════════════════════════════════════════════')
    console.log(`   ✅ Fixed:   ${fixed}`)
    console.log(`   ⚠️  Emptied: ${empty} (OG url had no image param)`)
    console.log(`   ⏭️  Skipped: ${skipped} (already clean)`)

    if (!DRY_RUN) {
        // Final count of tools with real logos
        const withLogo = await col.countDocuments({
            status: 'active',
            logo: { $type: 'string', $nin: ['', null] },
            logo: { $not: { $regex: 'placeholder' } }
        })
        console.log(`\n🗄️  Tools with clean logos now: ${withLogo}`)
        console.log('\n🎉 Next: run `node scripts/syncAlgolia.js` to push logo URLs to search index.')
    } else {
        console.log('\n✋ DRY RUN complete. Run without --dry-run to apply.')
    }

    process.exit(0)
}

main().catch(err => {
    console.error('\n❌ Fatal:', err.message)
    process.exit(1)
})
