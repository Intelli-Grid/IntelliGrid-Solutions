/**
 * runCrawlerTaaft.js
 * ==================
 * Node.js wrapper connecting to the Python anti-detect extraction engine.
 *
 * Emits JobManager progress events and captures stdout JSON.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { normalizeToSchema } from '../jobs/crawlers/normalizer.js'
import { deduplicateAndUpsert } from '../jobs/crawlers/deduplicator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runPythonCrawler(scriptName) {
    return new Promise((resolve, reject) => {
        const pyPath = path.join(__dirname, 'python', scriptName)
        // Railway has 'python3', Windows has 'python'
        const cmd = process.platform === 'win32' ? 'python' : 'python3'
        
        console.log(`[JS Wrapper] Spawning Python scraper: ${scriptName}`)
        const proc = spawn(cmd, [pyPath], {
            env: { ...process.env, PYTHONUTF8: '1' }
        })

        let outputData = ''
        let errorData = ''

        proc.stdout.on('data', (data) => {
            outputData += data.toString()
        })

        proc.stderr.on('data', (data) => {
            const str = data.toString()
            errorData += str
            // Print straight to JobManager logs if it's not a block of JSON
            console.warn(`[Python STDERR] ${str.trim()}`)
        })

        proc.on('close', (code) => {
            if (code !== 0) {
                console.error(`[JS Wrapper] Python script exited with code ${code}`)
                // Still try to parse whatever we got
            }
            try {
                // Find the JSON block. It might be surrounded by print statements
                const jsonStart = outputData.indexOf('[')
                const jsonEnd = outputData.lastIndexOf(']')
                if (jsonStart === -1 || jsonEnd === -1) {
                    console.log('[JS Wrapper] No JSON array found in Python output.')
                    return resolve([])
                }
                const cleanJson = outputData.substring(jsonStart, jsonEnd + 1)
                const tools = JSON.parse(cleanJson)
                resolve(tools)
            } catch (err) {
                console.error('[JS Wrapper] Failed to parse Python JSON output:', err.message)
                resolve([])
            }
        })
    })
}

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not set')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ [TAAFT] Connected to MongoDB')

    // 1. Run Python Extractor (curl_cffi)
    console.log('PROGRESS:processed:1:total:10') // Mock progress for JobManager
    const rawTools = await runPythonCrawler('fetch_taaft.py')
    
    if (rawTools.length === 0) {
        console.log('⚠️  [TAAFT] No tools extracted — Cloudflare block or structure change.')
        await mongoose.disconnect()
        process.exit(0)
    }

    console.log(`PROGRESS:processed:5:total:10`)

    // 2. Normalize and Upsert
    const normalized = rawTools.map(normalizeToSchema).filter(Boolean)
    console.log(`[TAAFT] Normalised: ${normalized.length} valid tools from ${rawTools.length} raw`)

    const stats = await deduplicateAndUpsert(normalized)
    console.log(`[TAAFT] DB result — inserted: ${stats.inserted}, updated: ${stats.updated}, skipped: ${stats.skipped}`)

    console.log(`PROGRESS:processed:10:total:10`)
    await mongoose.disconnect()
    console.log('✅ [TAAFT] Done.')
    process.exit(0)
}

main().catch(err => {
    console.error('[TAAFT] Fatal error:', err.message)
    process.exit(1)
})
