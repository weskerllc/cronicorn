import type { RunsRepo } from "../index.js";

type Run = {
  id: string;
  endpointId: string;
  status: "running" | "success" | "failed" | "canceled";
  attempt: number;
  startedAt: number;
  durationMs?: number;
  err?: unknown;
  source?: string; // Phase 3: Track what triggered this run
};

export class InMemoryRunsRepo implements RunsRepo {
  private seq = 0;
  runs: Run[] = [];

  async create(r: { endpointId: string; status: "running"; attempt: number; source?: string }) {
    const id = `run_${this.seq++}`;
    this.runs.push({ id, ...r, startedAt: Date.now() });
    return id;
  }

  async finish(id: string, patch: { status: "success" | "failed" | "canceled"; durationMs: number; err?: unknown }) {
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
  }): Promise<Array<{
    runId: string;
    endpointId: string;
    startedAt: Date;
    status: string;
    durationMs?: number;
    source?: string;
  }>> {
    let filtered = this.runs;

    if (filters.endpointId) {
      filtered = filtered.filter(r => r.endpointId === filters.endpointId);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Sort by most recent first
    filtered = filtered.sort((a, b) => b.startedAt - a.startedAt);

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered.map(r => ({
      runId: r.id,
      endpointId: r.endpointId,
      startedAt: new Date(r.startedAt),
      status: r.status,
      durationMs: r.durationMs,
      source: r.source,
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
    };
  }
}
