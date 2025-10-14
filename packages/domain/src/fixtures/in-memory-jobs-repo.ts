import type { Job, JobEndpoint, JobsRepo } from "../index.js";

/**
 * Adapter-local storage type with internal locking state and job relationship.
 *
 * The _lockedUntil field is an implementation detail for pessimistic locking
 * and is NOT part of the domain model. It's stripped when returning JobEndpoint
 * through the port interface.
 *
 * The jobId field tracks Phase 3 endpoint-to-job relationships.
 */
type StoredJob = JobEndpoint & {
  _lockedUntil?: Date;
  jobId?: string;
};

export class InMemoryJobsRepo implements JobsRepo {
  private map = new Map<string, StoredJob>();
  private jobs = new Map<string, Job>(); // Phase 3: Store Job entities
  private jobSeq = 0; // For generating job IDs

  constructor(private now: () => Date) { } // <-- inject clock

  // Phase 3: Job lifecycle operations
  async createJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job> {
    const now = this.now();
    const newJob: Job = {
      ...job,
      id: `job_${this.jobSeq++}`,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(newJob.id, newJob);
    return structuredClone(newJob);
  }

  async getJob(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job ? structuredClone(job) : null;
  }

  async listJobs(userId: string, filters?: { status?: "active" | "archived" }): Promise<Array<Job & { endpointCount: number }>> {
    const userJobs = [...this.jobs.values()]
      .filter(j => j.userId === userId)
      .filter(j => !filters?.status || j.status === filters.status);

    return userJobs.map((j) => {
      const endpointCount = [...this.map.values()].filter((ep) => {
        return ep.jobId === j.id;
      }).length;
      return { ...structuredClone(j), endpointCount };
    });
  }

  async updateJob(id: string, patch: { name?: string; description?: string }): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job)
      throw new Error(`Job not found: ${id}`);

    const updated: Job = {
      ...job,
      ...patch,
      updatedAt: this.now(),
    };
    this.jobs.set(id, updated);
    return structuredClone(updated);
  }

  async archiveJob(id: string): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job)
      throw new Error(`Job not found: ${id}`);

    const archived: Job = {
      ...job,
      status: "archived",
      archivedAt: this.now(),
      updatedAt: this.now(),
    };
    this.jobs.set(id, archived);
    return structuredClone(archived);
  }

  // Endpoint operations (existing)
  async add(ep: JobEndpoint) { this.map.set(ep.id, ep); }

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
      e.nextRunAt = candidate;
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

  // Phase 3: Endpoint relationship operations
  async listEndpointsByJob(jobId: string): Promise<JobEndpoint[]> {
    return [...this.map.values()]
      .filter(ep => ep.jobId === jobId)
      .map(ep => structuredClone(ep));
  }
}
