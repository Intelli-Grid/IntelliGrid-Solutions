// Backend/src/services/groqClient.js
// Shared lightweight Groq client for War Room agents.
// Uses the same key-rotation pool as enrichmentService but as a thin singleton
// so agents don't need to instantiate Groq directly.
// Agents only need one key — they fall back gracefully if rate-limited.

import Groq from 'groq-sdk'

// Default model for agent tasks — fast, cheap, sufficient for scoring + drafting.
// Override via GROQ_AGENT_MODEL env var if you want a different model.
export const AGENT_MODEL = process.env.GROQ_AGENT_MODEL || 'llama-3.1-8b-instant'

// Collect the same pool of keys used by the enrichment service.
function buildKeyPool() {
    const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5,
        process.env.GROQ_API_KEY_6,
        process.env.GROQ_API_KEY_7,
        process.env.GROQ_API_KEY_8,
        process.env.GROQ_API_KEY_9,
        process.env.GROQ_API_KEY_10,
    ].filter(Boolean)

    if (keys.length === 0) {
        throw new Error('[groqClient] No GROQ_API_KEY found in environment — cannot start agents')
    }

    return keys
}

let _client = null

function getClient() {
    if (!_client) {
        const keys = buildKeyPool()
        // Use the first available key; agents are low-traffic so no rotation needed here.
        _client = new Groq({ apiKey: keys[0] })
    }
    return _client
}

/**
 * groqComplete — thin wrapper around chat.completions.create().
 * Handles JSON parse + retries on TPM 429 (1 retry, 65s wait).
 *
 * @param {string}   prompt     - The user-turn prompt
 * @param {object}   [opts]     - Optional overrides: model, max_tokens, temperature
 * @returns {string}             Raw content string from Groq
 */
export async function groqComplete(prompt, opts = {}) {
    const client = getClient()
    const params = {
        model: opts.model || AGENT_MODEL,
        max_tokens: opts.max_tokens || 1200,
        temperature: opts.temperature ?? 0.2,
        messages: [{ role: 'user', content: prompt }],
    }

    const MAX_RETRIES = 2
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await client.chat.completions.create(params)
            return res.choices[0].message.content.trim()
        } catch (err) {
            const status = err.status || err.statusCode || 0
            const isRateLimit = status === 429 || (err.message || '').includes('rate_limit')

            if (isRateLimit && attempt < MAX_RETRIES) {
                const waitMs = 65_000
                console.warn(`[groqClient] Rate limited — waiting ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})`)
                await new Promise(r => setTimeout(r, waitMs))
                continue
            }
            throw err
        }
    }
}

/**
 * groqJSON — calls groqComplete and parses the response as JSON.
 * Strips markdown code fences if Groq wraps the response.
 *
 * @param {string}  prompt
 * @param {object}  [opts]
 * @returns {object|null}  Parsed JSON object, or null on parse failure
 */
export async function groqJSON(prompt, opts = {}) {
    const raw = await groqComplete(prompt, { max_tokens: 1200, ...opts })
    const cleaned = raw
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch {
        console.error('[groqClient] Failed to parse Groq JSON response:', cleaned.substring(0, 200))
        return null
    }
}
