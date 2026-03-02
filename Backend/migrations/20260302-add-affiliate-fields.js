/**
 * Migration: Add affiliate management fields to all tools
 *
 * SAFE: Idempotent — uses $exists to only update docs without the field.
 *
 * New fields:
 *   affiliateUrl          — tracked redirect URL (overrides officialUrl when AFFILIATE_TRACKING is on)
 *   affiliateNetwork      — 'shareasale' | 'impact' | 'partnerstack' | 'cj' | 'direct' | 'none'
 *   commissionType        — 'cpa' | 'recurring' | 'flat'
 *   commissionRate        — text e.g. "30%" or "$5"
 *   cookieDuration        — days e.g. 30
 *   affiliateStatus       — 'not_started' | 'pending' | 'approved' | 'rejected' | 'not_available'
 *   affiliateProgramUrl   — URL to the tool's affiliate/partner sign-up page
 *   affiliateNotes        — freeform internal notes
 *   affiliateLastVerified — last date the affiliate link was verified as working
 *   clickCount            — total outbound clicks (all sources, not just affiliate)
 *
 * RUN ON STAGING FIRST. Take a MongoDB Atlas snapshot before running on PRODUCTION.
 */

export const up = async (db) => {
    const result = await db.collection('tools').updateMany(
        { affiliateStatus: { $exists: false } },
        {
            $set: {
                affiliateUrl: null,
                affiliateNetwork: 'none',
                commissionType: 'cpa',
                commissionRate: null,
                cookieDuration: null,
                affiliateStatus: 'not_started',
                affiliateProgramUrl: null,
                affiliateNotes: null,
                affiliateLastVerified: null,
                clickCount: 0,
            },
        }
    )
    console.log(`[Migration] Affiliate fields added to ${result.modifiedCount} tools`)
}

export const down = async (db) => {
    const result = await db.collection('tools').updateMany(
        {},
        {
            $unset: {
                affiliateUrl: '',
                affiliateNetwork: '',
                commissionType: '',
                commissionRate: '',
                cookieDuration: '',
                affiliateStatus: '',
                affiliateProgramUrl: '',
                affiliateNotes: '',
                affiliateLastVerified: '',
                clickCount: '',
            },
        }
    )
    console.log(`[Migration] Affiliate fields removed from ${result.modifiedCount} tools`)
}
