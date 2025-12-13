/**
 * Repository ports for job and run persistence.
 */

import type { ExecutionResult, Job, JobEndpoint, JsonValue } from "../entities/index.js";

/**
 * Health summary for an endpoint over a time window.
 * Used by summarizeEndpointHealth action.
 */
export type HealthSummary = {
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
  lastRun: { status: string; at: Date } | null;
  failureStreak: number; // consecutive failures from most recent
};

/**
 * Compact health summary for a single time window.
 * Used by multi-window health display.
 */
export type WindowHealth = {
  successCount: number;
  failureCount: number;
  successRate: number; // 0-100 percentage
};

/**
 * Multi-window health summary for AI analysis.
 * Shows health across 1h, 4h, and 24h windows.
 */
export type MultiWindowHealth = {
  hour1: WindowHealth;
  hour4: WindowHealth;
  hour24: WindowHealth;
  avgDurationMs: number | null;
  failureStreak: number;
};

export type JobsRepo = {
  // Job lifecycle operations (Phase 3)
  createJob: (job: Omit<Job, "id" | "createdAt" | "updatedAt">) => Promise<Job>;
  getJob: (id: string) => Promise<Job | null>;
  listJobs: (userId: string, filters?: { status?: "active" | "paused" | "archived" }) => Promise<Array<Job & { endpointCount: number }>>;
  updateJob: (id: string, patch: { name?: string; description?: string }) => Promise<Job>;
  archiveJob: (id: string) => Promise<Job>;
  pauseJob: (id: string) => Promise<Job>;
  resumeJob: (id: string) => Promise<Job>;

  // Endpoint operations (existing + Phase 3 extensions)
  addEndpoint: (ep: JobEndpoint) => Promise<void>;
  updateEndpoint: (id: string, patch: Partial<Omit<JobEndpoint, "id" | "tenantId">>) => Promise<JobEndpoint>;

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
  clearAIHints: (id: string) => Promise<void>;
  resetFailureCount: (id: string) => Promise<void>;

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
  archiveEndpoint: (id: string) => Promise<JobEndpoint>;

  /**
   * Count total endpoints for a user across all jobs.
   * Used for enforcing tier-based endpoint limits.
   *
   * @param userId - The user/tenant ID
   * @returns Total number of endpoints owned by this user
   */
  countEndpointsByUser: (userId: string) => Promise<number>;

  /**
   * Get endpoint counts by status for dashboard statistics.
   * Optimized single-query aggregation instead of fetching all endpoints.
   *
   * @param userId - The user/tenant ID
   * @param now - Current timestamp for paused check
   * @returns Endpoint counts (total, active, paused)
   */
  getEndpointCounts: (userId: string, now: Date) => Promise<{
    total: number;
    active: number;
    paused: number;
  }>;

  /**
   * Get user's tier for quota enforcement.
   * Returns tier level ("free" | "pro" | "enterprise") for the given user ID.
   */
  getUserTier: (userId: string) => Promise<"free" | "pro" | "enterprise">;

  /**
   * Get user by ID for subscription operations.
   *
   * @param userId - User ID
   * @returns User details including email and Stripe customer ID
   */
  getUserById: (userId: string) => Promise<{
    id: string;
    email: string;
    tier: "free" | "pro" | "enterprise";
    stripeCustomerId: string | null;
  } | null>;

  /**
   * Get user by Stripe customer ID (for webhook lookups).
   *
   * @param customerId - Stripe customer ID
   * @returns User ID and email if found
   */
  getUserByStripeCustomerId: (customerId: string) => Promise<{
    id: string;
    email: string;
  } | null>;

  /**
   * Update user's subscription details (called by webhook handler).
   *
   * This method is idempotent - safe to call multiple times with same data.
   *
   * @param userId - User ID
   * @param patch - Fields to update
   */
  updateUserSubscription: (userId: string, patch: {
    tier?: "free" | "pro" | "enterprise";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date | null;
  }) => Promise<void>;

  /**
   * Get usage statistics for a user.
   *
   * @param userId - User ID
   * @param since - Start date for usage calculation (typically start of current month)
   * @returns Current usage vs limits for AI calls and endpoints
   */
  getUsage: (userId: string, since: Date) => Promise<{
    aiCallsUsed: number;
    aiCallsLimit: number;
    endpointsUsed: number;
    endpointsLimit: number;
    totalRuns: number;
    totalRunsLimit: number;
  }>;
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
    statusCode?: number;
    responseBody?: JsonValue;
  }) => Promise<void>;

  // Execution visibility operations (Phase 3)
  listRuns: (filters: {
    userId: string;
    jobId?: string;
    endpointId?: string;
    status?: "success" | "failed";
    source?: string;
    sinceDate?: Date;
    limit?: number;
    offset?: number;
  }) => Promise<{
    runs: Array<{
      runId: string;
      endpointId: string;
      startedAt: Date;
      status: string;
      durationMs?: number;
      source?: string;
    }>;
    total: number;
  }>;

  getRunDetails: (runId: string) => Promise<{
    id: string;
    endpointId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string;
    responseBody?: JsonValue;
    source?: string;
    attempt: number;
  } | null>;

  /**
   * Get aggregated job health distribution.
   * Returns success/failure counts grouped by job, optionally filtered by time range.
   *
   * @param userId - The user ID
   * @param filters - Optional filter criteria
   * @param filters.sinceDate - Only count runs since this date (optional)
   * @returns Array of jobs with run counts
   */
  getJobHealthDistribution: (userId: string, filters?: {
    sinceDate?: Date;
  }) => Promise<Array<{
    jobId: string;
    jobName: string;
    successCount: number;
    failureCount: number;
  }>>;

  /**
   * Get aggregated metrics for filtered runs.
   *
   * @param filters - Filter criteria
   * @returns Aggregated run metrics
   */
  getFilteredMetrics: (filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }) => Promise<{
    totalRuns: number;
    successCount: number;
    failureCount: number;
    avgDurationMs: number | null;
  }>;

  /**
   * Get distribution of runs by scheduling source.
   *
   * @param filters - Filter criteria
   * @returns Array of sources with counts
   */
  getSourceDistribution: (filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }) => Promise<Array<{
    source: string;
    count: number;
  }>>;

  /**
   * Get time-series data for run activity (aggregated by SQL).
   *
   * @param filters - Filter criteria including date range
   * @returns Array of daily run counts by status
   */
  getRunTimeSeries: (filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
  }) => Promise<Array<{
    date: string; // YYYY-MM-DD
    success: number;
    failure: number;
  }>>;

  /**
   * Get time-series of run activity by endpoint.
   *
   * @param filters - Filter criteria including date range and optional job/source filters
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by run count DESC)
   * @returns Array of daily run counts by status per endpoint
   */
  getEndpointTimeSeries: (filters: {
    userId: string;
    jobId?: string;
    source?: string;
    sinceDate?: Date;
    endpointLimit?: number;
  }) => Promise<Array<{
    date: string; // YYYY-MM-DD
    endpointId: string;
    endpointName: string;
    success: number;
    failure: number;
    totalDurationMs: number;
  }>>;

  /**
   * Get health summary for an endpoint over a time window.
   *
   * @param endpointId - The endpoint to summarize
   * @param since - Only include runs starting after this date
   * @returns Aggregated health metrics
   */
  getHealthSummary: (endpointId: string, since: Date) => Promise<HealthSummary>;

  /**
   * Get health summary across multiple time windows (1h, 4h, 24h).
   * Used by AI Planner to show accurate recovery detection.
   *
   * @param endpointId - The endpoint to summarize
   * @param now - Current time reference for calculating windows
   * @returns Health metrics for each time window
   */
  getHealthSummaryMultiWindow: (endpointId: string, now: Date) => Promise<MultiWindowHealth>;

  /**
   * Get unique endpoint IDs that have runs after the specified timestamp.
   * Used by AI Planner to discover endpoints needing analysis.
   *
   * @param since - Only include endpoints with runs starting after this date
   * @returns Array of unique endpoint IDs with recent activity
   */
  getEndpointsWithRecentRuns: (since: Date) => Promise<string[]>;

  /**
   * Get the latest response data from an endpoint execution.
   * Used by AI query tool: get_latest_response
   *
   * @param endpointId - The endpoint to query
   * @returns Latest response data or null if no runs exist
   */
  getLatestResponse: (endpointId: string) => Promise<{
    responseBody: import("../entities/index.js").JsonValue | null;
    timestamp: Date;
    status: string;
  } | null>;

  /**
   * Get recent response history for trend analysis.
   * Used by AI query tool: get_response_history
   *
   * @param endpointId - The endpoint to query
   * @param limit - Maximum number of responses (max 50)
   * @param offset - Number of responses to skip (0 = most recent)
   * @returns Array of recent responses, ordered newest to oldest
   */
  getResponseHistory: (endpointId: string, limit: number, offset?: number) => Promise<Array<{
    responseBody: import("../entities/index.js").JsonValue | null;
    timestamp: Date;
    status: string;
    durationMs: number;
  }>>;

  /**
   * Get latest responses from all sibling endpoints in the same job.
   * Used by AI query tool: get_sibling_latest_responses
   *
   * @param jobId - The job containing the endpoints
   * @param excludeEndpointId - Exclude this endpoint (current one being analyzed)
   * @returns Array of sibling endpoint latest responses
   */
  getSiblingLatestResponses: (jobId: string, excludeEndpointId: string) => Promise<Array<{
    endpointId: string;
    endpointName: string;
    responseBody: import("../entities/index.js").JsonValue | null;
    timestamp: Date;
    status: string;
  }>>;

  /**
   * Clean up zombie runs (stuck in "running" state).
   *
   * Finds runs older than threshold and marks them as failed.
   * Used by background cleanup task to handle worker crashes.
   *
   * @param olderThanMs - Mark runs as failed if running longer than this (milliseconds)
   * @returns Number of runs cleaned up
   */
  cleanupZombieRuns: (olderThanMs: number) => Promise<number>;

  /**
   * Get recent runs for a job (or all jobs) across all endpoints.
   * Used for the job activity timeline display.
   *
   * @param filters - Filter criteria
   * @param filters.userId - User ID for authorization
   * @param filters.jobId - Optional job ID to filter by (omit for all jobs)
   * @param filters.sinceDate - Optional start date filter
   * @param filters.limit - Maximum runs to return (default: 50)
   * @param filters.offset - Pagination offset
   * @returns Array of runs with endpoint info, ordered by startedAt DESC
   */
  getJobRuns: (filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
    limit?: number;
    offset?: number;
  }) => Promise<{
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
  }>;
};

