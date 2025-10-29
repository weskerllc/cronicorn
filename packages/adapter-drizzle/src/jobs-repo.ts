import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { getExecutionLimits, getRunsLimit, getTierLimit, type Job, type JobEndpoint, type JobsRepo } from "@cronicorn/domain";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { type JobEndpointRow, jobEndpoints, type JobRow, jobs, runs, user } from "./schema.js";

/**
 * PostgreSQL implementation of JobsRepo using Drizzle ORM.
 *
 * Uses FOR UPDATE SKIP LOCKED for atomic claiming.
 * All operations are transaction-scoped.
 *
 * Typed for node-postgres driver. Accepts any schema for flexibility.
 */
export class DrizzleJobsRepo implements JobsRepo {
  constructor(
    // eslint-disable-next-line ts/no-explicit-any
    private tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
    private now: () => Date = () => new Date(),
  ) { }

  async addEndpoint(ep: JobEndpoint): Promise<void> {
    // Convert domain entity to DB row (add adapter fields)
    // Note: jobId defaults to empty string in domain, but DB expects null for no job
    const row: typeof jobEndpoints.$inferInsert = {
      ...ep,
      jobId: ep.jobId && ep.jobId !== "" ? ep.jobId : null,
      _lockedUntil: undefined,
    };

    // Execute insert immediately
    await this.tx.insert(jobEndpoints).values(row);
  }

  async updateEndpoint(id: string, patch: Partial<Omit<JobEndpoint, "id" | "tenantId">>): Promise<JobEndpoint> {
    // Build update object, only including defined fields
    const updates: Partial<typeof jobEndpoints.$inferInsert> = {};

    if (patch.name !== undefined)
      updates.name = patch.name;
    if (patch.jobId !== undefined)
      updates.jobId = patch.jobId && patch.jobId !== "" ? patch.jobId : null;
    if (patch.baselineCron !== undefined)
      updates.baselineCron = patch.baselineCron;
    if (patch.baselineIntervalMs !== undefined)
      updates.baselineIntervalMs = patch.baselineIntervalMs;
    if (patch.minIntervalMs !== undefined)
      updates.minIntervalMs = patch.minIntervalMs;
    if (patch.maxIntervalMs !== undefined)
      updates.maxIntervalMs = patch.maxIntervalMs;
    if (patch.pausedUntil !== undefined)
      updates.pausedUntil = patch.pausedUntil;
    if (patch.lastRunAt !== undefined)
      updates.lastRunAt = patch.lastRunAt;
    if (patch.nextRunAt !== undefined)
      updates.nextRunAt = patch.nextRunAt;
    if (patch.failureCount !== undefined)
      updates.failureCount = patch.failureCount;
    if (patch.url !== undefined)
      updates.url = patch.url;
    if (patch.method !== undefined)
      updates.method = patch.method;
    if (patch.headersJson !== undefined)
      updates.headersJson = patch.headersJson;
    if (patch.bodyJson !== undefined)
      updates.bodyJson = patch.bodyJson;
    if (patch.timeoutMs !== undefined)
      updates.timeoutMs = patch.timeoutMs;
    if (patch.maxExecutionTimeMs !== undefined)
      updates.maxExecutionTimeMs = patch.maxExecutionTimeMs;
    if (patch.maxResponseSizeKb !== undefined)
      updates.maxResponseSizeKb = patch.maxResponseSizeKb;
    if (patch.aiHintIntervalMs !== undefined)
      updates.aiHintIntervalMs = patch.aiHintIntervalMs;
    if (patch.aiHintNextRunAt !== undefined)
      updates.aiHintNextRunAt = patch.aiHintNextRunAt;
    if (patch.aiHintExpiresAt !== undefined)
      updates.aiHintExpiresAt = patch.aiHintExpiresAt;
    if (patch.aiHintReason !== undefined)
      updates.aiHintReason = patch.aiHintReason;

    await this.tx
      .update(jobEndpoints)
      .set(updates)
      .where(eq(jobEndpoints.id, id));

    return this.getEndpoint(id);
  }

