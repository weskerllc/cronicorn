import type { HealthSummary, JsonValue, RunsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, avg, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { jobEndpoints, jobs, runs } from "./schema.js";

/**
 * PostgreSQL implementation of RunsRepo using Drizzle ORM.
 * Tracks execution history with status and timing.
 *
 * Typed for node-postgres driver. Accepts any schema for flexibility.
 */
export class DrizzleRunsRepo implements RunsRepo {
  private seq = 0;

  constructor(
    // eslint-disable-next-line ts/no-explicit-any
    private tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  ) { }

  async create(run: {
    endpointId: string;
    status: "running";
    attempt: number;
    source?: string; // Phase 3: Track what triggered this run
  }): Promise<string> {
    const id = `run_${Date.now()}_${this.seq++}`;

    await this.tx.insert(runs).values({
      id,
      endpointId: run.endpointId,
      status: run.status,
      attempt: run.attempt,
      source: run.source,
      startedAt: new Date(),
    });

    return id;
  }

  async finish(
    runId: string,
    patch: {
      status: "success" | "failed" | "canceled";
      durationMs: number;
      err?: unknown;
      responseBody?: JsonValue;
      statusCode?: number;
    },
  ): Promise<void> {
    const updates: Partial<typeof runs.$inferInsert> = {
      status: patch.status,
      finishedAt: new Date(),
      durationMs: patch.durationMs,
      errorMessage: patch.err ? String(patch.err) : undefined,
      errorDetails: patch.err ? (typeof patch.err === "object" ? patch.err : { error: patch.err }) : undefined,
      responseBody: patch.responseBody,
      statusCode: patch.statusCode,
    };

    await this.tx
      .update(runs)
      .set(updates)
      .where(eq(runs.id, runId));

    // Note: Drizzle doesn't return rowCount, optimistically assume success
  }

  // ============================================================================
  // Phase 3: Execution Visibility Operations
  // ============================================================================

  async listRuns(filters: {
    userId: string;
    jobId?: string;
    endpointId?: string;
    status?: "success" | "failed";
    limit?: number;
    offset?: number;
  }): Promise<{
    runs: Array<{
      runId: string;
      endpointId: string;
      startedAt: Date;
      status: string;
      durationMs?: number;
      source?: string;
    }>;
    total: number;
  }> {
    // Build conditions
    // Build query conditions
    const conditions = [];

    // CRITICAL: Always filter by userId to ensure data isolation
    conditions.push(eq(jobs.userId, filters.userId));

    if (filters.endpointId) {
      conditions.push(eq(runs.endpointId, filters.endpointId));
    }
    else if (filters.jobId) {
      // If filtering by job, need to join with endpoints
      conditions.push(eq(jobEndpoints.jobId, filters.jobId));
    }

    if (filters.status) {
      conditions.push(eq(runs.status, filters.status));
    }

    // Build and execute query - construct in one fluent chain
    const baseSelect = this.tx
      .select({
        runId: runs.id,
        endpointId: runs.endpointId,
        startedAt: runs.startedAt,
        status: runs.status,
        durationMs: runs.durationMs,
        source: runs.source,
      })
      .from(runs);

    // CRITICAL: Always join with jobEndpoints and jobs to filter by userId
    const withJoin = baseSelect
      .innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id));

    // Add where conditions
    const withWhere = conditions.length > 0
      ? withJoin.where(and(...conditions))
      : withJoin;

    // Add ordering
    const withOrder = withWhere.orderBy(desc(runs.startedAt));

    // Add limit and execute
    const rows = filters.limit
      ? await withOrder.limit(filters.limit).offset(filters.offset ?? 0)
      : await withOrder.offset(filters.offset ?? 0);

    // Get total count (TODO: optimize with single query using window functions)
    // CRITICAL: Always join with jobEndpoints and jobs to filter by userId
    const countQuery = this.tx
      .select({ count: count() })
      .from(runs)
      .innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id));

    const countWithWhere = conditions.length > 0
      ? countQuery.where(and(...conditions))
      : countQuery;

    const totalResult = await countWithWhere;
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      runs: rows.map(row => ({
        runId: row.runId,
        endpointId: row.endpointId,
        startedAt: row.startedAt,
        status: row.status,
        durationMs: row.durationMs ?? undefined,
        source: row.source ?? undefined,
      })),
      total,
    };
  }

  async getRunDetails(runId: string): Promise<{
    id: string;
    endpointId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string;
    responseBody?: JsonValue;
    source?: string;
    attempt: number;
  } | null> {
    const rows = await this.tx
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      endpointId: row.endpointId,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
      durationMs: row.durationMs ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      source: row.source ?? undefined,
      attempt: row.attempt,
      responseBody: row.responseBody ?? undefined,
    };
  }

  async getHealthSummary(endpointId: string, since: Date): Promise<HealthSummary> {
    // Get aggregated stats
    const statsResult = await this.tx
      .select({
        successCount: sql<number>`count(*) filter (where ${runs.status} = 'success')`.as("success_count"),
        failureCount: sql<number>`count(*) filter (where ${runs.status} = 'failed')`.as("failure_count"),
        avgDuration: avg(runs.durationMs),
      })
      .from(runs)
      .where(and(
        eq(runs.endpointId, endpointId),
        gte(runs.startedAt, since),
      ));

    const stats = statsResult[0];
    const successCount = Number(stats?.successCount ?? 0);
    const failureCount = Number(stats?.failureCount ?? 0);
    const avgDurationMs = stats?.avgDuration ? Number(stats.avgDuration) : null;

    // Get last run
    const lastRunResult = await this.tx
      .select({
        status: runs.status,
        startedAt: runs.startedAt,
      })
      .from(runs)
      .where(and(
        eq(runs.endpointId, endpointId),
        gte(runs.startedAt, since),
      ))
      .orderBy(desc(runs.startedAt))
      .limit(1);

    const lastRun = lastRunResult[0]
      ? { status: lastRunResult[0].status, at: lastRunResult[0].startedAt }
      : null;

    // Calculate failure streak (consecutive failures from most recent)
    const recentRuns = await this.tx
      .select({ status: runs.status })
      .from(runs)
      .where(and(
        eq(runs.endpointId, endpointId),
        gte(runs.startedAt, since),
      ))
      .orderBy(desc(runs.startedAt))
      .limit(100); // Reasonable limit for streak calculation

    let failureStreak = 0;
    for (const run of recentRuns) {
      if (run.status === "failed") {
        failureStreak++;
      }
      else {
        break;
      }
    }

    return {
      successCount,
      failureCount,
      avgDurationMs,
      lastRun,
      failureStreak,
    };
  }

  async getEndpointsWithRecentRuns(since: Date): Promise<string[]> {
    const results = await this.tx
      .selectDistinct({ endpointId: runs.endpointId })
      .from(runs)
      .where(gte(runs.startedAt, since));

    return results.map(r => r.endpointId);
  }

  // ============================================================================
  // AI Query Tools: Response Data Retrieval
  // ============================================================================

  async getLatestResponse(endpointId: string): Promise<{
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  } | null> {
    const rows = await this.tx
      .select({
        responseBody: runs.responseBody,
        timestamp: runs.startedAt,
        status: runs.status,
      })
      .from(runs)
      .where(eq(runs.endpointId, endpointId))
      .orderBy(desc(runs.startedAt))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      responseBody: row.responseBody ?? null,
      timestamp: row.timestamp,
      status: row.status,
    };
  }

  async getResponseHistory(
    endpointId: string,
    limit: number,
  ): Promise<Array<{
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
    durationMs: number;
  }>> {
    // Clamp limit to max 50
    const clampedLimit = Math.min(limit, 50);

    const rows = await this.tx
      .select({
        responseBody: runs.responseBody,
        timestamp: runs.startedAt,
        status: runs.status,
        durationMs: runs.durationMs,
      })
      .from(runs)
      .where(and(
        eq(runs.endpointId, endpointId),
        // Only include finished runs (those with durationMs)
        sql`${runs.durationMs} IS NOT NULL`,
      ))
      .orderBy(desc(runs.startedAt), desc(runs.id))
      .limit(clampedLimit);

    return rows.map(row => ({
      responseBody: row.responseBody ?? null,
      timestamp: row.timestamp,
      status: row.status,
      durationMs: row.durationMs!, // Safe because we filtered out nulls
    }));
  }

  async getSiblingLatestResponses(
    jobId: string,
    excludeEndpointId: string,
  ): Promise<Array<{
    endpointId: string;
    endpointName: string;
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  }>> {
    // This requires a lateral join to get latest run per endpoint.
    // We'll use a window function approach instead (simpler with Drizzle).

    // First get all endpoints for the job (excluding current)
    const endpoints = await this.tx
      .select({
        id: jobEndpoints.id,
        name: jobEndpoints.name,
      })
      .from(jobEndpoints)
      .where(and(
        eq(jobEndpoints.jobId, jobId),
        sql`${jobEndpoints.id} != ${excludeEndpointId}`,
      ));

    // For each endpoint, get latest run
    const results = [];
    for (const endpoint of endpoints) {
      const latestRun = await this.tx
        .select({
          responseBody: runs.responseBody,
          timestamp: runs.startedAt,
          status: runs.status,
        })
        .from(runs)
        .where(eq(runs.endpointId, endpoint.id))
        .orderBy(desc(runs.startedAt))
        .limit(1);

      if (latestRun.length > 0) {
        const run = latestRun[0];
        results.push({
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          responseBody: run.responseBody ?? null,
          timestamp: run.timestamp,
          status: run.status,
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  async cleanupZombieRuns(olderThanMs: number): Promise<number> {
    const threshold = new Date(Date.now() - olderThanMs);

    // Find zombie runs (stuck in "running" state longer than threshold)
    const zombies = await this.tx
      .select({ id: runs.id })
      .from(runs)
      .where(and(
        eq(runs.status, "running"),
        lte(runs.startedAt, threshold),
      ));

    if (zombies.length === 0) {
      return 0;
    }

    const zombieIds = zombies.map(z => z.id);

    // Mark them as failed with descriptive error message
    await this.tx
      .update(runs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorMessage: "Worker crashed or timed out (no response after threshold)",
      })
      .where(inArray(runs.id, zombieIds));

    return zombies.length;
  }
}
