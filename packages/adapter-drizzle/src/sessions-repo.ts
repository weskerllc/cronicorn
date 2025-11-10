import type { SessionsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";

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

  async getAISessionTimeSeries(filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
  }): Promise<Array<{
    date: string;
    endpointId: string;
    endpointName: string;
    sessionCount: number;
    totalTokens: number;
  }>> {
    const conditions = [eq(jobs.userId, filters.userId)];

    if (filters.sinceDate) {
      conditions.push(gte(aiAnalysisSessions.analyzedAt, filters.sinceDate));
    }
    if (filters.jobId) {
      conditions.push(eq(jobs.id, filters.jobId));
    }

    const results = await this.tx
      .select({
        date: sql<string>`DATE(${aiAnalysisSessions.analyzedAt})`,
        endpointId: jobEndpoints.id,
        endpointName: jobEndpoints.name,
        sessionCount: count(),
        totalTokens: sum(aiAnalysisSessions.tokenUsage),
      })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
      .where(and(...conditions))
      .groupBy(sql`DATE(${aiAnalysisSessions.analyzedAt})`, jobEndpoints.id, jobEndpoints.name)
      .orderBy(sql`DATE(${aiAnalysisSessions.analyzedAt}) ASC`);

    return results.map(row => ({
      date: row.date,
      endpointId: row.endpointId,
      endpointName: row.endpointName,
      sessionCount: Number(row.sessionCount),
      totalTokens: row.totalTokens ? Number(row.totalTokens) : 0,
    }));
  }
}