  async clearAIHints(id: string): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({
        aiHintIntervalMs: null,
        aiHintNextRunAt: null,
        aiHintExpiresAt: null,
        aiHintReason: null,
      })
      .where(eq(jobEndpoints.id, id));
  }

  async resetFailureCount(id: string): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({ failureCount: 0 })
      .where(eq(jobEndpoints.id, id));
  }

  async claimDueEndpoints(limit: number, withinMs: number): Promise<string[]> {
    const now = this.now();
    const nowMs = now.getTime();
    const horizonMs = nowMs + withinMs;
    const horizon = new Date(horizonMs);

    // Claim endpoints that are:
    // 1. Due now or within horizon
    // 2. Not paused (pausedUntil is null or <= now)
    // 3. Not locked (lockedUntil is null or <= now)
    const claimed = await this.tx
      .select({
        id: jobEndpoints.id,
        maxExecutionTimeMs: jobEndpoints.maxExecutionTimeMs,
      })
      .from(jobEndpoints)
      .where(
        and(
          lte(jobEndpoints.nextRunAt, horizon),
          or(
            isNull(jobEndpoints.pausedUntil),
            lte(jobEndpoints.pausedUntil, now),
          ),
          or(
            isNull(jobEndpoints._lockedUntil),
            lte(jobEndpoints._lockedUntil, now),
          ),
        ),
      )
      .orderBy(jobEndpoints.nextRunAt)
      .limit(limit)
      .for("update", { skipLocked: true });

    const ids = claimed.map((r: { id: string }) => r.id);

    // Set lock duration per endpoint based on maxExecutionTimeMs
    // Use the maximum of: endpoint's maxExecutionTimeMs (default 60s), horizon, or minimum 60s
    if (ids.length > 0) {
      const maxLockDuration = claimed.reduce((max, ep) =>
        Math.max(max, ep.maxExecutionTimeMs ?? 60000), Math.max(withinMs, 60000));
      const lockUntil = new Date(nowMs + maxLockDuration);

      await this.tx
        .update(jobEndpoints)
        .set({ _lockedUntil: lockUntil })
        .where(inArray(jobEndpoints.id, ids));
    }

    return ids;
  }

  async getEndpoint(id: string): Promise<JobEndpoint> {
    const rows = await this.tx
      .select()
      .from(jobEndpoints)
      .where(eq(jobEndpoints.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`JobsRepo.getEndpoint: not found: ${id}`);
    }

    return this.rowToEntity(rows[0]);
  }

  async setLock(id: string, until: Date): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({ _lockedUntil: until })
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  async clearLock(id: string): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({ _lockedUntil: null })
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  async setNextRunAtIfEarlier(id: string, when: Date): Promise<void> {
    const ep = await this.getEndpoint(id);
    const now = this.now();

    // Respect pause
    if (ep.pausedUntil && ep.pausedUntil > now) {
      return;
    }

    // Apply min/max clamps
    const minAt = ep.minIntervalMs ? new Date(now.getTime() + ep.minIntervalMs) : undefined;
    const maxAt = ep.maxIntervalMs ? new Date(now.getTime() + ep.maxIntervalMs) : undefined;

    let candidate = when;
    if (minAt && candidate < minAt)
      candidate = minAt;
    if (maxAt && candidate > maxAt)
      candidate = maxAt;

    // Only update if candidate is earlier
    if (candidate < ep.nextRunAt) {
      await this.tx
        .update(jobEndpoints)
        .set({ nextRunAt: candidate })
        .where(eq(jobEndpoints.id, id));
    }
  }

  async writeAIHint(
    id: string,
    hint: {
      nextRunAt?: Date;
      intervalMs?: number;
      expiresAt: Date;
      reason?: string;
    },
  ): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({
        aiHintNextRunAt: hint.nextRunAt,
        aiHintIntervalMs: hint.intervalMs,
        aiHintExpiresAt: hint.expiresAt,
        aiHintReason: hint.reason,
      })
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  async setPausedUntil(id: string, until: Date | null): Promise<void> {
    await this.tx
      .update(jobEndpoints)
      .set({ pausedUntil: until })
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  async updateAfterRun(
    id: string,
    patch: {
      lastRunAt: Date;
      nextRunAt: Date;
      status: { status: "success" | "failed" | "canceled"; durationMs: number };
      failureCountPolicy: "increment" | "reset";
      clearExpiredHints: boolean;
    },
  ): Promise<void> {
    const ep = await this.getEndpoint(id);
    const now = this.now();

    // Calculate new failure count
    const newFailureCount = patch.failureCountPolicy === "increment"
      ? ep.failureCount + 1
      : 0;

    // Clear hints if expired
    const clearHints = patch.clearExpiredHints
      && ep.aiHintExpiresAt
      && ep.aiHintExpiresAt <= now;

    // Don't clear lock immediately - keep it until nextRunAt to prevent re-claiming
    // during the claim horizon window. This ensures an endpoint isn't claimed multiple
    // times before its scheduled time when using horizon-based claiming.
    const lockUntil = patch.nextRunAt > now ? patch.nextRunAt : null;

    const updates: Partial<JobEndpointRow> = {
      lastRunAt: patch.lastRunAt,
      nextRunAt: patch.nextRunAt,
      failureCount: newFailureCount,
      _lockedUntil: lockUntil,
    };

    if (clearHints) {
      updates.aiHintNextRunAt = null;
      updates.aiHintIntervalMs = null;
      updates.aiHintExpiresAt = null;
      updates.aiHintReason = null;
    }

    await this.tx
      .update(jobEndpoints)
      .set(updates)
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  /**
   * Convert DB row to domain entity (strip adapter fields).
   */
  private rowToEntity(row: JobEndpointRow): JobEndpoint {
    return {
      id: row.id,
      jobId: row.jobId ?? "", // Nullable for backward compat, default to empty string
      tenantId: row.tenantId,
      name: row.name,
      baselineCron: row.baselineCron ?? undefined,
      baselineIntervalMs: row.baselineIntervalMs ?? undefined,
      aiHintIntervalMs: row.aiHintIntervalMs ?? undefined,
      aiHintNextRunAt: row.aiHintNextRunAt ?? undefined,
      aiHintExpiresAt: row.aiHintExpiresAt ?? undefined,
      aiHintReason: row.aiHintReason ?? undefined,
      minIntervalMs: row.minIntervalMs ?? undefined,
      maxIntervalMs: row.maxIntervalMs ?? undefined,
      pausedUntil: row.pausedUntil ?? undefined,
      lastRunAt: row.lastRunAt ?? undefined,
      nextRunAt: row.nextRunAt,
      failureCount: row.failureCount,
      url: row.url ?? undefined,
      method: row.method ? (row.method === "GET" || row.method === "POST" || row.method === "PUT" || row.method === "PATCH" || row.method === "DELETE" ? row.method : undefined) : undefined,
      headersJson: row.headersJson ?? undefined,
      bodyJson: row.bodyJson,
      timeoutMs: row.timeoutMs ?? undefined,
      maxExecutionTimeMs: row.maxExecutionTimeMs ?? undefined,
      maxResponseSizeKb: row.maxResponseSizeKb ?? undefined,
    };
  }

  // ============================================================================
  // Phase 3: Job Lifecycle Operations
  // ============================================================================

  async createJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job> {
    const now = this.now();
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const row: typeof jobs.$inferInsert = {
      id,
      userId: job.userId,
      name: job.name,
      description: job.description,
      status: job.status,
      createdAt: now,
      updatedAt: now,
      archivedAt: job.archivedAt,
    };

    await this.tx.insert(jobs).values(row);

    return {
      id,
      userId: job.userId,
      name: job.name,
      description: job.description,
      status: job.status,
      createdAt: now,
      updatedAt: now,
      archivedAt: job.archivedAt,
    };
  }

  async getJob(id: string): Promise<Job | null> {
    const rows = await this.tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return this.jobRowToEntity(rows[0]);
  }

  async listJobs(
    userId: string,
    filters?: { status?: "active" | "archived" },
  ): Promise<Array<Job & { endpointCount: number }>> {
    // Build base query with endpoint count
    const query = this.tx
      .select({
        id: jobs.id,
        userId: jobs.userId,
        name: jobs.name,
        description: jobs.description,
        status: jobs.status,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        archivedAt: jobs.archivedAt,
        endpointCount: sql<number>`cast(count(${jobEndpoints.id}) as int)`,
      })
      .from(jobs)
      .leftJoin(jobEndpoints, eq(jobEndpoints.jobId, jobs.id))
      .where(
        filters?.status
          ? and(eq(jobs.userId, userId), eq(jobs.status, filters.status))
          : eq(jobs.userId, userId),
      )
      .groupBy(jobs.id);

    const rows = await query;

    return rows.map((row) => {
      const status: "active" | "archived" = row.status === "archived" ? "archived" : "active";
      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description ?? undefined,
        status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        archivedAt: row.archivedAt ?? undefined,
        endpointCount: row.endpointCount,
      };
    });
  }

  async updateJob(id: string, patch: { name?: string; description?: string }): Promise<Job> {
    const now = this.now();

    await this.tx
      .update(jobs)
      .set({
        ...patch,
        updatedAt: now,
      })
      .where(eq(jobs.id, id));

    const updated = await this.getJob(id);
    if (!updated) {
      throw new Error(`Job not found: ${id}`);
    }

    return updated;
  }

  async archiveJob(id: string): Promise<Job> {
    const now = this.now();

    await this.tx
      .update(jobs)
      .set({
        status: "archived",
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(jobs.id, id));

    const archived = await this.getJob(id);
    if (!archived) {
      throw new Error(`Job not found: ${id}`);
    }

    return archived;
  }

  // ============================================================================
  // Phase 3: Endpoint Relationship Operations
  // ============================================================================

  async listEndpointsByJob(jobId: string): Promise<JobEndpoint[]> {
    const rows = await this.tx
      .select()
      .from(jobEndpoints)
      .where(eq(jobEndpoints.jobId, jobId));

    return rows.map(row => this.rowToEntity(row));
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.tx
      .delete(jobEndpoints)
      .where(eq(jobEndpoints.id, id));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
    // getEndpoint will throw if row doesn't exist
  }

  async getUserTier(userId: string): Promise<"free" | "pro" | "enterprise"> {
    const result = await this.tx
      .select({ tier: user.tier })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Default to "free" tier if user not found (safest/most restrictive default)
    // This gracefully handles edge cases like session-user mismatches in tests
    if (!result[0]) {
      return "free";
    }

    const tier = result[0].tier;
    if (tier === "pro" || tier === "enterprise") {
      return tier;
    }
    return "free";
  }

  async getUsage(userId: string, since: Date): Promise<{
    aiCallsUsed: number;
    aiCallsLimit: number;
    endpointsUsed: number;
    endpointsLimit: number;
    totalRuns: number;
    totalRunsLimit: number;
  }> {
    // Get user tier
    const tier = await this.getUserTier(userId);

    // Get tier limits
    const aiCallsLimit = getTierLimit(tier);
    const { maxEndpoints: endpointsLimit } = getExecutionLimits(tier);
    const totalRunsLimit = getRunsLimit(tier);

    // Count endpoints for this user
    const endpointsResult = await this.tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(jobEndpoints)
      .where(eq(jobEndpoints.tenantId, userId));
    const endpointsUsed = endpointsResult[0]?.count ?? 0;

    // Sum token usage since specified date
    const { aiAnalysisSessions } = await import("./schema.js");
    const usageResult = await this.tx
      .select({
        totalUsage: sql<number>`COALESCE(SUM(${aiAnalysisSessions.tokenUsage}), 0)::int`,
      })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .where(
        and(
          eq(jobEndpoints.tenantId, userId),
          sql`${aiAnalysisSessions.analyzedAt} >= ${since}`,
        ),
      );
    const aiCallsUsed = usageResult[0]?.totalUsage ?? 0;

    // Count total runs since specified date
    const runsResult = await this.tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(runs)
      .innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
      .where(
        and(
          eq(jobEndpoints.tenantId, userId),
          sql`${runs.startedAt} >= ${since}`,
        ),
      );
    const totalRuns = runsResult[0]?.count ?? 0;

    return {
      aiCallsUsed,
      aiCallsLimit,
      endpointsUsed,
      endpointsLimit,
      totalRuns,
      totalRunsLimit,
    };
  }

  /**
   * Convert DB job row to domain entity.
   */
  private jobRowToEntity(row: JobRow): Job {
    const status: "active" | "archived" = row.status === "archived" ? "archived" : "active";
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description ?? undefined,
      status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt ?? undefined,
    };
  }

  // ============================================================================
  // Subscription Management (Stripe Integration)
  // ============================================================================

  async getUserById(userId: string): Promise<{
    id: string;
    email: string;
    tier: "free" | "pro" | "enterprise";
    stripeCustomerId: string | null;
  } | null> {
    const result = await this.tx
      .select({
        id: user.id,
        email: user.email,
        tier: user.tier,
        stripeCustomerId: user.stripeCustomerId,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const row = result[0];
    const tier = (row.tier === "pro" || row.tier === "enterprise") ? row.tier : "free";

    return {
      id: row.id,
      email: row.email,
      tier,
      stripeCustomerId: row.stripeCustomerId ?? null,
    };
  }

  async getUserByStripeCustomerId(customerId: string): Promise<{
    id: string;
    email: string;
  } | null> {
    const result = await this.tx
      .select({
        id: user.id,
        email: user.email,
      })
      .from(user)
      .where(eq(user.stripeCustomerId, customerId))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return result[0];
  }

  async updateUserSubscription(userId: string, patch: {
    tier?: "free" | "pro" | "enterprise";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date | null;
  }): Promise<void> {
    const now = this.now();

    // Build update object with only defined fields
    const updates: Partial<typeof user.$inferInsert> = {
      updatedAt: now,
    };

    if (patch.tier !== undefined) {
      updates.tier = patch.tier;
    }
    if (patch.stripeCustomerId !== undefined) {
      updates.stripeCustomerId = patch.stripeCustomerId;
    }
    if (patch.stripeSubscriptionId !== undefined) {
      updates.stripeSubscriptionId = patch.stripeSubscriptionId;
    }
    if (patch.subscriptionStatus !== undefined) {
      updates.subscriptionStatus = patch.subscriptionStatus;
    }
    if (patch.subscriptionEndsAt !== undefined) {
      updates.subscriptionEndsAt = patch.subscriptionEndsAt;
    }

    await this.tx
      .update(user)
      .set(updates)
      .where(eq(user.id, userId));

    // Note: Idempotent - safe to call multiple times with same data
  }
}
