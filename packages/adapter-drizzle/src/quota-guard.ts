import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { getTierLimit, type QuotaGuard, type UserTier } from "@cronicorn/domain";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { aiAnalysisSessions, jobEndpoints, user } from "./schema.js";

/**
 * DrizzleQuotaGuard - PostgreSQL-backed quota enforcement.
 *
 * Implements soft-limit token quota checking by:
 * 1. Querying user tier from database
 * 2. Summing token usage from aiAnalysisSessions for current month
 * 3. Comparing usage against tier limit
 *
 * **Soft Limit Behavior**: Multiple concurrent operations may check quota
 * simultaneously before any records usage, potentially allowing 10-20% burst
 * overrun. This is acceptable for cost-aware scenarios.
 *
 * **Performance**: Uses JOIN to aggregate usage across all endpoints for a tenant.
 * Consider adding index on aiAnalysisSessions.analyzedAt for large datasets.
 *
 * Typed for node-postgres driver. Accepts any schema for flexibility.
 */
export class DrizzleQuotaGuard implements QuotaGuard {
    constructor(
        // eslint-disable-next-line ts/no-explicit-any
        private readonly db: NodePgDatabase<any> | NodePgTransaction<any, any>,
    ) { }

    /**
     * Check if tenant can proceed with AI operation.
     *
     * @param tenantId - Unique tenant identifier (maps to userId in MVP)
     * @returns true if quota available, false if exceeded
     */
    async canProceed(tenantId: string): Promise<boolean> {
        // Get user tier
        const userRecord = await this.db
            .select({ tier: user.tier })
            .from(user)
            .where(eq(user.id, tenantId))
            .limit(1);

        if (userRecord.length === 0) {
            // User not found - deny by default
            return false;
        }

        const tierValue = userRecord[0].tier;
        if (tierValue !== "free" && tierValue !== "pro" && tierValue !== "enterprise") {
            // Invalid tier - deny by default
            return false;
        }
        const tierLimit = getTierLimit(tierValue);

        // Calculate start of current month (UTC)
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        // Get all endpoint IDs for this tenant
        const endpoints = await this.db
            .select({ id: jobEndpoints.id })
            .from(jobEndpoints)
            .where(eq(jobEndpoints.tenantId, tenantId));

        if (endpoints.length === 0) {
            // No endpoints yet - allow (usage is 0)
            return true;
        }

        const endpointIds = endpoints.map(ep => ep.id);

        // Sum token usage for current month
        const usageResult = await this.db
            .select({
                totalUsage: sql<number>`COALESCE(SUM(${aiAnalysisSessions.tokenUsage}), 0)`,
            })
            .from(aiAnalysisSessions)
            .where(
                and(
                    inArray(aiAnalysisSessions.endpointId, endpointIds),
                    gte(aiAnalysisSessions.analyzedAt, startOfMonth),
                ),
            );

        const currentUsage = usageResult[0]?.totalUsage ?? 0;

        return currentUsage < tierLimit;
    }

    /**
     * Record actual usage after operation completes.
     *
     * **Note**: This is a no-op in current implementation since token usage
     * is already persisted via SessionsRepo.create() after each AI analysis.
     * This method exists to satisfy the QuotaGuard port contract and could
     * be used for additional logging/metrics in the future.
     *
     * @param _tenantId - Unique tenant identifier
     * @param _tokens - Total tokens consumed (prompt + completion)
     */
    async recordUsage(_tenantId: string, _tokens: number): Promise<void> {
        // No-op - usage already recorded via SessionsRepo
        // Could add additional logging/metrics here if needed
    }
}
