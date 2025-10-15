/**
 * Complete Zod Schema Definitions for 17 Public-Facing Actions
 *
 * This file contains production-ready Zod schemas for all public actions
 * in the adaptive scheduler. Suitable for:
 * - REST API route validation
 * - MCP server tool definitions
 * - TypeScript type inference
 * - OpenAPI documentation generation
 *
 * Usage:
 * ```typescript
 * import { CreateJobRequestSchema, CreateJobResponseSchema } from './api-actions-schemas';
 *
 * const request = CreateJobRequestSchema.parse(input);
 * const response: CreateJobResponse = { jobId: "...", createdAt: "..." };
 * ```
 */

import { z } from "@hono/zod-openapi";

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const UserIdSchema = z.string().openapi({
  description: "User ID for authorization and tenant isolation",
  example: "user_abc123",
});

const JobIdSchema = z.string().openapi({
  description: "Unique identifier for a job container",
  example: "job_xyz789",
});

const EndpointIdSchema = z.string().openapi({
  description: "Unique identifier for an endpoint within a job",
  example: "endpoint_def456",
});

const RunIdSchema = z.string().openapi({
  description: "Unique identifier for an execution run",
  example: "run_ghi789",
});

const ReasonSchema = z.string().optional().openapi({
  description: "Optional reason for this action, used for audit trails and observability",
  example: "Traffic surge detected, tightening monitoring intervals",
});

const TimestampSchema = z.string().datetime().openapi({
  description: "ISO 8601 timestamp in UTC",
  example: "2024-10-14T09:00:00Z",
});

const JsonValueSchema = z.any().openapi({
  description: "Any valid JSON value (string, number, boolean, null, array, or object)",
});

const CronExpressionSchema = z.string().openapi({
  description: "Standard cron expression for scheduling. Format: minute hour day month weekday. Use '*' for any value.",
  example: "0 9 * * 1-5",
});

const IntervalMsSchema = z.number().int().positive().openapi({
  description: "Time interval in milliseconds",
  example: 300000,
});

const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).openapi({
  description: "HTTP method for the endpoint request",
  example: "POST",
});

const ExecutionStatusSchema = z.enum(["success", "failure"]).openapi({
  description: "Execution outcome: 'success' for HTTP 2xx responses, 'failure' for errors/timeouts",
  example: "success",
});

const JobStatusSchema = z.enum(["active", "archived"]).openapi({
  description: "Job lifecycle status: 'active' jobs execute normally, 'archived' jobs are soft-deleted",
  example: "active",
});

// ============================================================================
// CATEGORY 1: JOBS LIFECYCLE (5 ACTIONS)
// ============================================================================

// 1.1 Create Job
export const CreateJobRequestSchema = z.object({
  userId: UserIdSchema,

  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .openapi({
      description: "Human-readable name for the job. Should clearly describe the job's purpose.",
      example: "Production Health Monitor",
    }),

  description: z.string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .openapi({
      description: "Optional detailed description of what this job does, when it runs, and why it exists.",
      example: "Monitors production API health with adaptive intervals. Tightens monitoring during traffic surges.",
    }),
}).openapi("CreateJobRequest");

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const CreateJobResponseSchema = z.object({
  jobId: JobIdSchema,
  createdAt: TimestampSchema.openapi({ description: "When this job was created" }),
}).openapi("CreateJobResponse");

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;

// 1.2 Get Job
export const GetJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("GetJobRequest");

export type GetJobRequest = z.infer<typeof GetJobRequestSchema>;

export const GetJobResponseSchema = z.object({
  id: JobIdSchema,
  name: z.string().openapi({ description: "Job name", example: "Production Health Monitor" }),
  description: z.string().optional().openapi({ description: "Job description" }),
  status: JobStatusSchema,
  endpointCount: z.number().int().nonnegative().openapi({
    description: "Number of endpoints attached to this job",
    example: 5,
  }),
  failureCount: z.number().int().nonnegative().openapi({
    description: "Number of endpoints currently in failed state",
    example: 0,
  }),
  createdAt: TimestampSchema.openapi({ description: "When this job was created" }),
  updatedAt: TimestampSchema.openapi({ description: "When this job was last modified" }),
}).openapi("GetJobResponse");

