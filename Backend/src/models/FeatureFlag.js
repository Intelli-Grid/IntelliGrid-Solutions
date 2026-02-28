import mongoose from 'mongoose'

/**
 * FeatureFlag model — IntelliGrid deployment control system
 *
 * Each flag represents one independently togglable feature.
 * All flags default to OFF (enabled: false) for safe production deploys.
 *
 * Usage pattern:
 *   import { isFeatureEnabled } from '../services/featureFlags.js'
 *   const enabled = await isFeatureEnabled('AFFILIATE_TRACKING')
 */
const featureFlagSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            uppercase: true,
            trim: true,
        },
        enabled: {
            type: Boolean,
            default: false,
        },
        // Roles that can access this feature even when enabled === false
        // Use for internal testing: ['SUPERADMIN', 'TRUSTED_OPERATOR']
        enabledForRoles: {
            type: [String],
            default: [],
        },
        description: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
)

const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema)

export default FeatureFlag
