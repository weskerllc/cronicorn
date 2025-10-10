import type { RunsRepo } from "@cronicorn/domain";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import { eq } from "drizzle-orm";

import { runs } from "./schema.js";

/**
 * PostgreSQL implementation of RunsRepo using Drizzle ORM.
 * Tracks execution history with status and timing.
 */
export class DrizzleRunsRepo implements RunsRepo {
  private seq = 0;

  constructor(
    private tx: PgTransaction<PostgresJsQueryResultHKT, Record<string, never>>,
  ) { }

  async create(run: {
    endpointId: string;
    status: "running";
    attempt: number;
  }): Promise<string> {
    const id = `run_${Date.now()}_${this.seq++}`;

    await this.tx.insert(runs).values({
      id,
      endpointId: run.endpointId,
      status: run.status,
      attempt: run.attempt,
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
}
