import type { Clock, Cron, Job, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { nanoid } from "nanoid";

/**
 * Input for creating a new job (logical grouping).
 */
export type CreateJobInput = {
  name: string;
  description?: string;
};

/**
 * Input for creating an endpoint (optionally under a job).
 */
export type CreateEndpointInput = {
  name: string;
  jobId?: string; // Optional: assign to a job
  baselineCron?: string;
  baselineIntervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: Record<string, string>;
  bodyJson?: import("@cronicorn/domain").JsonValue;
  timeoutMs?: number;
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

function validateCreateEndpointInput(input: CreateEndpointInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError("Endpoint name is required");
  }
  if (input.name.length > 255) {
    throw new ValidationError("Endpoint name must be 255 characters or less");
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
   * @param filters.status - Filter by job status (active/archived)
   * @returns Array of jobs with endpoint counts
   */
  async listJobs(
    userId: string,
    filters?: { status?: "active" | "archived" },
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

  // ==================== Endpoint Operations ====================

  /**
   * Create a new endpoint (optionally under a job).
   *
   * @param userId - The user/tenant ID who owns this endpoint
   * @param input - Endpoint configuration
   * @returns The created JobEndpoint entity
   */
  async createEndpoint(userId: string, input: CreateEndpointInput): Promise<JobEndpoint> {
    validateCreateEndpointInput(input);

    const now = this.clock.now();

    // If jobId provided, verify user owns it
    if (input.jobId) {
      const job = await this.getJob(userId, input.jobId);
      if (!job) {
        throw new Error("Job not found or unauthorized");
      }
    }

    // Build JobEndpoint domain entity
    const endpoint: JobEndpoint = {
      id: nanoid(),
      jobId: input.jobId,
      tenantId: userId,
      name: input.name,
      baselineCron: input.baselineCron,
      baselineIntervalMs: input.baselineIntervalMs,
      minIntervalMs: input.minIntervalMs,
      maxIntervalMs: input.maxIntervalMs,
      nextRunAt: now, // Temporary: will calculate below
      failureCount: 0,
      url: input.url,
      method: input.method,
      headersJson: input.headersJson,
      bodyJson: input.bodyJson,
      timeoutMs: input.timeoutMs,
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
    await this.jobsRepo.add(endpoint);

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
  async updateEndpoint(
    userId: string,
    endpointId: string,
    input: Partial<Omit<CreateEndpointInput, "jobId">>,
  ): Promise<JobEndpoint> {
    // Authorization check
    const existing = await this.getEndpoint(userId, endpointId);
    if (!existing) {
      throw new Error("Endpoint not found or unauthorized");
    }

    // Get current endpoint to merge updates
    const updated: JobEndpoint = {
      ...existing,
      ...input,
    };

    // Recalculate nextRunAt if baseline schedule changed
    const now = this.clock.now();
    if (input.baselineCron && input.baselineCron !== existing.baselineCron) {
      updated.nextRunAt = this.cron.next(input.baselineCron, now);
    }
    else if (
      input.baselineIntervalMs
      && input.baselineIntervalMs !== existing.baselineIntervalMs
    ) {
      updated.nextRunAt = new Date(now.getTime() + input.baselineIntervalMs);
    }

    // Update via repo (note: this uses the existing add method which replaces)
    // In a real implementation, you'd want an updateEndpoint method on the repo
    await this.jobsRepo.add(updated);

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
   * @returns Array of run summaries
   */
  async listRuns(
    userId: string,
    filters?: {
      jobId?: string;
      endpointId?: string;
      status?: "success" | "failed";
      limit?: number;
    },
  ): Promise<Array<{
      runId: string;
      endpointId: string;
      startedAt: Date;
      status: string;
      durationMs?: number;
      source?: string;
    }>> {
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

    return run;
  }
}
