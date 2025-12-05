import type { HealthSummary, JsonValue, MultiWindowHealth, RunsRepo } from "../index.js";

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

  async getHealthSummaryMultiWindow(endpointId: string, now: Date): Promise<MultiWindowHealth> {
    const hour1Since = now.getTime() - 1 * 60 * 60 * 1000;
    const hour4Since = now.getTime() - 4 * 60 * 60 * 1000;
    const hour24Since = now.getTime() - 24 * 60 * 60 * 1000;

    // Get all runs in 24h window
    const allRuns = this.runs
      .filter(r => r.endpointId === endpointId && r.startedAt >= hour24Since)
      .sort((a, b) => b.startedAt - a.startedAt);

    // Partition by window
    const hour1Runs = allRuns.filter(r => r.startedAt >= hour1Since);
    const hour4Runs = allRuns.filter(r => r.startedAt >= hour4Since);
    const hour24Runs = allRuns;

    const calcWindowStats = (windowRuns: typeof allRuns) => {
      const successCount = windowRuns.filter(r => r.status === "success").length;
      const failureCount = windowRuns.filter(r => r.status === "failed").length;
      const total = successCount + failureCount;
      const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
      return { successCount, failureCount, successRate };
    };

    const durations = hour24Runs
      .map(r => r.durationMs)
      .filter((d): d is number => d !== undefined);
    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

    let failureStreak = 0;
    for (const run of allRuns) {
      if (run.status === "failed") {
        failureStreak++;
      }
      else {
        break;
      }
    }

    return {
      hour1: calcWindowStats(hour1Runs),
      hour4: calcWindowStats(hour4Runs),
      hour24: calcWindowStats(hour24Runs),
      avgDurationMs,
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
    offset?: number,
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
    const offsetValue = offset ?? 0;
    const limited = sorted.slice(offsetValue, offsetValue + clampedLimit);

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

  // ============================================================================
  // Dashboard Aggregation Methods (Phase 3)
  // ============================================================================

  async getJobHealthDistribution(_userId: string): Promise<Array<{
    jobId: string;
    jobName: string;
    successCount: number;
    failureCount: number;
  }>> {
    // Stub implementation for in-memory repo
    // Real implementation is in DrizzleRunsRepo with SQL aggregation
    return [];
  }

  async getFilteredMetrics(_filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }): Promise<{
    totalRuns: number;
    successCount: number;
    failureCount: number;
    avgDurationMs: number | null;
  }> {
    // Stub implementation for in-memory repo
    return {
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: null,
    };
  }

  async getSourceDistribution(_filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }): Promise<Array<{
    source: string;
    count: number;
  }>> {
    // Stub implementation for in-memory repo
    return [];
  }

  async getRunTimeSeries(_filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }): Promise<Array<{
    date: string;
    success: number;
    failure: number;
  }>> {
    // Stub implementation for in-memory repo
    return [];
  }

  async getEndpointTimeSeries(_filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
    endpointLimit?: number;
  }): Promise<Array<{
    date: string;
    endpointId: string;
    endpointName: string;
    success: number;
    failure: number;
  }>> {
    // Stub implementation for in-memory repo
    return [];
  }

  async getJobRuns(_filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    runs: Array<{
      runId: string;
      endpointId: string;
      endpointName: string;
      status: string;
      startedAt: Date;
      finishedAt?: Date;
      durationMs?: number;
      source?: string;
    }>;
    total: number;
  }> {
    // Stub implementation for in-memory repo
    // Real implementation is in DrizzleRunsRepo with SQL joins
    return { runs: [], total: 0 };
  }
}
