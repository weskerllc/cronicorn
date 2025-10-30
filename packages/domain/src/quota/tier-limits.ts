/**
 * Tier-based quota limits for AI token usage and execution constraints.
 *
 * Defines monthly token allowances and execution limits per subscription tier.
 * Used by QuotaGuard and service layer to enforce usage limits.
 */

export const TIER_LIMITS = {
  free: 100_000, // 100k tokens/month
  pro: 1_000_000, // 1M tokens/month
  enterprise: 10_000_000, // 10M tokens/month
} as const;

/**
 * Tier-based execution limits to prevent endpoint spam.
 *
 * Protects against:
 * - Creating thousands of endpoints (maxEndpoints)
 * - Scheduling endpoints too frequently (minIntervalMs)
 * - Excessive monthly executions (maxRunsPerMonth)
 *
 * Combined effect:
 * - Free: 10 endpoints × 60s interval = max 14,400 requests/day, 10k/month limit
 * - Pro: 100 endpoints × 10s interval = max 864,000 requests/day, 100k/month limit
 * - Enterprise: 1,000 endpoints × 1s interval = max 86.4M requests/day, 1M/month limit
 */
export const TIER_EXECUTION_LIMITS = {
  free: {
    maxEndpoints: 10, // Max 10 endpoints per user
    minIntervalMs: 60_000, // Must run at least 60s apart (1 minute)
    maxRunsPerMonth: 10_000, // 10k endpoint executions per month
  },
  pro: {
    maxEndpoints: 100,
    minIntervalMs: 10_000, // 10 seconds
    maxRunsPerMonth: 100_000, // 100k executions per month
  },
  enterprise: {
    maxEndpoints: 1_000,
    minIntervalMs: 1_000, // 1 second
    maxRunsPerMonth: 1_000_000, // 1M executions per month
  },
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

/**
 * Get execution limits for a tier.
 *
 * @param tier - User subscription tier
 * @returns Execution limits (maxEndpoints, minIntervalMs)
 */
export function getExecutionLimits(tier: UserTier) {
  return TIER_EXECUTION_LIMITS[tier];
}

/**
 * Get monthly runs limit for a tier.
 *
 * @param tier - User subscription tier
 * @returns Monthly runs limit
 */
export function getRunsLimit(tier: UserTier): number {
  return TIER_EXECUTION_LIMITS[tier].maxRunsPerMonth;
}
