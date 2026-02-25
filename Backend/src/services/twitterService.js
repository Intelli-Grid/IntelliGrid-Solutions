/**
 * twitterService.js — Batch 6
 *
 * Posts tweets when a tool is approved by an admin.
 * Uses Twitter API v2 with OAuth 1.0a (user context — required for posting).
 *
 * Required env vars:
 *   TWITTER_API_KEY          — Consumer Key
 *   TWITTER_API_SECRET       — Consumer Secret
 *   TWITTER_ACCESS_TOKEN     — Access Token (your account)
 *   TWITTER_ACCESS_SECRET    — Access Token Secret
 *
 * All four can be obtained from developer.twitter.com → Your App → Keys & Tokens.
 * The app must have "Read and Write" permissions.
 *
 * Gracefully no-ops if any credential is missing.
 */

import axios from 'axios'
import crypto from 'crypto'

// ── OAuth 1.0a signing ────────────────────────────────────────────────────────
function percentEncode(str) {
    return encodeURIComponent(String(str))
        .replace(/!/g, '%21').replace(/'/g, '%27')
        .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A')
}

function buildOAuthHeader(method, url, params, credentials) {
    const oauthParams = {
        oauth_consumer_key: credentials.apiKey,
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: credentials.accessToken,
        oauth_version: '1.0',
    }

    // Merge all params for signature base
    const allParams = { ...params, ...oauthParams }
    const sortedKeys = Object.keys(allParams).sort()
    const paramStr = sortedKeys
        .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
        .join('&')

    const signatureBase = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(paramStr),
    ].join('&')

    const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    oauthParams.oauth_signature = signature

    const headerValue = 'OAuth ' + Object.keys(oauthParams)
        .sort()
        .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
        .join(', ')

    return headerValue
}

// ── Tweet content generator ───────────────────────────────────────────────────
function buildTweetText(tool) {
    const categoryName = typeof tool.category === 'object' ? tool.category?.name : null
    const price = tool.startingPrice
        || (tool.pricing === 'Free' ? '🆓 Free'
            : tool.pricing === 'Freemium' ? '🆓 Free tier available'
                : tool.pricing === 'Paid' ? '💳 Paid'
                    : '')

    const url = `https://www.intelligrid.online/tools/${tool.slug}`

    // Build description snippet — max 100 chars
    const desc = (tool.shortDescription || tool.metaDescription || '').slice(0, 100)
    const descPart = desc ? `\n\n${desc}` : ''

    // Hashtag from category
    const hashtag = categoryName
        ? `#${categoryName.replace(/\s+/g, '')}` : '#AITool'

    const tweet = `🚀 New AI Tool: ${tool.name}${descPart}\n\n${price ? price + '\n' : ''}${url}\n\n#AI #IntelliGrid ${hashtag}`

    // Twitter limit is 280 chars — truncate gracefully
    if (tweet.length > 280) {
        const truncatedDesc = desc.slice(0, Math.max(0, 280 - (tweet.length - desc.length) - 3)) + '...'
        return tweet.replace(desc, truncatedDesc)
    }

    return tweet
}

// ── Core: post a tweet ────────────────────────────────────────────────────────
async function postTweet(text) {
    const credentials = {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_SECRET,
    }

    if (Object.values(credentials).some(v => !v)) {
        console.warn('[Twitter] One or more credentials missing — skipping tweet')
        return null
    }

    const url = 'https://api.twitter.com/2/tweets'
    const body = { text }

    const authHeader = buildOAuthHeader('POST', url, {}, credentials)

    try {
        const res = await axios.post(url, body, {
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        })

        const tweetId = res.data?.data?.id
        console.log(`[Twitter] ✅ Tweet posted: https://twitter.com/i/web/status/${tweetId}`)
        return tweetId
    } catch (err) {
        const errData = err.response?.data
        console.error('[Twitter] ❌ Failed to post tweet:', errData || err.message)
        return null
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called from the admin approve route when a tool is approved.
 * Fire-and-forget — never throws, never blocks the approval response.
 *
 * @param {Object} tool - The approved Tool document (populated with category)
 */
export async function tweetNewTool(tool) {
    if (!tool?.slug) return
    try {
        const text = buildTweetText(tool)
        await postTweet(text)
    } catch (err) {
        // Never let a Twitter error crash the approval flow
        console.error('[Twitter] Unhandled error in tweetNewTool:', err.message)
    }
}

/**
 * Post a custom tweet (e.g., weekly digest, milestone).
 * @param {string} text
 */
export async function postCustomTweet(text) {
    return postTweet(text)
}
