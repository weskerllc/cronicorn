import type { JobEndpoint, JobsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { type JobEndpointRow, jobEndpoints } from "./schema.js";

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

  async add(ep: JobEndpoint): Promise<void> {
    // Convert domain entity to DB row (add adapter fields)
    const row: typeof jobEndpoints.$inferInsert = {
      ...ep,
      _lockedUntil: undefined,
    };

    // Execute insert immediately
    await this.tx.insert(jobEndpoints).values(row);
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
      .select({ id: jobEndpoints.id })
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

    // Extend lock for claimed endpoints
    if (ids.length > 0) {
      await this.tx
        .update(jobEndpoints)
        .set({ _lockedUntil: horizon })
        .where(
          sql`${jobEndpoints.id} = ANY(${ids})`,
        );
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

    const updates: Partial<JobEndpointRow> = {
      lastRunAt: patch.lastRunAt,
      nextRunAt: patch.nextRunAt,
      failureCount: newFailureCount,
      _lockedUntil: null,
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
      jobId: row.jobId,
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
    };
  }
}
