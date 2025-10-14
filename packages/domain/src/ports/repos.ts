/**
 * Repository ports for job and run persistence.
 */

import type { ExecutionResult, Job, JobEndpoint } from "../entities/index.js";

export type JobsRepo = {
  // Job lifecycle operations (Phase 3)
  createJob: (job: Omit<Job, "id" | "createdAt" | "updatedAt">) => Promise<Job>;
  getJob: (id: string) => Promise<Job | null>;
  listJobs: (userId: string, filters?: { status?: "active" | "archived" }) => Promise<Array<Job & { endpointCount: number }>>;
  updateJob: (id: string, patch: { name?: string; description?: string }) => Promise<Job>;
  archiveJob: (id: string) => Promise<Job>;

  // Endpoint operations (existing + Phase 3 extensions)
  add: (ep: JobEndpoint) => Promise<void>;

  /**
   * Claims due endpoints for execution.
   *
   * **Guarantees**:
   * - Returns endpoint IDs where nextRunAt <= now + withinMs
   * - Atomically extends lockedUntil to prevent double-claiming
   * - Respects pausedUntil (skips paused endpoints)
   * - Idempotent: calling twice returns non-overlapping sets
   * - Thread-safe: implementations must use pessimistic locking
   *
   * **Implementation Notes**:
   * - SQL: Use `FOR UPDATE SKIP LOCKED` or equivalent
   * - Memory: Track _lockedUntil per endpoint (adapter-local)
   * - Distributed: Use advisory locks or lease tables
   *
   * @param limit Maximum number of endpoints to claim
   * @param withinMs Time horizon in milliseconds (claims jobs due within this window)
   * @returns Array of claimed endpoint IDs
   */
  claimDueEndpoints: (limit: number, withinMs: number) => Promise<string[]>;
  getEndpoint: (id: string) => Promise<JobEndpoint>;

  // Locking (transitional - may be refactored)
  // Current: Simple pessimistic locks to prevent duplicate execution in distributed workers.
  // Future: Consider replacing with lease-based mechanism (TTL-based claims with heartbeat renewal)
  // or optimistic concurrency (version checks) for better scalability and failure handling.
  // See ADR for leasing redesign when DB adapter lands.
  setLock: (id: string, until: Date) => Promise<void>;
  clearLock: (id: string) => Promise<void>;

  // AI steering
  setNextRunAtIfEarlier: (id: string, when: Date) => Promise<void>;
  writeAIHint: (id: string, hint: {
    nextRunAt?: Date;
    intervalMs?: number;
    expiresAt: Date;
    reason?: string;
  }) => Promise<void>;
  setPausedUntil: (id: string, until: Date | null) => Promise<void>;

  // Post-run update
  updateAfterRun: (id: string, patch: {
    lastRunAt: Date;
    nextRunAt: Date;
    status: ExecutionResult;
    failureCountPolicy: "increment" | "reset";
    clearExpiredHints: boolean;
  }) => Promise<void>;

  // Endpoint relationship operations (Phase 3)
  listEndpointsByJob: (jobId: string) => Promise<JobEndpoint[]>;
  deleteEndpoint: (id: string) => Promise<void>;
};

export type RunsRepo = {
  create: (run: {
    endpointId: string;
    status: "running";
    attempt: number;
    source?: string; // Phase 3: Track what triggered this run (baseline, AI hint, manual, etc.)
  }) => Promise<string>;

  finish: (runId: string, patch: {
    status: "success" | "failed" | "canceled";
    durationMs: number;
    err?: unknown;
  }) => Promise<void>;

  // Execution visibility operations (Phase 3)
  listRuns: (filters: {
    userId: string;
    jobId?: string;
    endpointId?: string;
    status?: "success" | "failed";
    limit?: number;
  }) => Promise<Array<{
    runId: string;
    endpointId: string;
    startedAt: Date;
    status: string;
    durationMs?: number;
    source?: string;
  }>>;

  getRunDetails: (runId: string) => Promise<{
    id: string;
    endpointId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string;
    source?: string;
  } | null>;
};
