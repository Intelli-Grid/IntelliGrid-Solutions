/**
 * productHuntScraper.js — Batch 4A
 *
 * Fetches newly launched AI tools from Product Hunt's GraphQL API (v2).
 * Requires: PH_TOKEN env var (Developer Token from producthunt.com/v2/oauth/applications)
 *
 * Run modes:
 *   - Called by discoveryQueue.js on a daily cron schedule
 *   - Can be run manually: node scripts/runDiscovery.js --source producthunt
 *
 * Output: Queues each discovered tool URL into the BullMQ discovery queue
 *         for async validation + metadata extraction. Never writes directly to DB.
 */

import axios from 'axios'

const PH_API = 'https://api.producthunt.com/v2/api/graphql'

/**
 * Returns ISO date string for N days ago.
 */
function getDateDaysAgo(days) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString()
}

/**
 * Fetches AI tools posted on Product Hunt in the last `daysBack` days.
 *
 * @param {number} daysBack - How many days back to look (default: 1)
 * @returns {Array} Raw Product Hunt post nodes
 */
export async function fetchProductHuntTools(daysBack = 1) {
    if (!process.env.PH_TOKEN) {
        console.warn('[ProductHunt] PH_TOKEN not set — skipping scrape')
        return []
    }

    const query = `
        query {
            posts(
                order: NEWEST,
                topic: "artificial-intelligence",
                postedAfter: "${getDateDaysAgo(daysBack)}"
                first: 50
            ) {
                edges {
                    node {
                        name
                        tagline
                        description
                        url
                        website
                        votesCount
                        createdAt
                        topics {
                            edges {
                                node { name slug }
                            }
                        }
                        thumbnail { url }
                    }
                }
            }
        }
    `

    try {
        const res = await axios.post(
            PH_API,
            { query },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 15000,
            }
        )

        const edges = res.data?.data?.posts?.edges || []
        console.log(`[ProductHunt] Fetched ${edges.length} AI tools from the last ${daysBack} day(s)`)
        return edges.map(e => e.node)

    } catch (err) {
        console.error('[ProductHunt] API error:', err.response?.data || err.message)
        return []
    }
}

/**
 * Maps a Product Hunt post node to the format expected by the discovery queue.
 */
export function mapPHTool(post) {
    return {
        url: post.website || post.url,
        name: post.name,
        tagline: post.tagline,
        description: post.description,
        logoUrl: post.thumbnail?.url || null,
        source: 'producthunt',
        sourceUrl: post.url,          // PH listing URL
        launchedAt: post.createdAt,
        upvotes: post.votesCount || 0,
    }
}