export type GetJobResponse = z.infer<typeof GetJobResponseSchema>;

// 1.3 List Jobs
export const ListJobsRequestSchema = z.object({
  userId: UserIdSchema,
  status: JobStatusSchema.optional().openapi({
    description: "Filter jobs by status. Omit to return all jobs.",
  }),
}).openapi("ListJobsRequest");

export type ListJobsRequest = z.infer<typeof ListJobsRequestSchema>;

export const ListJobsResponseSchema = z.object({
  jobs: z.array(z.object({
    jobId: JobIdSchema,
    name: z.string().openapi({ description: "Job name" }),
    status: JobStatusSchema,
    endpointCount: z.number().int().nonnegative().openapi({
      description: "Number of endpoints in this job",
    }),
    lastRunAt: TimestampSchema.optional().openapi({
      description: "Most recent execution time",
    }),
  })),
}).openapi("ListJobsResponse");

export type ListJobsResponse = z.infer<typeof ListJobsResponseSchema>;

// 1.4 Update Job
export const UpdateJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
  name: z.string()
    .min(1, "Name cannot be empty")
    .max(255, "Name must be 255 characters or less")
    .optional()
    .openapi({ description: "New name for the job" }),
  description: z.string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .openapi({ description: "New description for the job" }),
}).openapi("UpdateJobRequest");

export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

export const UpdateJobResponseSchema = z.object({
  updatedAt: TimestampSchema.openapi({ description: "When this update was applied" }),
}).openapi("UpdateJobResponse");

export type UpdateJobResponse = z.infer<typeof UpdateJobResponseSchema>;

// 1.5 Archive Job
export const ArchiveJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("ArchiveJobRequest");

export type ArchiveJobRequest = z.infer<typeof ArchiveJobRequestSchema>;

export const ArchiveJobResponseSchema = z.object({
  archivedAt: TimestampSchema.openapi({ description: "When this job was archived" }),
}).openapi("ArchiveJobResponse");

export type ArchiveJobResponse = z.infer<typeof ArchiveJobResponseSchema>;

// ============================================================================
// CATEGORY 2: ENDPOINT ORCHESTRATION (4 ACTIONS)
// ============================================================================

// 2.1 Add Endpoint to Job
export const AddEndpointToJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,

  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .openapi({
      description: "Human-readable name for this endpoint",
      example: "check_api_latency",
    }),

  url: z.string()
    .url("Must be a valid HTTP/HTTPS URL")
    .openapi({
      description: "HTTP endpoint URL to call when this endpoint executes",
      example: "https://api.example.com/health/latency",
    }),

  method: HttpMethodSchema.default("GET").openapi({
    description: "HTTP method for the request",
  }),

  headers: z.record(z.string()).optional().openapi({
    description: "HTTP headers to include in the request",
    example: { Authorization: "Bearer token123" },
  }),

  body: JsonValueSchema.optional().openapi({
    description: "JSON body to send with POST/PUT/PATCH requests",
    example: { check: "latency", threshold: 200 },
  }),

  baseline: z.object({
    cron: CronExpressionSchema.optional(),
    intervalMs: IntervalMsSchema.optional(),
  }).refine(
    data => (data.cron && !data.intervalMs) || (!data.cron && data.intervalMs),
    { message: "Exactly one of 'cron' or 'intervalMs' must be provided" },
  ).optional().openapi({
    description: "Baseline scheduling cadence",
  }),

  clamp: z.object({
    minIntervalMs: IntervalMsSchema.optional().openapi({
      description: "Minimum allowed interval between runs",
      example: 60000,
    }),
    maxIntervalMs: IntervalMsSchema.optional().openapi({
      description: "Maximum allowed interval between runs",
      example: 3600000,
    }),
  }).optional(),

  timeoutMs: z.number()
    .int()
    .positive()
    .default(30000)
    .openapi({
      description: "Request timeout in milliseconds",
      example: 30000,
    }),
}).openapi("AddEndpointToJobRequest");

