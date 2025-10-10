import type { JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

/**
 * Adapter-local storage type with internal locking state.
 *
 * The _lockedUntil field is an implementation detail for pessimistic locking
 * and is NOT part of the domain model. It's stripped when returning JobEndpoint
 * through the port interface.
 */
type StoredJob = JobEndpoint & {
  _lockedUntil?: Date;
};

export class InMemoryJobsRepo implements JobsRepo {
  private map = new Map<string, StoredJob>();
  constructor(private now: () => Date) { } // <-- inject clock

  add(ep: JobEndpoint) { this.map.set(ep.id, ep); }

  async claimDueEndpoints(limit: number, withinMs: number) {
    const now = this.now();
    const nowMs = now.getTime();
    const horizonMs = nowMs + withinMs;

    // Claim endpoints that are due now or will be due within the horizon
    const due = [...this.map.values()]
      .filter(e =>
        e.nextRunAt.getTime() <= horizonMs
        && (!e.pausedUntil || e.pausedUntil.getTime() <= nowMs)
        && (!e._lockedUntil || e._lockedUntil.getTime() <= nowMs),
      )
      .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
      .slice(0, limit);

    // Lock for the duration of the horizon to prevent double-claiming
    const lockUntil = new Date(horizonMs);
    due.forEach((d) => {
      d._lockedUntil = lockUntil;
    });
    return due.map(d => d.id);
  }

  async setNextRunAtIfEarlier(id: string, when: Date) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`setNextRunAtIfEarlier: not found: ${id}`);
    const now = this.now();

    if (e.pausedUntil && e.pausedUntil > now)
      return;

    const minAt = e.minIntervalMs ? new Date(now.getTime() + e.minIntervalMs) : undefined;
    const maxAt = e.maxIntervalMs ? new Date(now.getTime() + e.maxIntervalMs) : undefined;

    let candidate = when;
    if (minAt && candidate < minAt)
      candidate = minAt;
    if (maxAt && candidate > maxAt)
      candidate = maxAt;

    if (candidate < e.nextRunAt) {
      // (optional) debug:
      // console.log(`[nudge] ${id}: before=${e.nextRunAt.toISOString()} candidate=${candidate.toISOString()} now=${now.toISOString()}`);
      e.nextRunAt = candidate;
    }
    else {
      // (optional) debug:
      // console.log(`[nudge-skip] ${id}: before=${e.nextRunAt.toISOString()} candidate=${candidate.toISOString()} now=${now.toISOString()}`);
    }
  }

  async getEndpoint(id: string) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.getEndpoint: not found: ${id}`);
    // structuredClone preserves Date objects and other types
    return structuredClone(e);
  }

  async setLock(id: string, until: Date) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.setLock: not found: ${id}`);
    e._lockedUntil = until;
  }

  async clearLock(id: string) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.clearLock: not found: ${id}`);
    e._lockedUntil = undefined;
  }

  async updateAfterRun(id: string, p: {
    lastRunAt: Date;
    nextRunAt: Date;
    status: { status: "success" | "failed" | "canceled"; durationMs: number };
    failureCountPolicy: "increment" | "reset";
    clearExpiredHints: boolean;
  }) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.updateAfterRun: not found: ${id}`);
    e.lastRunAt = p.lastRunAt;
    e.nextRunAt = p.nextRunAt;

    // Apply failure count policy
    if (p.failureCountPolicy === "increment") {
      e.failureCount = e.failureCount + 1;
    }
    else if (p.failureCountPolicy === "reset") {
      e.failureCount = 0;
    }

    e._lockedUntil = undefined;

    // Clear hints based on current time (now), not lastRunAt
    // This ensures hints that expire between runs are cleared immediately
    const now = this.now();
    if (p.clearExpiredHints && e.aiHintExpiresAt && e.aiHintExpiresAt <= now) {
      e.aiHintNextRunAt = undefined;
      e.aiHintIntervalMs = undefined;
      e.aiHintExpiresAt = undefined;
      e.aiHintReason = undefined;
    }
  }

  async writeAIHint(id: string, h: { nextRunAt?: Date; intervalMs?: number; expiresAt: Date; reason?: string }) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.writeAIHint: not found: ${id}`);
    e.aiHintNextRunAt = h.nextRunAt;
    e.aiHintIntervalMs = h.intervalMs;
    e.aiHintExpiresAt = h.expiresAt;
    e.aiHintReason = h.reason;
  }

  async setPausedUntil(id: string, until: Date | null) {
    const e = this.map.get(id);
    if (!e)
      throw new Error(`JobsRepo.setPausedUntil: not found: ${id}`);
    e.pausedUntil = until ?? undefined;
  }
}

type Run = {
  id: string;
  endpointId: string;
  status: "running" | "success" | "failed" | "canceled";
  attempt: number;
  startedAt: number;
  durationMs?: number;
  err?: unknown;
};

export class InMemoryRunsRepo implements RunsRepo {
  private seq = 0;
  runs: Run[] = [];

  async create(r: { endpointId: string; status: "running"; attempt: number }) {
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
}
