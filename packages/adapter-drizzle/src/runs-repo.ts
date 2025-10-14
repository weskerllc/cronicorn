import type { RunsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, desc, eq } from "drizzle-orm";

import { jobEndpoints, runs } from "./schema.js";

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
    },
  ): Promise<void> {
    const updates: Partial<typeof runs.$inferInsert> = {
      status: patch.status,
      finishedAt: new Date(),
      durationMs: patch.durationMs,
      errorMessage: patch.err ? String(patch.err) : undefined,
      errorDetails: patch.err ? (typeof patch.err === "object" ? patch.err : { error: patch.err }) : undefined,
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
  }): Promise<Array<{
      runId: string;
      endpointId: string;
      startedAt: Date;
      status: string;
      durationMs?: number;
      source?: string;
    }>> {
    // Build conditions
    const conditions = [];

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

    // Execute query
    let query = this.tx
      .select({
        runId: runs.id,
        endpointId: runs.endpointId,
        startedAt: runs.startedAt,
        status: runs.status,
        durationMs: runs.durationMs,
        source: runs.source,
      })
      .from(runs);

    // Join with endpoints if needed for jobId filtering
    if (filters.jobId) {
      query = query.innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id)) as any;
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(runs.startedAt)) as any;

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    const rows = await query;

    return rows.map(row => ({
      runId: row.runId,
      endpointId: row.endpointId,
      startedAt: row.startedAt,
      status: row.status,
      durationMs: row.durationMs ?? undefined,
      source: row.source ?? undefined,
    }));
  }

  async getRunDetails(runId: string): Promise<{
    id: string;
    endpointId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string;
    source?: string;
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
    };
  }
}