export type AddEndpointToJobRequest = z.infer<typeof AddEndpointToJobRequestSchema>;

export const AddEndpointToJobResponseSchema = z.object({
  endpointId: EndpointIdSchema,
  nextRunAt: TimestampSchema.openapi({
    description: "When this endpoint is scheduled to execute next",
  }),
}).openapi("AddEndpointToJobResponse");

export type AddEndpointToJobResponse = z.infer<typeof AddEndpointToJobResponseSchema>;

// 2.2 Update Endpoint Config
export const UpdateEndpointConfigRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  url: z.string().url().optional().openapi({ description: "New URL for the endpoint" }),
  method: HttpMethodSchema.optional().openapi({ description: "New HTTP method" }),
  headers: z.record(z.string()).optional().openapi({ description: "New HTTP headers" }),
  body: JsonValueSchema.optional().openapi({ description: "New JSON body" }),
  clamp: z.object({
    minIntervalMs: IntervalMsSchema.optional(),
    maxIntervalMs: IntervalMsSchema.optional(),
  }).optional().openapi({ description: "New guardrail clamps" }),
  timeoutMs: z.number().int().positive().optional().openapi({
    description: "New request timeout",
  }),
}).openapi("UpdateEndpointConfigRequest");

export type UpdateEndpointConfigRequest = z.infer<typeof UpdateEndpointConfigRequestSchema>;

export const UpdateEndpointConfigResponseSchema = z.object({
  updatedAt: TimestampSchema.openapi({ description: "When this configuration was updated" }),
}).openapi("UpdateEndpointConfigResponse");

export type UpdateEndpointConfigResponse = z.infer<typeof UpdateEndpointConfigResponseSchema>;

// 2.3 Delete Endpoint
export const DeleteEndpointRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
}).openapi("DeleteEndpointRequest");

export type DeleteEndpointRequest = z.infer<typeof DeleteEndpointRequestSchema>;

export const DeleteEndpointResponseSchema = z.object({
  deletedAt: TimestampSchema.openapi({ description: "When this endpoint was deleted" }),
}).openapi("DeleteEndpointResponse");

export type DeleteEndpointResponse = z.infer<typeof DeleteEndpointResponseSchema>;

// 2.4 List Job Endpoints
export const ListJobEndpointsRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("ListJobEndpointsRequest");

export type ListJobEndpointsRequest = z.infer<typeof ListJobEndpointsRequestSchema>;

export const ListJobEndpointsResponseSchema = z.object({
  endpoints: z.array(z.object({
    endpointId: EndpointIdSchema,
    name: z.string().openapi({ description: "Endpoint name" }),
    nextRunAt: TimestampSchema.openapi({ description: "When this endpoint executes next" }),
    lastRunAt: TimestampSchema.optional().openapi({ description: "When this endpoint last executed" }),
    failureCount: z.number().int().nonnegative().openapi({
      description: "Consecutive failure count",
    }),
    pausedUntil: TimestampSchema.optional().openapi({
      description: "If present, endpoint is paused until this time",
    }),
  })),
}).openapi("ListJobEndpointsResponse");

export type ListJobEndpointsResponse = z.infer<typeof ListJobEndpointsResponseSchema>;

// ============================================================================
// CATEGORY 3: ADAPTIVE SCHEDULING CONTROL (5 ACTIONS)
// ============================================================================

// 3.1 Apply Interval Hint
export const ApplyIntervalHintRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  intervalMs: IntervalMsSchema.openapi({
    description: "Desired interval between executions. Will be clamped to endpoint's min/max.",
    example: 30000,
  }),
  ttlMinutes: z.number().int().positive().default(60).openapi({
    description: "How long this hint remains active (minutes)",
    example: 20,
  }),
  reason: ReasonSchema,
}).openapi("ApplyIntervalHintRequest");

