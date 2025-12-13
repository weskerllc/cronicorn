import type { Clock, Cron, Job, JobEndpoint, JobsRepo, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { getExecutionLimits } from "@cronicorn/domain";
import { nanoid } from "nanoid";

/**
 * Input for creating a new job (logical grouping).
 */
export type CreateJobInput = {
  name: string;
  description?: string;
};

/**
 * Input for adding an endpoint to a job.
 */
export type AddEndpointInput = {
  name: string;
  jobId: string; // Required: must belong to a job
  description?: string;
  baselineCron?: string;
  baselineIntervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: Record<string, string>;
  bodyJson?: import("@cronicorn/domain").JsonValue;
  timeoutMs?: number;
  maxExecutionTimeMs?: number;
  maxResponseSizeKb?: number;
};

/**
 * Input for updating a job.
 */
export type UpdateJobInput = {
  name?: string;
  description?: string;
};

/**
 * Validation helpers for business rules.
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateCreateJobInput(input: CreateJobInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError("Job name is required");
  }
  if (input.name.length > 255) {
    throw new ValidationError("Job name must be 255 characters or less");
  }
  if (input.description && input.description.length > 1000) {
    throw new ValidationError("Job description must be 1000 characters or less");
  }
}

function validateAddEndpointInput(input: AddEndpointInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError("Endpoint name is required");
  }
  if (input.name.length > 255) {
    throw new ValidationError("Endpoint name must be 255 characters or less");
  }
  if (input.description && input.description.length > 2000) {
    throw new ValidationError("Endpoint description must be 2000 characters or less");
  }

  // Must have exactly one baseline schedule
  const hasCron = Boolean(input.baselineCron);
  const hasInterval = Boolean(input.baselineIntervalMs);

  if (!hasCron && !hasInterval) {
    throw new ValidationError(
      "Endpoint must have either baselineCron or baselineIntervalMs",
    );
  }
  if (hasCron && hasInterval) {
    throw new ValidationError(
      "Endpoint cannot have both baselineCron and baselineIntervalMs",
    );
  }

  // Validate intervals if provided
  if (input.baselineIntervalMs && input.baselineIntervalMs < 1000) {
    throw new ValidationError("Baseline interval must be at least 1000ms (1 second)");
  }
  if (input.minIntervalMs && input.minIntervalMs < 1000) {
    throw new ValidationError("Minimum interval must be at least 1000ms (1 second)");
  }
  if (input.maxIntervalMs && input.maxIntervalMs < input.minIntervalMs!) {
    throw new ValidationError("Maximum interval must be greater than minimum interval");
  }

  // Validate URL
  if (!input.url || input.url.trim().length === 0) {
    throw new ValidationError("Endpoint URL is required");
  }
  try {
    const _url = new URL(input.url);
    void _url; // Use the variable to avoid unused warning
  }
  catch {
    throw new ValidationError("Endpoint URL must be a valid URL");
  }

  // Validate timeout
  if (input.timeoutMs && input.timeoutMs < 0) {
    throw new ValidationError("Timeout must be a positive number");
  }

  // Validate maxExecutionTimeMs
  if (input.maxExecutionTimeMs && (input.maxExecutionTimeMs < 0 || input.maxExecutionTimeMs > 1800000)) {
    throw new ValidationError("Max execution time must be between 0 and 1800000ms (30 minutes)");
  }

  // Validate maxResponseSizeKb
  if (input.maxResponseSizeKb && input.maxResponseSizeKb < 0) {
    throw new ValidationError("Max response size must be a positive number");
  }
}

/**
 * JobsManager handles business logic for job and endpoint operations.
 *
 * **Architecture**:
 * - Depends ONLY on domain ports (JobsRepo, RunsRepo, Clock, Cron)
 * - Zero knowledge of adapters (Drizzle, SystemClock, etc.)
 * - Transaction management happens in composition root (API/worker)
 * - Receives repos already bound to transaction context
 *
 * **Responsibilities**:
 * - Validate business rules
 * - Construct domain entities
 * - Calculate scheduling (nextRunAt)
 * - Orchestrate repository operations
 * - Authorization checks (userId owns resource)
 *
 * **Usage** (in composition root):
 * ```typescript
 * await db.transaction(async (tx) => {
 *   const jobsRepo = new DrizzleJobsRepo(tx);
 *   const runsRepo = new DrizzleRunsRepo(tx);
 *   const clock = new SystemClock();
 *   const cron = new CronParserAdapter();
 *   const manager = new JobsManager(jobsRepo, runsRepo, clock, cron);
 *
 *   const job = await manager.createJob(userId, input);
 * });
 * ```
 */
export class JobsManager {
  constructor(
    private readonly jobsRepo: JobsRepo,
    private readonly runsRepo: RunsRepo,
    private readonly sessionsRepo: SessionsRepo,
    private readonly clock: Clock,
    private readonly cron: Cron,
  ) { }

  // ==================== Job Lifecycle ====================

  /**
   * Create a new job for logical grouping of endpoints.
   *
   * @param userId - The user/tenant ID who owns this job
   * @param input - Job configuration
   * @returns The created Job entity
   */
  async createJob(userId: string, input: CreateJobInput): Promise<Job> {
    validateCreateJobInput(input);

    const job = await this.jobsRepo.createJob({
      userId,
      name: input.name,
      description: input.description,
      status: "active",
    });

    return job;
  }

  /**
   * Get a job by ID.
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @returns The job or null if not found/unauthorized
   */
  async getJob(userId: string, jobId: string): Promise<Job | null> {
    const job = await this.jobsRepo.getJob(jobId);

    // Authorization: user must own the job
    if (!job || job.userId !== userId) {
      return null;
    }

    return job;
  }

  /**
   * List all jobs for a user.
   *
   * @param userId - The user ID
   * @param filters - Optional filters
   * @param filters.status - Filter by job status (active/paused/archived)
   * @returns Array of jobs with endpoint counts
   */
  async listJobs(
    userId: string,
    filters?: { status?: "active" | "paused" | "archived" },
  ): Promise<Array<Job & { endpointCount: number }>> {
    return this.jobsRepo.listJobs(userId, filters);
  }

  /**
   * Update a job's metadata.
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @param input - Fields to update
   * @returns The updated job
   * @throws Error if job not found or user not authorized
   */
  async updateJob(userId: string, jobId: string, input: UpdateJobInput): Promise<Job> {
    // Authorization check
    const existing = await this.getJob(userId, jobId);
    if (!existing) {
      throw new Error("Job not found or unauthorized");
    }

    return this.jobsRepo.updateJob(jobId, input);
  }

  /**
   * Archive a job (soft delete).
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @returns The archived job
   * @throws Error if job not found or user not authorized
   */
  async archiveJob(userId: string, jobId: string): Promise<Job> {
    // Authorization check
    const existing = await this.getJob(userId, jobId);
    if (!existing) {
      throw new Error("Job not found or unauthorized");
    }

    return this.jobsRepo.archiveJob(jobId);
  }

  /**
   * Pause a job (temporarily stop execution).
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @returns The paused job
   * @throws Error if job not found or user not authorized
   */
  async pauseJob(userId: string, jobId: string): Promise<Job> {
    // Authorization check
    const existing = await this.getJob(userId, jobId);
    if (!existing) {
      throw new Error("Job not found or unauthorized");
    }

    return this.jobsRepo.pauseJob(jobId);
  }

  /**
   * Resume a paused job.
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @returns The resumed job
   * @throws Error if job not found or user not authorized
   */
  async resumeJob(userId: string, jobId: string): Promise<Job> {
    // Authorization check
    const existing = await this.getJob(userId, jobId);
    if (!existing) {
      throw new Error("Job not found or unauthorized");
    }

    return this.jobsRepo.resumeJob(jobId);
  }

  // ==================== Endpoint Operations ====================

  /**
   * Add a new endpoint to a job.
   *
   * @param userId - The user/tenant ID who owns this endpoint
   * @param input - Endpoint configuration
   * @returns The created JobEndpoint entity
   */
  async addEndpointToJob(userId: string, input: AddEndpointInput): Promise<JobEndpoint> {
    validateAddEndpointInput(input);

    const now = this.clock.now();

    // Verify user owns the job
    const job = await this.getJob(userId, input.jobId);
    if (!job) {
      throw new Error("Job not found or unauthorized");
    }

    // Check endpoint count quota against tier limits (across ALL user endpoints, not just this job)
    const userTier = await this.jobsRepo.getUserTier(userId);
    const executionLimits = getExecutionLimits(userTier);
    const existingEndpointCount = await this.jobsRepo.countEndpointsByUser(userId);

    if (existingEndpointCount >= executionLimits.maxEndpoints) {
      const upgradeMsg = userTier === "free"
        ? " Upgrade to Pro for 100 endpoints or Enterprise for 1,000 endpoints."
        : userTier === "pro"
          ? " Upgrade to Enterprise for 1,000 endpoints."
          : "";

      throw new Error(
        `Endpoint limit reached: ${userTier} tier allows maximum ${executionLimits.maxEndpoints} endpoints.${upgradeMsg}`,
      );
    }

    // Enforce minimum interval constraint per tier
    if (input.baselineIntervalMs && input.baselineIntervalMs < executionLimits.minIntervalMs) {
      const upgradeMsg = userTier === "free"
        ? ` Upgrade to Pro (10s minimum) or Enterprise (1s minimum) for shorter intervals.`
        : userTier === "pro"
          ? ` Upgrade to Enterprise for 1s minimum interval.`
          : "";

      throw new Error(
        `Interval too short: ${userTier} tier requires minimum ${executionLimits.minIntervalMs}ms (${executionLimits.minIntervalMs / 1000}s) between runs.${upgradeMsg}`,
      );
    }

    // Build JobEndpoint domain entity
    const enforcedMinIntervalMs = Math.max(
      input.minIntervalMs ?? executionLimits.minIntervalMs,
      executionLimits.minIntervalMs,
    );

    const endpoint: JobEndpoint = {
      id: nanoid(),
      jobId: input.jobId,
      tenantId: userId,
      name: input.name,
      description: input.description,
      baselineCron: input.baselineCron,
      baselineIntervalMs: input.baselineIntervalMs,
      minIntervalMs: enforcedMinIntervalMs,
      maxIntervalMs: input.maxIntervalMs,
      nextRunAt: now, // Temporary: will calculate below
      failureCount: 0,
      url: input.url,
      method: input.method,
      headersJson: input.headersJson,
      bodyJson: input.bodyJson,
      timeoutMs: input.timeoutMs,
      maxExecutionTimeMs: input.maxExecutionTimeMs,
      maxResponseSizeKb: input.maxResponseSizeKb,
    };

    // Calculate initial nextRunAt based on baseline schedule
    // For cron: calculate next occurrence from now
    // For interval: add interval to now
    // The scheduler will use full governor logic (with AI hints, clamps, etc.) for subsequent runs
    if (endpoint.baselineCron) {
      endpoint.nextRunAt = this.cron.next(endpoint.baselineCron, now);
    }
    else if (endpoint.baselineIntervalMs) {
      endpoint.nextRunAt = new Date(now.getTime() + endpoint.baselineIntervalMs);
    }
    else {
      // Fallback: shouldn't happen due to validation, but be safe
      endpoint.nextRunAt = new Date(now.getTime() + 60_000);
    }

    // Persist to database
    await this.jobsRepo.addEndpoint(endpoint);

    return endpoint;
  }

  /**
   * List all endpoints for a job.
   *
   * @param userId - The requesting user (for authorization)
   * @param jobId - The job ID
   * @returns Array of endpoints
   * @throws Error if job not found or user not authorized
   */
  async listEndpointsByJob(userId: string, jobId: string): Promise<JobEndpoint[]> {
    // Authorization check
    const job = await this.getJob(userId, jobId);
    if (!job) {
      throw new Error("Job not found or unauthorized");
    }

    return this.jobsRepo.listEndpointsByJob(jobId);
  }

  /**
   * Get a single endpoint by ID.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @returns The endpoint or null if not found/unauthorized
   */
  async getEndpoint(userId: string, endpointId: string): Promise<JobEndpoint | null> {
    const endpoint = await this.jobsRepo.getEndpoint(endpointId);

    // Authorization: user must own the endpoint
    if (!endpoint || endpoint.tenantId !== userId) {
      return null;
    }

    return endpoint;
  }

  /**
   * Update an endpoint's configuration.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @param input - Fields to update
   * @returns The updated endpoint
   * @throws Error if endpoint not found or user not authorized
   */
  async updateEndpointConfig(
    userId: string,
    endpointId: string,
    input: Partial<Omit<AddEndpointInput, "jobId">>,
  ): Promise<JobEndpoint> {
    // Authorization check
    const existing = await this.getEndpoint(userId, endpointId);
    if (!existing) {
      throw new Error("Endpoint not found or unauthorized");
    }

    // Enforce minimum interval constraint if changing baselineIntervalMs
    if (input.baselineIntervalMs !== undefined) {
      const userTier = await this.jobsRepo.getUserTier(userId);
      const executionLimits = getExecutionLimits(userTier);

      if (input.baselineIntervalMs < executionLimits.minIntervalMs) {
        const upgradeMsg = userTier === "free"
          ? ` Upgrade to Pro (10s minimum) or Enterprise (1s minimum) for shorter intervals.`
          : userTier === "pro"
            ? ` Upgrade to Enterprise for 1s minimum interval.`
            : "";

        throw new Error(
          `Interval too short: ${userTier} tier requires minimum ${executionLimits.minIntervalMs}ms (${executionLimits.minIntervalMs / 1000}s) between runs.${upgradeMsg}`,
        );
      }
    }

    // Build update object
    const updates: Partial<JobEndpoint> = { ...input };

    // Recalculate nextRunAt if baseline schedule changed
    const now = this.clock.now();
    if (input.baselineCron && input.baselineCron !== existing.baselineCron) {
      updates.nextRunAt = this.cron.next(input.baselineCron, now);
    }
    else if (
      input.baselineIntervalMs
      && input.baselineIntervalMs !== existing.baselineIntervalMs
    ) {
      updates.nextRunAt = new Date(now.getTime() + input.baselineIntervalMs);
    }

    // Update via repo partial update
    const updated = await this.jobsRepo.updateEndpoint(endpointId, updates);

    return updated;
  }

  /**
   * Delete an endpoint.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @throws Error if endpoint not found or user not authorized
   */
  async deleteEndpoint(userId: string, endpointId: string): Promise<void> {
    // Authorization check
    const existing = await this.getEndpoint(userId, endpointId);
    if (!existing) {
      throw new Error("Endpoint not found or unauthorized");
    }

    await this.jobsRepo.deleteEndpoint(endpointId);
  }

  /**
   * Archive an endpoint (soft delete).
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @returns The archived endpoint
   * @throws Error if endpoint not found or user not authorized
   */
  async archiveEndpoint(userId: string, endpointId: string): Promise<JobEndpoint> {
    // Authorization check
    const existing = await this.getEndpoint(userId, endpointId);
    if (!existing) {
      throw new Error("Endpoint not found or unauthorized");
    }

    return this.jobsRepo.archiveEndpoint(endpointId);
  }

  // ==================== Execution Visibility ====================

  /**
   * List run history with optional filters.
   *
   * @param userId - The requesting user (for authorization)
   * @param filters - Optional filters
   * @param filters.jobId - Filter by job ID
   * @param filters.endpointId - Filter by endpoint ID
   * @param filters.status - Filter by run status (success/failed)
   * @param filters.limit - Maximum number of runs to return
   * @param filters.offset - Offset for pagination
   * @returns Paginated run summaries with total count
   */
  async listRuns(
    userId: string,
    filters?: {
      jobId?: string;
      endpointId?: string;
      status?: "success" | "failed";
      limit?: number;
      offset?: number;
    },
  ): Promise<{
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
    return this.runsRepo.listRuns({
      userId,
      ...filters,
    });
  }

  /**
   * Get detailed information about a specific run.
   *
   * @param userId - The requesting user (for authorization)
   * @param runId - The run ID
   * @returns Run details or null if not found/unauthorized
   */
  async getRunDetails(userId: string, runId: string): Promise<{
    id: string;
    endpointId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string;
    source?: string;
    attempt: number;
    responseBody?: import("@cronicorn/domain").JsonValue | null;
    statusCode?: number;
    endpoint?: {
      id: string;
      name: string;
      url?: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    };
  } | null> {
    const run = await this.runsRepo.getRunDetails(runId);

    if (!run) {
      return null;
    }

    // Authorization: verify user owns the endpoint that this run belongs to
    const endpoint = await this.jobsRepo.getEndpoint(run.endpointId);
    if (!endpoint || endpoint.tenantId !== userId) {
      return null;
    }

    // Include endpoint details for debugging
    return {
      ...run,
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
      },
    };
  }

  // ==================== Adaptive Scheduling ====================

  /**
   * Apply an interval hint to an endpoint (AI-suggested interval adjustment).
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @param input - Hint configuration
   * @param input.intervalMs - Suggested interval in milliseconds
   * @param input.ttlMinutes - How long this hint should remain valid (default: 60)
   * @param input.reason - Optional explanation for the hint
   * @throws Error if endpoint not found or user not authorized
   */
  async applyIntervalHint(
    userId: string,
    endpointId: string,
    input: { intervalMs: number; ttlMinutes?: number; reason?: string },
  ): Promise<void> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    // Enforce tier-based minimum interval
    const userTier = await this.jobsRepo.getUserTier(userId);
    const executionLimits = getExecutionLimits(userTier);

    if (input.intervalMs < executionLimits.minIntervalMs) {
      const upgradeMsg = userTier === "free"
        ? ` Upgrade to Pro (10s minimum) or Enterprise (1s minimum) for shorter intervals.`
        : userTier === "pro"
          ? ` Upgrade to Enterprise for 1s minimum interval.`
          : "";

      throw new Error(
        `AI hint interval too short: ${userTier} tier requires minimum ${executionLimits.minIntervalMs}ms (${executionLimits.minIntervalMs / 1000}s) between runs.${upgradeMsg}`,
      );
    }

    // Validate intervalMs is within endpoint-specific min/max bounds if set
    if (endpoint.minIntervalMs && input.intervalMs < endpoint.minIntervalMs) {
      throw new ValidationError(
        `Interval hint (${input.intervalMs}ms) is below minimum (${endpoint.minIntervalMs}ms)`,
      );
    }
    if (endpoint.maxIntervalMs && input.intervalMs > endpoint.maxIntervalMs) {
      throw new ValidationError(
        `Interval hint (${input.intervalMs}ms) exceeds maximum (${endpoint.maxIntervalMs}ms)`,
      );
    }

    const now = this.clock.now();
    const ttlMs = (input.ttlMinutes ?? 60) * 60 * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Write AI hint to repo
    await this.jobsRepo.writeAIHint(endpointId, {
      intervalMs: input.intervalMs,
      expiresAt,
      reason: input.reason,
    });

    // Nudge nextRunAt if earlier than current
    if (endpoint.lastRunAt) {
      const suggestedNext = new Date(endpoint.lastRunAt.getTime() + input.intervalMs);
      await this.jobsRepo.setNextRunAtIfEarlier(endpointId, suggestedNext);
    }
  }

  /**
   * Schedule a one-shot run at a specific time (AI-suggested timing).
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @param input - One-shot configuration
   * @param input.nextRunAt - When to run (ISO string or Date)
   * @param input.nextRunInMs - Alternative: run in X milliseconds from now
   * @param input.ttlMinutes - How long this hint should remain valid (default: 60)
   * @param input.reason - Optional explanation for the hint
   * @throws Error if endpoint not found or user not authorized
   */
  async scheduleOneShotRun(
    userId: string,
    endpointId: string,
    input: {
      nextRunAt?: string | Date;
      nextRunInMs?: number;
      ttlMinutes?: number;
      reason?: string;
    },
  ): Promise<void> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    const now = this.clock.now();

    // Calculate nextRunAt
    let targetTime: Date;
    if (input.nextRunAt) {
      targetTime = typeof input.nextRunAt === "string"
        ? new Date(input.nextRunAt)
        : input.nextRunAt;
    }
    else if (input.nextRunInMs !== undefined) {
      targetTime = new Date(now.getTime() + input.nextRunInMs);
    }
    else {
      throw new ValidationError("Must provide either nextRunAt or nextRunInMs");
    }

    // Validate it's in the future
    if (targetTime <= now) {
      throw new ValidationError("nextRunAt must be in the future");
    }

    const ttlMs = (input.ttlMinutes ?? 60) * 60 * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Write AI hint to repo
    await this.jobsRepo.writeAIHint(endpointId, {
      nextRunAt: targetTime,
      expiresAt,
      reason: input.reason,
    });

    // Nudge nextRunAt if earlier
    await this.jobsRepo.setNextRunAtIfEarlier(endpointId, targetTime);
  }

  /**
   * Pause or resume an endpoint.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @param input - Pause configuration
   * @param input.pausedUntil - When to resume (ISO string, Date, or null to unpause)
   * @param input.reason - Optional explanation for pausing
   * @throws Error if endpoint not found or user not authorized
   */
  async pauseOrResumeEndpoint(
    userId: string,
    endpointId: string,
    input: { pausedUntil: string | Date | null; reason?: string },
  ): Promise<void> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    let pauseDate: Date | null = null;
    if (input.pausedUntil !== null) {
      pauseDate = typeof input.pausedUntil === "string"
        ? new Date(input.pausedUntil)
        : input.pausedUntil;
    }

    await this.jobsRepo.setPausedUntil(endpointId, pauseDate);
  }

  /**
   * Clear all AI hints for an endpoint.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @throws Error if endpoint not found or user not authorized
   */
  async clearAdaptiveHints(userId: string, endpointId: string): Promise<void> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    await this.jobsRepo.clearAIHints(endpointId);
  }

  /**
   * Reset the failure count for an endpoint.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @throws Error if endpoint not found or user not authorized
   */
  async resetFailureCount(userId: string, endpointId: string): Promise<void> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    await this.jobsRepo.resetFailureCount(endpointId);
  }

  /**
   * Get health summary for an endpoint.
   *
   * @param userId - The requesting user (for authorization)
   * @param endpointId - The endpoint ID
   * @param sinceHours - How many hours of history to analyze (default: 24)
   * @returns Health summary statistics
   * @throws Error if endpoint not found or user not authorized
   */
  async summarizeEndpointHealth(
    userId: string,
    endpointId: string,
    sinceHours = 24,
  ): Promise<{
      successCount: number;
      failureCount: number;
      avgDurationMs: number | null;
      lastRun: { status: string; at: Date } | null;
      failureStreak: number;
    }> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    const now = this.clock.now();
    const since = new Date(now.getTime() - sinceHours * 60 * 60 * 1000);

    return this.runsRepo.getHealthSummary(endpointId, since);
  }

  // ==================== Usage & Quota ====================

  /**
   * Get usage statistics for a user.
   *
   * @param userId - The user ID
   * @param since - Start date for usage calculation (typically start of current month)
   * @returns Current usage vs limits for AI calls, endpoints, and total runs
   */
  async getUsage(userId: string, since: Date): Promise<{
    aiCallsUsed: number;
    aiCallsLimit: number;
    endpointsUsed: number;
    endpointsLimit: number;
    totalRuns: number;
    totalRunsLimit: number;
  }> {
    return this.jobsRepo.getUsage(userId, since);
  }

  // ==================== AI Analysis Sessions ====================

  /**
   * List AI analysis sessions for an endpoint
   *
   * @param userId - The user ID (for authorization)
   * @param endpointId - The endpoint ID
   * @param limit - Maximum number of sessions to return (default: 10, max: 100)
   * @param offset - Number of sessions to skip for pagination (default: 0)
   * @returns List of AI sessions ordered newest to oldest
   * @throws Error if endpoint not found or user not authorized
   */
  async listSessions(
    userId: string,
    endpointId: string,
    limit = 10,
    offset = 0,
  ): Promise<{
      sessions: Array<{
        id: string;
        analyzedAt: Date;
        toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
        reasoning: string;
        tokenUsage: number | null;
        durationMs: number | null;
      }>;
      total: number;
    }> {
    // Authorization check
    const endpoint = await this.getEndpoint(userId, endpointId);
    if (!endpoint) {
      throw new Error("Endpoint not found or unauthorized");
    }

    const [sessions, total] = await Promise.all([
      this.sessionsRepo.getRecentSessions(endpointId, limit, offset),
      this.sessionsRepo.getTotalSessionCount(endpointId),
    ]);

    return { sessions, total };
  }
}
