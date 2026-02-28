/**
 * Migration: Add planVersion field to all users
 *
 * SAFE: Idempotent — uses $exists check to only update documents that don't
 * already have the planVersion field. Running twice has no effect.
 *
 * Purpose: Track which pricing model version a user was enrolled on.
 *   planVersion: 2 = new 3-tier pricing (Explorer / Professional / Team)
 *
 * Run on STAGING first. Only run on PRODUCTION after confirming on staging.
 */

export const up = async (db) => {
    // Only update documents that don't have the field yet (idempotent)
    const result = await db.collection('users').updateMany(
        { planVersion: { $exists: false } },
        { $set: { planVersion: 2 } }
    )
    console.log(`[Migration] planVersion added to ${result.modifiedCount} users`)
}

export const down = async (db) => {
    const result = await db.collection('users').updateMany(
        {},
        { $unset: { planVersion: '' } }
    )
    console.log(`[Migration] planVersion removed from ${result.modifiedCount} users`)
}
