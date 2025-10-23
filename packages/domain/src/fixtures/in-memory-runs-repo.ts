import type { HealthSummary, JsonValue, RunsRepo } from "../index.js";

type Run = {
  id: string;
  endpointId: string;
  status: "running" | "success" | "failed" | "canceled";
  attempt: number;
  startedAt: number;
  durationMs?: number;
  err?: unknown;
  source?: string; // Phase 3: Track what triggered this run
  responseBody?: JsonValue;
  statusCode?: number;
};

export class InMemoryRunsRepo implements RunsRepo {
  private seq = 0;
  runs: Run[] = [];

  async create(r: { endpointId: string; status: "running"; attempt: number; source?: string }) {
    const id = `run_${this.seq++}`;
    this.runs.push({ id, ...r, startedAt: Date.now() });
    return id;
  }

  async finish(id: string, patch: { status: "success" | "failed" | "canceled"; durationMs: number; err?: unknown; responseBody?: JsonValue; statusCode?: number }) {
    const run = this.runs.find(r => r.id === id);
    if (!run)
      throw new Error(`Run not found: ${id}`);
    Object.assign(run, patch);
  }

  // Phase 3: Execution visibility operations
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
    let filtered = this.runs;

    if (filters.endpointId) {
      filtered = filtered.filter(r => r.endpointId === filters.endpointId);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Sort by most recent first
    filtered = filtered.sort((a, b) => b.startedAt - a.startedAt);

    const total = filtered.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? total;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      runs: paginated.map(r => ({
        runId: r.id,
        endpointId: r.endpointId,
        startedAt: new Date(r.startedAt),
        status: r.status,
        durationMs: r.durationMs,
        source: r.source,
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
    source?: string;
    attempt: number;
  } | null> {
    const run = this.runs.find(r => r.id === runId);
    if (!run)
      return null;

    return {
      id: run.id,
      endpointId: run.endpointId,
      status: run.status,
      startedAt: new Date(run.startedAt),
      finishedAt: run.durationMs ? new Date(run.startedAt + run.durationMs) : undefined,
      durationMs: run.durationMs,
      errorMessage: run.err ? String(run.err) : undefined,
      source: run.source,
      attempt: run.attempt,
    };
  }

  async getHealthSummary(endpointId: string, since: Date): Promise<HealthSummary> {
    const sinceMs = since.getTime();
    const filtered = this.runs.filter(r =>
      r.endpointId === endpointId && r.startedAt >= sinceMs,
    );

    const successCount = filtered.filter(r => r.status === "success").length;
    const failureCount = filtered.filter(r => r.status === "failed").length;

    const durations = filtered
      .map(r => r.durationMs)
      .filter((d): d is number => d !== undefined);
    const avgDurationMs = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null;

    // Get last run
    const sorted = [...filtered].sort((a, b) => b.startedAt - a.startedAt);
    const lastRun = sorted[0]
      ? { status: sorted[0].status, at: new Date(sorted[0].startedAt) }
      : null;

    // Calculate failure streak
    let failureStreak = 0;
    for (const run of sorted) {
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
    const sinceMs = since.getTime();
    const endpointIds = new Set<string>();

    for (const run of this.runs) {
      if (run.startedAt >= sinceMs) {
        endpointIds.add(run.endpointId);
      }
    }

    return Array.from(endpointIds);
  }

  // ============================================================================
  // AI Query Tools: Response Data Retrieval
  // ============================================================================

  async getLatestResponse(endpointId: string): Promise<{
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  } | null> {
    const filtered = this.runs.filter(r => r.endpointId === endpointId);
    if (filtered.length === 0) {
      return null;
    }

    // Sort by most recent first
    const sorted = filtered.sort((a, b) => b.startedAt - a.startedAt);
    const latest = sorted[0];

    return {
      responseBody: latest.responseBody ?? null,
      timestamp: new Date(latest.startedAt),
      status: latest.status,
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
    // Filter to endpoint and only finished runs (those with durationMs)
    const filtered = this.runs.filter(r =>
      r.endpointId === endpointId && r.durationMs !== undefined,
    );

    // Sort by most recent first
    const sorted = filtered.sort((a, b) => b.startedAt - a.startedAt);

    // Clamp limit to max 50
    const clampedLimit = Math.min(limit, 50);
    const limited = sorted.slice(0, clampedLimit);

    return limited.map(r => ({
      responseBody: r.responseBody ?? null,
      timestamp: new Date(r.startedAt),
      status: r.status,
      durationMs: r.durationMs!, // Safe because we filtered out undefined
    }));
  }

  async getSiblingLatestResponses(
    _jobId: string,
    _excludeEndpointId: string,
  ): Promise<Array<{
    endpointId: string;
    endpointName: string;
    responseBody: JsonValue | null;
    timestamp: Date;
    status: string;
  }>> {
    // In-memory implementation doesn't have job/endpoint relationships
    // So we'll return empty array. This is fine for unit tests that mock this.
    // Integration tests use DrizzleRunsRepo which has full implementation.
    return [];
  }

  async cleanupZombieRuns(olderThanMs: number): Promise<number> {
    const threshold = Date.now() - olderThanMs;
    const zombies = this.runs.filter(r => r.status === "running" && r.startedAt <= threshold);

    for (const zombie of zombies) {
      zombie.status = "failed";
      zombie.err = `Cleaned up zombie run (started at ${new Date(zombie.startedAt).toISOString()}, older than ${olderThanMs}ms)`;
      zombie.durationMs = Date.now() - zombie.startedAt;
    }

    return zombies.length;
  }
}
