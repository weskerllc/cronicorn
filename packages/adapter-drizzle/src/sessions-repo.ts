import type { SessionsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, count, desc, eq, gte, inArray, isNull, ne, sql, sum } from "drizzle-orm";

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
    nextAnalysisAt?: Date;
    endpointFailureCount?: number;
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
      nextAnalysisAt: session.nextAnalysisAt ?? null,
      endpointFailureCount: session.endpointFailureCount ?? null,
    });

    return id;
  }

  async getLastSession(endpointId: string): Promise<{
    id: string;
    analyzedAt: Date;
    nextAnalysisAt: Date | null;
    endpointFailureCount: number | null;
  } | null> {
    const results = await this.tx
      .select({
        id: aiAnalysisSessions.id,
        analyzedAt: aiAnalysisSessions.analyzedAt,
        nextAnalysisAt: aiAnalysisSessions.nextAnalysisAt,
        endpointFailureCount: aiAnalysisSessions.endpointFailureCount,
      })
      .from(aiAnalysisSessions)
      .where(eq(aiAnalysisSessions.endpointId, endpointId))
      .orderBy(desc(aiAnalysisSessions.analyzedAt))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return {
      id: results[0].id,
      analyzedAt: results[0].analyzedAt,
      nextAnalysisAt: results[0].nextAnalysisAt,
      endpointFailureCount: results[0].endpointFailureCount,
    };
  }

  async getRecentSessions(
    endpointId: string,
    limit = 10,
    offset = 0,
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
      .limit(Math.min(limit, 100)) // Cap at 100 for safety
      .offset(offset);

    return results.map(r => ({
      id: r.id,
      analyzedAt: r.analyzedAt,
      toolCalls: r.toolCalls ?? [],
      reasoning: r.reasoning ?? "",
      tokenUsage: r.tokenUsage,
      durationMs: r.durationMs,
    }));
  }

  async getTotalSessionCount(endpointId: string): Promise<number> {
    const result = await this.tx
      .select({
        count: count(),
      })
      .from(aiAnalysisSessions)
      .where(eq(aiAnalysisSessions.endpointId, endpointId));

    return Number(result[0]?.count ?? 0);
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
    endpointLimit?: number;
    granularity?: "hour" | "day";
  }): Promise<Array<{
    date: string;
    endpointId: string;
    endpointName: string;
    sessionCount: number;
    totalTokens: number;
  }>> {
    const conditions = [
      eq(jobs.userId, filters.userId),
      ne(jobs.status, "archived"), // Exclude archived jobs
      isNull(jobEndpoints.archivedAt), // Exclude archived endpoints
    ];

    if (filters.sinceDate) {
      conditions.push(gte(aiAnalysisSessions.analyzedAt, filters.sinceDate));
    }
    if (filters.jobId) {
      conditions.push(eq(jobs.id, filters.jobId));
    }

    // If endpointLimit is specified, first find top N endpoints by session count
    let topEndpointIds: string[] | undefined;
    if (filters.endpointLimit !== undefined) {
      const topEndpoints = await this.tx
        .select({
          endpointId: jobEndpoints.id,
          totalSessions: count(),
        })
        .from(aiAnalysisSessions)
        .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
        .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
        .where(and(...conditions))
        .groupBy(jobEndpoints.id)
        .orderBy(desc(count()))
        .limit(filters.endpointLimit);

      topEndpointIds = topEndpoints.map(e => e.endpointId);

      // If no endpoints found, return empty array
      if (topEndpointIds.length === 0) {
        return [];
      }
    }

    // Add endpoint filter if we have top endpoint IDs
    const timeSeriesConditions = [...conditions];
    if (topEndpointIds) {
      timeSeriesConditions.push(inArray(jobEndpoints.id, topEndpointIds));
    }

    // Use hourly or daily granularity based on filter
    const granularity = filters.granularity ?? "day";
    const dateExpression = granularity === "hour"
      ? sql<string>`TO_CHAR(DATE_TRUNC('hour', ${aiAnalysisSessions.analyzedAt}), 'YYYY-MM-DD HH24:00:00')`
      : sql<string>`DATE(${aiAnalysisSessions.analyzedAt})`;

    const results = await this.tx
      .select({
        date: dateExpression,
        endpointId: jobEndpoints.id,
        endpointName: jobEndpoints.name,
        sessionCount: count(),
        totalTokens: sum(aiAnalysisSessions.tokenUsage),
      })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
      .where(and(...timeSeriesConditions))
      .groupBy(dateExpression, jobEndpoints.id, jobEndpoints.name)
      .orderBy(dateExpression);

    return results.map(row => ({
      date: row.date,
      endpointId: row.endpointId,
      endpointName: row.endpointName,
      sessionCount: Number(row.sessionCount),
      totalTokens: row.totalTokens ? Number(row.totalTokens) : 0,
    }));
  }

  // ============================================================================
  // Job Activity Timeline
  // ============================================================================

  async getJobSessions(filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    sessions: Array<{
      sessionId: string;
      endpointId: string;
      endpointName: string;
      analyzedAt: Date;
      reasoning: string;
      toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
      tokenUsage: number | null;
      durationMs: number | null;
    }>;
    total: number;
  }> {
    const conditions = [
      eq(jobs.userId, filters.userId),
      ne(jobs.status, "archived"),
      isNull(jobEndpoints.archivedAt),
    ];

    // Only filter by jobId if provided
    if (filters.jobId) {
      conditions.push(eq(jobs.id, filters.jobId));
    }

    if (filters.sinceDate) {
      conditions.push(gte(aiAnalysisSessions.analyzedAt, filters.sinceDate));
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    // Get sessions with endpoint info
    const rows = await this.tx
      .select({
        sessionId: aiAnalysisSessions.id,
        endpointId: aiAnalysisSessions.endpointId,
        endpointName: jobEndpoints.name,
        analyzedAt: aiAnalysisSessions.analyzedAt,
        reasoning: aiAnalysisSessions.reasoning,
        toolCalls: aiAnalysisSessions.toolCalls,
        tokenUsage: aiAnalysisSessions.tokenUsage,
        durationMs: aiAnalysisSessions.durationMs,
      })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
      .where(and(...conditions))
      .orderBy(desc(aiAnalysisSessions.analyzedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await this.tx
      .select({ count: count() })
      .from(aiAnalysisSessions)
      .innerJoin(jobEndpoints, eq(aiAnalysisSessions.endpointId, jobEndpoints.id))
      .innerJoin(jobs, eq(jobEndpoints.jobId, jobs.id))
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    return {
      sessions: rows.map(row => ({
        sessionId: row.sessionId,
        endpointId: row.endpointId,
        endpointName: row.endpointName,
        analyzedAt: row.analyzedAt,
        reasoning: row.reasoning ?? "",
        toolCalls: row.toolCalls ?? [],
        tokenUsage: row.tokenUsage,
        durationMs: row.durationMs,
      })),
      total,
    };
  }
}
