import type { SessionsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { desc, eq, sql, sum } from "drizzle-orm";

import { aiAnalysisSessions, jobEndpoints, jobs } from "./schema.js";

/**
 * PostgreSQL implementation of SessionsRepo using Drizzle ORM.
 * Tracks AI planner analysis sessions for debugging and cost tracking.
 *
 * Typed for node-postgres driver. Accepts any schema for flexibility.
 */
export class DrizzleSessionsRepo implements SessionsRepo {
  private seq = 0;

  constructor(
    // eslint-disable-next-line ts/no-explicit-any
    private tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  ) { }

  async create(session: {
    endpointId: string;
    analyzedAt: Date;
    toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
    reasoning: string;
    tokenUsage?: number;
    durationMs?: number;
  }): Promise<string> {
    const id = `session_${Date.now()}_${this.seq++}`;

    await this.tx.insert(aiAnalysisSessions).values({
      id,
      endpointId: session.endpointId,
      analyzedAt: session.analyzedAt,
      toolCalls: session.toolCalls,
      reasoning: session.reasoning,
      tokenUsage: session.tokenUsage ?? null,
      durationMs: session.durationMs ?? null,
    });

    return id;
  }

  async getRecentSessions(
    endpointId: string,
        limit = 10,
  ): Promise<Array<{
      id: string;
      analyzedAt: Date;
      toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
      reasoning: string;
      tokenUsage: number | null;
      durationMs: number | null;
    }>> {
    const results = await this.tx
      .select({
        id: aiAnalysisSessions.id,
        analyzedAt: aiAnalysisSessions.analyzedAt,
        toolCalls: aiAnalysisSessions.toolCalls,
        reasoning: aiAnalysisSessions.reasoning,
        tokenUsage: aiAnalysisSessions.tokenUsage,
        durationMs: aiAnalysisSessions.durationMs,
      })
      .from(aiAnalysisSessions)
      .where(eq(aiAnalysisSessions.endpointId, endpointId))
      .orderBy(desc(aiAnalysisSessions.analyzedAt))
      .limit(Math.min(limit, 100)); // Cap at 100 for safety

    return results.map(r => ({
      id: r.id,
      analyzedAt: r.analyzedAt,
      toolCalls: r.toolCalls ?? [],
      reasoning: r.reasoning ?? "",
      tokenUsage: r.tokenUsage,
      durationMs: r.durationMs,
    }));
  }

  async getTotalTokenUsage(endpointId: string, since: Date): Promise<number> {
    const result = await this.tx
      .select({
        total: sum(aiAnalysisSessions.tokenUsage),
      })
      .from(aiAnalysisSessions)
      .where(
        sql`${aiAnalysisSessions.endpointId} = ${endpointId} AND ${aiAnalysisSessions.analyzedAt} >= ${since}`,
      );

    const total = result[0]?.total;

    // sum() returns string | null, convert to number
    return total ? Number(total) : 0;
  }

  async getRecentSessionsGlobal(
    userId: string,
    limit = 50,
  ): Promise<Array<{
      id: string;
      endpointId: string;
      analyzedAt: Date;
      toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
      reasoning: string;
      tokenUsage: number | null;
      durationMs: number | null;
    }>> {
    const results = await this.tx
      .select({
        id: aiAnalysisSessions.id,
        endpointId: aiAnalysisSessions.endpointId,
        analyzedAt: aiAnalysisSessions.analyzedAt,
        toolCalls: aiAnalysisSessions.toolCalls,
        reasoning: aiAnalysisSessions.reasoning,
        tokenUsage: aiAnalysisSessions.tokenUsage,
        durationMs: aiAnalysisSessions.durationMs,
      })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
      .where(eq(jobs.userId, userId))
      .orderBy(desc(aiAnalysisSessions.analyzedAt))
      .limit(Math.min(limit, 100)); // Cap at 100 for safety

    return results.map(r => ({
      id: r.id,
      endpointId: r.endpointId,
      analyzedAt: r.analyzedAt,
      toolCalls: r.toolCalls ?? [],
      reasoning: r.reasoning ?? "",
      tokenUsage: r.tokenUsage,
      durationMs: r.durationMs,
    }));
  }
}
