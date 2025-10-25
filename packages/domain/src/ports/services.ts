/**
 * Dispatcher and quota ports.
 */

import type { ExecutionResult, JobEndpoint } from "../entities/index.js";

export type Dispatcher = {
  execute: (ep: JobEndpoint) => Promise<ExecutionResult>;
};

/**
 * QuotaGuard - Simple token-based rate limiting for AI API calls.
 *
 * **Purpose**: Prevents runaway costs and ensures fair resource allocation across tenants
 * with a simple check-before-run pattern.
 *
 * **Workflow**:
 * 1. `canProceed()` - Check if tenant has available quota
 * 2. Make AI call (outside this port)
 * 3. `recordUsage()` - Track actual token consumption
 *
 * **Soft Limit Behavior**: This is a "soft limit" implementation. Multiple concurrent operations
 * may all check quota simultaneously before any records usage, potentially allowing 10-20% burst
 * overrun. This is acceptable for cost-aware scenarios where occasional overruns are tolerable.
 *
 * **Example**:
 * ```ts
 * const allowed = await quota.canProceed(tenantId);
 * if (!allowed) {
 *   throw new Error("Quota exceeded");
 * }
 *
 * const result = await aiClient.generate(...);
 *
 * // Record actual usage (fire-and-forget acceptable)
 * await quota.recordUsage(tenantId, result.usage.totalTokens);
 * ```
 */
export type QuotaGuard = {
  /**
   * Check if tenant can proceed with operation.
   *
   * @param tenantId - Unique tenant identifier
   * @returns true if quota available, false if exceeded
   */
  canProceed: (tenantId: string) => Promise<boolean>;

  /**
   * Record actual usage after operation completes.
   *
   * Call after AI call succeeds to track consumption for billing,
   * metrics, and future quota checks. Fire-and-forget pattern acceptable.
   *
   * @param tenantId - Unique tenant identifier
   * @param tokens - Total tokens consumed (prompt + completion)
   */
  recordUsage: (tenantId: string, tokens: number) => Promise<void>;
};