export type ApplyIntervalHintRequest = z.infer<typeof ApplyIntervalHintRequestSchema>;

export const ApplyIntervalHintResponseSchema = z.object({
  hintExpiresAt: TimestampSchema.openapi({
    description: "When this interval hint expires",
  }),
  nextRunAt: TimestampSchema.openapi({
    description: "When the endpoint will execute next",
  }),
}).openapi("ApplyIntervalHintResponse");

export type ApplyIntervalHintResponse = z.infer<typeof ApplyIntervalHintResponseSchema>;

// 3.2 Schedule One-Shot Run
export const ScheduleOneShotRunRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  runAt: TimestampSchema.openapi({
    description: "When this endpoint should execute once. Must be in the future.",
    example: "2024-10-14T09:30:00Z",
  }),
  ttlMinutes: z.number().int().positive().default(60).openapi({
    description: "How long this one-shot scheduling remains active",
    example: 30,
  }),
  reason: ReasonSchema,
}).openapi("ScheduleOneShotRunRequest");

export type ScheduleOneShotRunRequest = z.infer<typeof ScheduleOneShotRunRequestSchema>;

export const ScheduleOneShotRunResponseSchema = z.object({
  scheduledFor: TimestampSchema.openapi({
    description: "Confirms when the one-shot execution is scheduled",
  }),
}).openapi("ScheduleOneShotRunResponse");

export type ScheduleOneShotRunResponse = z.infer<typeof ScheduleOneShotRunResponseSchema>;

// 3.3 Pause or Resume Endpoint
export const PauseOrResumeEndpointRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  pauseUntil: TimestampSchema.nullable().optional().openapi({
    description: "Pause until this time, or null to resume immediately",
    example: "2024-10-15T00:00:00Z",
  }),
  reason: ReasonSchema,
}).openapi("PauseOrResumeEndpointRequest");

export type PauseOrResumeEndpointRequest = z.infer<typeof PauseOrResumeEndpointRequestSchema>;

export const PauseOrResumeEndpointResponseSchema = z.object({
  pausedUntil: TimestampSchema.nullable().optional().openapi({
    description: "Current pause state: timestamp if paused, null if active",
  }),
}).openapi("PauseOrResumeEndpointResponse");

export type PauseOrResumeEndpointResponse = z.infer<typeof PauseOrResumeEndpointResponseSchema>;

// 3.4 Clear Adaptive Hints
export const ClearAdaptiveHintsRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  reason: ReasonSchema,
}).openapi("ClearAdaptiveHintsRequest");

export type ClearAdaptiveHintsRequest = z.infer<typeof ClearAdaptiveHintsRequestSchema>;

export const ClearAdaptiveHintsResponseSchema = z.object({
  clearedAt: TimestampSchema.openapi({ description: "When hints were cleared" }),
  nextRunAt: TimestampSchema.openapi({
    description: "When endpoint will execute next using baseline",
  }),
}).openapi("ClearAdaptiveHintsResponse");

export type ClearAdaptiveHintsResponse = z.infer<typeof ClearAdaptiveHintsResponseSchema>;

// 3.5 Reset Failure Count
export const ResetFailureCountRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  reason: ReasonSchema,
}).openapi("ResetFailureCountRequest");

export type ResetFailureCountRequest = z.infer<typeof ResetFailureCountRequestSchema>;

export const ResetFailureCountResponseSchema = z.object({
  failureCount: z.number().int().nonnegative().openapi({
    description: "Current failure count after reset (should be 0)",
    example: 0,
  }),
}).openapi("ResetFailureCountResponse");

export type ResetFailureCountResponse = z.infer<typeof ResetFailureCountResponseSchema>;

// ============================================================================
// CATEGORY 4: EXECUTION VISIBILITY & INSIGHTS (3 ACTIONS)
// ============================================================================