/**
 * AI Analysis Sessions repository.
 * Tracks AI planner decisions for debugging, cost tracking, and observability.
 */
export type SessionsRepo = {
  /**
   * Create a new AI analysis session record.
   *
   * @param session - Session data from AISessionResult
   * @returns Created session ID
   */
  create: (session: {
    endpointId: string;
    analyzedAt: Date;
    toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
    reasoning: string;
    tokenUsage?: number;
    durationMs?: number;
    nextAnalysisAt?: Date; // AI-scheduled next analysis time
    endpointFailureCount?: number; // Snapshot of failure count at analysis time
  }) => Promise<string>;

  /**
   * Get the last analysis session for an endpoint.
   * Used by AI planner to determine if analysis is due.
   *
   * @param endpointId - The endpoint to query
   * @returns Last session with scheduling info, or null if none exists
   */
  getLastSession: (endpointId: string) => Promise<{
    id: string;
    analyzedAt: Date;
    nextAnalysisAt: Date | null;
    endpointFailureCount: number | null;
  } | null>;

  /**
   * Get total count of analysis sessions for an endpoint.
   *
   * @param endpointId - The endpoint to query
   * @returns Total number of sessions
   */
  getTotalSessionCount: (endpointId: string) => Promise<number>;

  /**
   * Get recent analysis sessions for an endpoint.
   * Useful for debugging AI decision patterns.
   *
   * @param endpointId - The endpoint to query
   * @param limit - Maximum number of sessions to return (default: 10)
   * @returns Array of sessions, ordered newest to oldest
   */
  getRecentSessions: (endpointId: string, limit?: number, offset?: number) => Promise<Array<{
    id: string;
    analyzedAt: Date;
    toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
    reasoning: string;
    tokenUsage: number | null;
    durationMs: number | null;
  }>>;

  /**
   * Get total token usage for an endpoint over a time window.
   * Useful for cost tracking and quota enforcement.
   *
   * @param endpointId - The endpoint to query
   * @param since - Only include sessions after this date
   * @returns Total tokens consumed
   */
  getTotalTokenUsage: (endpointId: string, since: Date) => Promise<number>;

  /**
   * Get time-series of AI analysis sessions by endpoint.
   *
   * @param filters - Filter criteria including date range
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by session count DESC)
   * @returns Array of daily session counts
   */
  getAISessionTimeSeries: (filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
    endpointLimit?: number;
  }) => Promise<Array<{
    date: string; // YYYY-MM-DD
    endpointId: string;
    endpointName: string;
    sessionCount: number;
    totalTokens: number;
  }>>;

  /**
   * Get recent AI analysis sessions for a job (or all jobs) across all endpoints.
   * Used for the job activity timeline display.
   *
   * @param filters - Filter criteria
   * @param filters.userId - User ID for authorization
   * @param filters.jobId - Optional job ID to filter by (omit for all jobs)
   * @param filters.sinceDate - Optional start date filter
   * @param filters.limit - Maximum sessions to return (default: 50)
   * @param filters.offset - Pagination offset
   * @returns Array of sessions with endpoint info, ordered by analyzedAt DESC
   */
  getJobSessions: (filters: {
    userId: string;
    jobId?: string;
    sinceDate?: Date;
    limit?: number;
    offset?: number;
  }) => Promise<{
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
  }>;
};
