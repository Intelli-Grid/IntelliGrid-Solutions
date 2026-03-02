/**
 * Migration: Add enrichment fields to all tools
 *
 * SAFE: Idempotent — only updates docs that don't have enrichmentScore yet.
 *
 * New fields:
 *   isNew              — bool, set by enrichmentCron for tools < 30 days old
 *   futurepediaUrl     — source URL on futurepedia.io
 *   taaftUrl           — source URL on theresanaiforthat.com
 *   taaftSavesCount    — saves count from TAAFT (Browse AI import)
 *   futurepediaRating  — rating from Futurepedia (Browse AI import)
 *   pros               — array of strings (enrichment import)
 *   cons               — array of strings (enrichment import)
 *   taskTags           — array of use-case tags from TAAFT
 *   lastEnriched       — date of last successful enrichment
 *   enrichmentScore    — 0-100, calculated from field completeness
 *   dataSource         — 'manual' | 'import' | 'groq' | 'browse_ai'
 *   needsEnrichment    — bool, set by enrichmentCron when data is stale
 *
 * RUN ON STAGING FIRST. Take a MongoDB Atlas snapshot before running on PRODUCTION.
 */

export const up = async (db) => {
    const result = await db.collection('tools').updateMany(
        { enrichmentScore: { $exists: false } },
        {
            $set: {
                isNew: false,
                futurepediaUrl: null,
                taaftUrl: null,
                taaftSavesCount: 0,
                futurepediaRating: null,
                pros: [],
                cons: [],
                taskTags: [],
                lastEnriched: null,
                enrichmentScore: 0,
                dataSource: 'manual',
                needsEnrichment: true,
            },
        }
    )
    console.log(`[Migration] Enrichment fields added to ${result.modifiedCount} tools`)
}

export const down = async (db) => {
    const result = await db.collection('tools').updateMany(
        {},
        {
            $unset: {
                isNew: '',
                futurepediaUrl: '',
                taaftUrl: '',
                taaftSavesCount: '',
                futurepediaRating: '',
                pros: '',
                cons: '',
                taskTags: '',
                lastEnriched: '',
                enrichmentScore: '',
                dataSource: '',
                needsEnrichment: '',
            },
        }
    )
    console.log(`[Migration] Enrichment fields removed from ${result.modifiedCount} tools`)
}
