/**
 * Tier-based quota limits for AI token usage.
 *
 * Defines monthly token allowances per subscription tier.
 * Used by QuotaGuard implementations to enforce usage limits.
 */

export const TIER_LIMITS = {
    free: 100_000, // 100k tokens/month
    pro: 1_000_000, // 1M tokens/month
    enterprise: 10_000_000, // 10M tokens/month
} as const;

export type UserTier = keyof typeof TIER_LIMITS;

/**
 * Get monthly token limit for a tier.
 *
 * @param tier - User subscription tier
 * @returns Monthly token limit
 */
export function getTierLimit(tier: UserTier): number {
    return TIER_LIMITS[tier];
}