// 4.1 List Runs
export const ListRunsRequestSchema = z.object({
  userId: UserIdSchema,
  jobId: JobIdSchema.optional().openapi({
    description: "Filter runs to a specific job",
  }),
  endpointId: EndpointIdSchema.optional().openapi({
    description: "Filter runs to a specific endpoint",
  }),
  status: ExecutionStatusSchema.optional().openapi({
    description: "Filter by execution status",
  }),
  limit: z.number().int().positive().max(100).default(50).openapi({
    description: "Maximum number of runs to return",
    example: 50,
  }),
  offset: z.number().int().nonnegative().default(0).openapi({
    description: "Number of runs to skip for pagination",
    example: 0,
  }),
}).openapi("ListRunsRequest");

export type ListRunsRequest = z.infer<typeof ListRunsRequestSchema>;

export const ListRunsResponseSchema = z.object({
  runs: z.array(z.object({
    runId: RunIdSchema,
    endpointId: EndpointIdSchema,
    startedAt: TimestampSchema.openapi({ description: "When this run started" }),
    status: ExecutionStatusSchema,
    durationMs: z.number().int().nonnegative().openapi({
      description: "Execution duration in milliseconds",
      example: 152,
    }),
    source: z.string().openapi({
      description: "What triggered this execution",
      example: "ai-interval",
    }),
  })),
  total: z.number().int().nonnegative().openapi({
    description: "Total number of runs matching the filter",
    example: 237,
  }),
}).openapi("ListRunsResponse");

export type ListRunsResponse = z.infer<typeof ListRunsResponseSchema>;

// 4.2 Get Run Details
export const GetRunDetailsRequestSchema = z.object({
  runId: RunIdSchema,
  userId: UserIdSchema,
}).openapi("GetRunDetailsRequest");

export type GetRunDetailsRequest = z.infer<typeof GetRunDetailsRequestSchema>;

export const GetRunDetailsResponseSchema = z.object({
  id: RunIdSchema,
  endpointId: EndpointIdSchema,
  status: ExecutionStatusSchema,
  startedAt: TimestampSchema.openapi({ description: "When execution began" }),
  finishedAt: TimestampSchema.optional().openapi({
    description: "When execution completed",
  }),
  durationMs: z.number().int().nonnegative().openapi({
    description: "Execution duration",
    example: 152,
  }),
  errorMessage: z.string().optional().openapi({
    description: "Error details if status is 'failure'",
    example: "HTTP 500: Internal Server Error",
  }),
  source: z.string().openapi({
    description: "What triggered this execution",
    example: "ai-oneshot",
  }),
  attempt: z.number().int().positive().openapi({
    description: "Attempt number",
    example: 1,
  }),
}).openapi("GetRunDetailsResponse");

export type GetRunDetailsResponse = z.infer<typeof GetRunDetailsResponseSchema>;

// 4.3 Summarize Endpoint Health
export const SummarizeEndpointHealthRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  windowHours: z.number().int().positive().max(168).default(24).openapi({
    description: "Time window for health summary (hours)",
    example: 24,
  }),
}).openapi("SummarizeEndpointHealthRequest");

export type SummarizeEndpointHealthRequest = z.infer<typeof SummarizeEndpointHealthRequestSchema>;

export const SummarizeEndpointHealthResponseSchema = z.object({
  successCount: z.number().int().nonnegative().openapi({
    description: "Number of successful executions",
    example: 143,
  }),
  failureCount: z.number().int().nonnegative().openapi({
    description: "Number of failed executions",
    example: 2,
  }),
  avgDurationMs: z.number().nonnegative().openapi({
    description: "Average execution duration",
    example: 156.7,
  }),
  lastRun: z.object({
    status: ExecutionStatusSchema,
    at: TimestampSchema.openapi({ description: "When the last run occurred" }),
  }).optional().openapi({
    description: "Most recent execution summary",
  }),
  failureStreak: z.number().int().nonnegative().openapi({
    description: "Current consecutive failure count",
    example: 0,
  }),
}).openapi("SummarizeEndpointHealthResponse");

export type SummarizeEndpointHealthResponse = z.infer<typeof SummarizeEndpointHealthResponseSchema>;
