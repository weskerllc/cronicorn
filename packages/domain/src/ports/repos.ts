/**
 * Repository ports for job and run persistence.
 */

import type { ExecutionResult, JobEndpoint } from "../entities/index.js";

export type JobsRepo = {
  add: (ep: JobEndpoint) => void;

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
};

export type RunsRepo = {
  create: (run: {
    endpointId: string;
    status: "running";
    attempt: number;
  }) => Promise<string>;

  finish: (runId: string, patch: {
    status: "success" | "failed" | "canceled";
    durationMs: number;
    err?: unknown;
  }) => Promise<void>;
};
