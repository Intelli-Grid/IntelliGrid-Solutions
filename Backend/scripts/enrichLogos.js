/**
 * enrichLogos.js
 * ─────────────────────────────────────────────────────────────────
 * Fetches logos for existing tools that don't have one yet.
 * For each tool without a logo, tries to find it on Futurepedia
 * by looking up the tool's slug directly.
 *
 * Run:      node scripts/enrichLogos.js
 * Dry run:  node scripts/enrichLogos.js --dry-run
 * Limit:    node scripts/enrichLogos.js --limit=200
 * ─────────────────────────────────────────────────────────────────
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : 500

const http = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const politeDelay = () => sleep(1200 + Math.random() * 800)

// Convert tool name → Futurepedia slug candidates
function nameToFpSlugs(name, existingSlug) {
    const base = (existingSlug || name)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')

    const candidates = [base]

    // Also try with "ai" stripped from start/end
    if (base.startsWith('ai-')) candidates.push(base.slice(3))
    if (base.endsWith('-ai')) candidates.push(base.slice(0, -3))
    if (!base.includes('ai')) candidates.push(`${base}-ai`)

    return [...new Set(candidates)]
}

// Fetch logo from Google Favicon API based on officialUrl
function fetchLogoFromGoogle(toolName, officialUrl) {
    if (!officialUrl) return null;
    try {
        const urlObj = new URL(officialUrl);
        const domain = urlObj.hostname;
        return {
            logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            description: '',
            name: toolName
        };
    } catch {
        return null; // Invalid URL
    }
}

async function main() {
    console.log('🖼️  IntelliGrid — Logo Enrichment Script')
    console.log('═══════════════════════════════════════════════════')
    console.log(`Mode:   ${DRY_RUN ? '🔍 DRY RUN' : '📥 IMPORT'}`)
    console.log(`Limit:  ${LIMIT} tools\n`)

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB Connected\n')

    const col = mongoose.connection.collection('tools')

    // Find tools with no logo (both top-level and metadata)
    const noLogoTools = await col.find({
        status: 'active',
        $and: [
            { $or: [{ logo: '' }, { logo: { $exists: false } }] },
            { $or: [{ 'metadata.logo': '' }, { 'metadata.logo': { $exists: false } }] }
        ]
    }).limit(LIMIT).toArray()

    console.log(`📊 Found ${noLogoTools.length} tools without logos (limit: ${LIMIT})`)
    console.log(`📊 Total without logos: ${await col.countDocuments({
        status: 'active',
        $and: [
            { $or: [{ logo: '' }, { logo: { $exists: false } }] },
        ]
    })}\n`)

    let enriched = 0, notFound = 0, skipped = 0

    for (let i = 0; i < noLogoTools.length; i++) {
        const tool = noLogoTools[i]
        const slugCandidates = nameToFpSlugs(tool.name, tool.slug)
        let found = fetchLogoFromGoogle(tool.name, tool.officialUrl)

        if (found?.logo) {
            if (!DRY_RUN) {
                await col.updateOne(
                    { _id: tool._id },
                    {
                        $set: {
                            logo: found.logo,
                            'metadata.logo': found.logo,
                            updatedAt: new Date(),
                            // Also enrich description if tool has none
                            ...(found.description && (!tool.shortDescription || tool.shortDescription.length < 20)
                                ? { shortDescription: found.description.substring(0, 490) }
                                : {}
                            )
                        }
                    }
                )
            }
            enriched++
            if (i < 5 || enriched % 20 === 0) {
                console.log(`   ✅ [${i + 1}/${noLogoTools.length}] ${tool.name}`)
                console.log(`      Logo: ${found.logo.substring(0, 80)}...`)
            }
        } else {
            notFound++
            if (notFound <= 3) {
                console.log(`   ⚠️  [${i + 1}/${noLogoTools.length}] Not found: ${tool.name} (slug: ${slugCandidates[0]})`)
            }
        }

        // Progress update every 25 tools
        if ((i + 1) % 25 === 0) {
            console.log(`\n   ⏳ Progress: ${i + 1}/${noLogoTools.length} — enriched: ${enriched}, not found: ${notFound}\n`)
        }

        await politeDelay()
    }

    console.log('\n✨ Enrichment Complete!')
    console.log('═══════════════════════════════════════════════════')
    console.log(`   Processed:  ${noLogoTools.length}`)
    console.log(`   ✅ Enriched:   ${enriched} (${Math.round(enriched / noLogoTools.length * 100)}%)`)
    console.log(`   ❌ Not found:  ${notFound}`)

    if (!DRY_RUN) {
        const nowWithLogo = await col.countDocuments({ status: 'active', logo: { $exists: true, $type: 'string', $nin: ['', null] } })
        const total = await col.countDocuments({ status: 'active' })
        console.log(`\n🗄️  Total tools with logos: ${nowWithLogo}/${total} (${Math.round(nowWithLogo / total * 100)}%)`)
        console.log('\n🎉 Next: run `node scripts/syncAlgolia.js` to update search index with logos.')
    }

    process.exit(0)
}

main().catch(err => {
    console.error('\n❌ Fatal:', err.message)
    process.exit(1)
})
