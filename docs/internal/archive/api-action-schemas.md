# API Action Schemas - Zod Definitions

This document provides complete Zod schema definitions for all 17 public-facing actions, designed for both REST API implementation and AI agent (MCP) tool schemas.

---

## Design Principles

1. **AI-Friendly Descriptions**: Every field includes clear, concise descriptions that AI agents can understand
2. **Validation Built-In**: Schemas enforce type safety, required fields, and business rules
3. **OpenAPI Compatible**: Uses `@hono/zod-openapi` for automatic API documentation
4. **Consistent Patterns**: Similar actions share common patterns (userId, optional reason, timestamps)
5. **Example Values**: Real-world examples help AI agents understand expected inputs

---

## Common Schemas

### Base Types

```typescript
import { z } from "@hono/zod-openapi";

// User ID (always required for authorization)
const UserIdSchema = z.string().openapi({
  description: "User ID for authorization and tenant isolation",
  example: "user_abc123",
});

// Job ID
const JobIdSchema = z.string().openapi({
  description: "Unique identifier for a job container",
  example: "job_xyz789",
});

// Endpoint ID
const EndpointIdSchema = z.string().openapi({
  description: "Unique identifier for an endpoint within a job",
  example: "endpoint_def456",
});

// Run ID
const RunIdSchema = z.string().openapi({
  description: "Unique identifier for an execution run",
  example: "run_ghi789",
});

// Reason (optional audit trail)
const ReasonSchema = z.string().optional().openapi({
  description: "Optional reason for this action, used for audit trails and observability",
  example: "Traffic surge detected, tightening monitoring intervals",
});

// ISO 8601 timestamp
const TimestampSchema = z.string().datetime().openapi({
  description: "ISO 8601 timestamp in UTC",
  example: "2024-10-14T09:00:00Z",
});

// JSON value (for request/response bodies)
const JsonValueSchema = z.any().openapi({
  description: "Any valid JSON value (string, number, boolean, null, array, or object)",
});

// Cron expression
const CronExpressionSchema = z.string().openapi({
  description: "Standard cron expression for scheduling. Format: minute hour day month weekday. Use '*' for any value.",
  example: "0 9 * * 1-5",
});

// Interval in milliseconds
const IntervalMsSchema = z.number().int().positive().openapi({
  description: "Time interval in milliseconds",
  example: 300000, // 5 minutes
});

// HTTP method
const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).openapi({
  description: "HTTP method for the endpoint request",
  example: "POST",
});

// Execution status
const ExecutionStatusSchema = z.enum(["success", "failure"]).openapi({
  description: "Execution outcome: 'success' for HTTP 2xx responses, 'failure' for errors/timeouts",
  example: "success",
});

// Job/Endpoint status
const JobStatusSchema = z.enum(["active", "archived"]).openapi({
  description: "Job lifecycle status: 'active' jobs execute normally, 'archived' jobs are soft-deleted",
  example: "active",
});
```

---

## Category 1: Jobs Lifecycle (5 Actions)

### 1.1 Create Job

**Purpose**: Create a container for grouping related endpoints. Jobs organize monitoring, automation, or scheduled tasks under a single logical unit.

```typescript
// Request Schema
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
      description: "Optional detailed description of what this job does, when it runs, and why it exists. Useful for documentation and team onboarding.",
      example: "Monitors production API health with adaptive intervals. Tightens monitoring during traffic surges and auto-remediates common issues.",
    }),
}).openapi("CreateJobRequest");

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

// Response Schema
export const CreateJobResponseSchema = z.object({
  jobId: JobIdSchema,
  
  createdAt: TimestampSchema.openapi({
    description: "When this job was created",
  }),
}).openapi("CreateJobResponse");

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;
```

**AI Agent Usage**: Call this first when setting up a new monitoring scenario, automation workflow, or scheduled task group.

---

### 1.2 Get Job

**Purpose**: Fetch metadata and current state for a specific job. Returns job details including endpoint count and recent activity.

```typescript
// Request Schema
export const GetJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("GetJobRequest");

export type GetJobRequest = z.infer<typeof GetJobRequestSchema>;

// Response Schema
export const GetJobResponseSchema = z.object({
  id: JobIdSchema,
  
  name: z.string().openapi({
    description: "Job name",
    example: "Production Health Monitor",
  }),
  
  description: z.string().optional().openapi({
    description: "Job description",
  }),
  
  status: JobStatusSchema,
  
  endpointCount: z.number().int().nonnegative().openapi({
    description: "Number of endpoints attached to this job",
    example: 5,
  }),
  
  failureCount: z.number().int().nonnegative().openapi({
    description: "Number of endpoints currently in failed state across this job",
    example: 0,
  }),
  
  createdAt: TimestampSchema.openapi({
    description: "When this job was created",
  }),
  
  updatedAt: TimestampSchema.openapi({
    description: "When this job was last modified",
  }),
}).openapi("GetJobResponse");

export type GetJobResponse = z.infer<typeof GetJobResponseSchema>;
```

**AI Agent Usage**: Check job status and health before making adaptive decisions. Use endpointCount and failureCount to assess overall job state.

---

### 1.3 List Jobs

**Purpose**: Enumerate all jobs for a user, optionally filtered by status. Useful for dashboards and job discovery.

```typescript
// Request Schema
export const ListJobsRequestSchema = z.object({
  userId: UserIdSchema,
  
  status: JobStatusSchema.optional().openapi({
    description: "Filter jobs by status. Omit to return all jobs regardless of status.",
  }),
}).openapi("ListJobsRequest");

export type ListJobsRequest = z.infer<typeof ListJobsRequestSchema>;

// Response Schema
export const ListJobsResponseSchema = z.object({
  jobs: z.array(z.object({
    jobId: JobIdSchema,
    
    name: z.string().openapi({
      description: "Job name",
      example: "Production Health Monitor",
    }),
    
    status: JobStatusSchema,
    
    endpointCount: z.number().int().nonnegative().openapi({
      description: "Number of endpoints in this job",
      example: 5,
    }),
    
    lastRunAt: TimestampSchema.optional().openapi({
      description: "Most recent execution time across all endpoints in this job",
    }),
  })).openapi({
    description: "List of jobs matching the filter criteria",
  }),
}).openapi("ListJobsResponse");

export type ListJobsResponse = z.infer<typeof ListJobsResponseSchema>;
```

**AI Agent Usage**: Discover available jobs to monitor or manage. Filter by status to focus on active workloads.

---

### 1.4 Update Job

**Purpose**: Modify job metadata like name or description. Does not affect endpoint configurations or scheduling.

```typescript
// Request Schema
export const UpdateJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
  
  name: z.string()
    .min(1, "Name cannot be empty")
    .max(255, "Name must be 255 characters or less")
    .optional()
    .openapi({
      description: "New name for the job. Only provide if changing the name.",
      example: "Production Health Monitor (Updated)",
    }),
  
  description: z.string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .openapi({
      description: "New description for the job. Only provide if changing the description.",
    }),
}).openapi("UpdateJobRequest");

export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

// Response Schema
export const UpdateJobResponseSchema = z.object({
  updatedAt: TimestampSchema.openapi({
    description: "When this update was applied",
  }),
}).openapi("UpdateJobResponse");

export type UpdateJobResponse = z.infer<typeof UpdateJobResponseSchema>;
```

**AI Agent Usage**: Update job metadata when its purpose or scope changes. Partial updates are supported (only provide fields to change).

---

### 1.5 Archive Job

**Purpose**: Soft-delete a job, preserving execution history but stopping all future runs. Archived jobs can be queried but not executed.

```typescript
// Request Schema
export const ArchiveJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("ArchiveJobRequest");

export type ArchiveJobRequest = z.infer<typeof ArchiveJobRequestSchema>;

// Response Schema
export const ArchiveJobResponseSchema = z.object({
  archivedAt: TimestampSchema.openapi({
    description: "When this job was archived",
  }),
}).openapi("ArchiveJobResponse");

export type ArchiveJobResponse = z.infer<typeof ArchiveJobResponseSchema>;
```

**AI Agent Usage**: Archive jobs that are no longer needed (e.g., campaign ended, temporary monitoring concluded). Preserves historical data for analysis.

---

## Category 2: Endpoint Orchestration (4 Actions)

### 2.1 Add Endpoint to Job

**Purpose**: Attach an executable endpoint to a job. Endpoints define the HTTP request to execute and the baseline scheduling cadence.

```typescript
// Request Schema
export const AddEndpointToJobRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
  
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .openapi({
      description: "Human-readable name for this endpoint. Should describe what it checks or does.",
      example: "check_api_latency",
    }),
  
  url: z.string()
    .url("Must be a valid HTTP/HTTPS URL")
    .openapi({
      description: "HTTP endpoint URL to call when this endpoint executes",
      example: "https://api.example.com/health/latency",
    }),
  
  method: HttpMethodSchema.default("GET").openapi({
    description: "HTTP method for the request. Defaults to GET if not specified.",
  }),
  
  headers: z.record(z.string()).optional().openapi({
    description: "HTTP headers to include in the request. Useful for authentication, content-type, etc.",
    example: {
      "Authorization": "Bearer token123",
      "Content-Type": "application/json",
    },
  }),
  
  body: JsonValueSchema.optional().openapi({
    description: "JSON body to send with POST/PUT/PATCH requests. Ignored for GET/DELETE.",
    example: { check: "latency", threshold: 200 },
  }),
  
  baseline: z.object({
    cron: CronExpressionSchema.optional().openapi({
      description: "Cron expression for baseline scheduling. Exactly one of 'cron' or 'intervalMs' must be provided.",
    }),
    
    intervalMs: IntervalMsSchema.optional().openapi({
      description: "Fixed interval in milliseconds for baseline scheduling. Exactly one of 'cron' or 'intervalMs' must be provided.",
    }),
  }).refine(
    data => (data.cron && !data.intervalMs) || (!data.cron && data.intervalMs),
    { message: "Exactly one of 'cron' or 'intervalMs' must be provided" }
  ).optional().openapi({
    description: "Baseline scheduling cadence. If omitted, endpoint must be triggered via one-shot scheduling.",
  }),
  
  clamp: z.object({
    minIntervalMs: IntervalMsSchema.optional().openapi({
      description: "Minimum allowed interval between runs (milliseconds). AI hints are clamped to this floor. Prevents excessive execution.",
      example: 60000, // 1 minute
    }),
    
    maxIntervalMs: IntervalMsSchema.optional().openapi({
      description: "Maximum allowed interval between runs (milliseconds). AI hints are clamped to this ceiling. Prevents under-monitoring.",
      example: 3600000, // 1 hour
    }),
  }).optional().openapi({
    description: "Optional guardrails to constrain adaptive scheduling within acceptable bounds",
  }),
  
  timeoutMs: z.number()
    .int()
    .positive()
    .default(30000)
    .openapi({
      description: "Request timeout in milliseconds. Defaults to 30 seconds if not specified.",
      example: 30000,
    }),
}).openapi("AddEndpointToJobRequest");

export type AddEndpointToJobRequest = z.infer<typeof AddEndpointToJobRequestSchema>;

// Response Schema
export const AddEndpointToJobResponseSchema = z.object({
  endpointId: EndpointIdSchema,
  
  nextRunAt: TimestampSchema.openapi({
    description: "When this endpoint is scheduled to execute next (calculated from baseline)",
  }),
}).openapi("AddEndpointToJobResponse");

export type AddEndpointToJobResponse = z.infer<typeof AddEndpointToJobResponseSchema>;
```

**AI Agent Usage**: Create endpoints for monitoring, health checks, recovery actions, alerts, etc. Configure baseline cadence and clamps to establish execution boundaries.

---

### 2.2 Update Endpoint Config

**Purpose**: Modify endpoint execution details like URL, headers, timeout, or clamps. Does not change scheduling hints or pause state.

```typescript
// Request Schema
export const UpdateEndpointConfigRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  url: z.string()
    .url("Must be a valid HTTP/HTTPS URL")
    .optional()
    .openapi({
      description: "New URL for the endpoint. Only provide if changing the URL.",
    }),
  
  method: HttpMethodSchema.optional().openapi({
    description: "New HTTP method. Only provide if changing the method.",
  }),
  
  headers: z.record(z.string()).optional().openapi({
    description: "New HTTP headers. Only provide if changing headers. Replaces existing headers entirely.",
  }),
  
  body: JsonValueSchema.optional().openapi({
    description: "New JSON body. Only provide if changing the body. Replaces existing body entirely.",
  }),
  
  clamp: z.object({
    minIntervalMs: IntervalMsSchema.optional(),
    maxIntervalMs: IntervalMsSchema.optional(),
  }).optional().openapi({
    description: "New guardrail clamps. Only provide if changing clamps. Partial updates supported.",
  }),
  
  timeoutMs: z.number()
    .int()
    .positive()
    .optional()
    .openapi({
      description: "New request timeout (milliseconds). Only provide if changing timeout.",
    }),
}).openapi("UpdateEndpointConfigRequest");

export type UpdateEndpointConfigRequest = z.infer<typeof UpdateEndpointConfigRequestSchema>;

// Response Schema
export const UpdateEndpointConfigResponseSchema = z.object({
  updatedAt: TimestampSchema.openapi({
    description: "When this configuration was updated",
  }),
}).openapi("UpdateEndpointConfigResponse");

export type UpdateEndpointConfigResponse = z.infer<typeof UpdateEndpointConfigResponseSchema>;
```

**AI Agent Usage**: Update endpoint configuration when external APIs change, credentials rotate, or guardrails need adjustment. Partial updates supported.

---

### 2.3 Delete Endpoint

**Purpose**: Remove an endpoint from a job. Stops future execution but preserves historical run data for this endpoint.

```typescript
// Request Schema
export const DeleteEndpointRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
}).openapi("DeleteEndpointRequest");

export type DeleteEndpointRequest = z.infer<typeof DeleteEndpointRequestSchema>;

// Response Schema
export const DeleteEndpointResponseSchema = z.object({
  deletedAt: TimestampSchema.openapi({
    description: "When this endpoint was deleted",
  }),
}).openapi("DeleteEndpointResponse");

export type DeleteEndpointResponse = z.infer<typeof DeleteEndpointResponseSchema>;
```

**AI Agent Usage**: Remove endpoints that are no longer needed (e.g., deprecated health checks, completed one-time tasks).

---

### 2.4 List Job Endpoints

**Purpose**: Enumerate all endpoints within a job. Returns current state including next run time, failure counts, and pause status.

```typescript
// Request Schema
export const ListJobEndpointsRequestSchema = z.object({
  jobId: JobIdSchema,
  userId: UserIdSchema,
}).openapi("ListJobEndpointsRequest");

export type ListJobEndpointsRequest = z.infer<typeof ListJobEndpointsRequestSchema>;

// Response Schema
export const ListJobEndpointsResponseSchema = z.object({
  endpoints: z.array(z.object({
    endpointId: EndpointIdSchema,
    
    name: z.string().openapi({
      description: "Endpoint name",
      example: "check_api_latency",
    }),
    
    nextRunAt: TimestampSchema.openapi({
      description: "When this endpoint is scheduled to execute next",
    }),
    
    lastRunAt: TimestampSchema.optional().openapi({
      description: "When this endpoint last executed",
    }),
    
    failureCount: z.number().int().nonnegative().openapi({
      description: "Consecutive failure count. Reset to 0 on successful execution.",
      example: 0,
    }),
    
    pausedUntil: TimestampSchema.optional().openapi({
      description: "If present, endpoint is paused until this time. Omitted if endpoint is active.",
    }),
  })).openapi({
    description: "List of endpoints in this job",
  }),
}).openapi("ListJobEndpointsResponse");

export type ListJobEndpointsResponse = z.infer<typeof ListJobEndpointsResponseSchema>;
```

**AI Agent Usage**: Assess job composition and endpoint health. Use failureCount and pausedUntil to identify issues or paused endpoints.

---

## Category 3: Adaptive Scheduling Control (5 Actions)

### 3.1 Apply Interval Hint

**Purpose**: Dynamically adjust endpoint execution frequency. AI agents use this to tighten monitoring during issues or relax after recovery.

```typescript
// Request Schema
export const ApplyIntervalHintRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  intervalMs: IntervalMsSchema.openapi({
    description: "Desired interval between executions (milliseconds). Will be clamped to endpoint's min/max if configured. Hint expires after ttlMinutes.",
    example: 30000, // 30 seconds
  }),
  
  ttlMinutes: z.number()
    .int()
    .positive()
    .default(60)
    .openapi({
      description: "How long this hint remains active (minutes). After expiration, endpoint reverts to baseline cadence. Defaults to 60 minutes.",
      example: 20,
    }),
  
  reason: ReasonSchema.openapi({
    description: "Why this interval adjustment is being made. Used for observability and audit logs.",
    example: "Traffic surge detected, tightening latency checks to 30s",
  }),
}).openapi("ApplyIntervalHintRequest");

export type ApplyIntervalHintRequest = z.infer<typeof ApplyIntervalHintRequestSchema>;

// Response Schema
export const ApplyIntervalHintResponseSchema = z.object({
  hintExpiresAt: TimestampSchema.openapi({
    description: "When this interval hint will expire and endpoint reverts to baseline",
  }),
  
  nextRunAt: TimestampSchema.openapi({
    description: "When the endpoint will execute next using the new interval",
  }),
}).openapi("ApplyIntervalHintResponse");

export type ApplyIntervalHintResponse = z.infer<typeof ApplyIntervalHintResponseSchema>;
```

**AI Agent Usage**: Primary tool for adaptive monitoring. Tighten intervals during incidents (e.g., traffic surges, errors) and relax after resolution. Hints auto-expire to prevent permanent state changes.

---

### 3.2 Schedule One-Shot Run

**Purpose**: Schedule a single execution at a specific time. Used for investigations, recovery actions, and alerts that should run once, not repeatedly.

```typescript
// Request Schema
export const ScheduleOneShotRunRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  runAt: TimestampSchema.openapi({
    description: "ISO 8601 timestamp when this endpoint should execute once. Must be in the future.",
    example: "2024-10-14T09:30:00Z",
  }),
  
  ttlMinutes: z.number()
    .int()
    .positive()
    .default(60)
    .openapi({
      description: "How long this one-shot scheduling remains active (minutes). If the endpoint doesn't execute within this window (e.g., scheduler downtime), the one-shot is discarded. Defaults to 60 minutes.",
      example: 30,
    }),
  
  reason: ReasonSchema.openapi({
    description: "Why this one-shot execution is being scheduled. Used for observability and audit logs.",
    example: "Slow queries detected, running database trace analysis",
  }),
}).openapi("ScheduleOneShotRunRequest");

export type ScheduleOneShotRunRequest = z.infer<typeof ScheduleOneShotRunRequestSchema>;

// Response Schema
export const ScheduleOneShotRunResponseSchema = z.object({
  scheduledFor: TimestampSchema.openapi({
    description: "Confirms when the one-shot execution is scheduled",
  }),
}).openapi("ScheduleOneShotRunResponse");

export type ScheduleOneShotRunResponse = z.infer<typeof ScheduleOneShotRunResponseSchema>;
```

**AI Agent Usage**: Trigger investigations, recovery actions, or alerts that should execute once. Use for conditional workflows (e.g., "If error rate > 5%, run root cause analyzer in 1 minute").

---

### 3.3 Pause or Resume Endpoint

**Purpose**: Temporarily disable endpoint execution or reactivate a paused endpoint. Used for conditional activation and maintenance windows.

```typescript
// Request Schema
export const PauseOrResumeEndpointRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  pauseUntil: TimestampSchema.nullable().optional().openapi({
    description: "Pause endpoint until this time (ISO 8601). Provide a future timestamp to pause, or null to resume immediately. Omit to query current pause state without changing it.",
    example: "2024-10-15T00:00:00Z",
  }),
  
  reason: ReasonSchema.openapi({
    description: "Why this pause/resume action is being taken. Used for observability and audit logs.",
    example: "Investigation endpoint paused until database issues are detected",
  }),
}).openapi("PauseOrResumeEndpointRequest");

export type PauseOrResumeEndpointRequest = z.infer<typeof PauseOrResumeEndpointRequestSchema>;

// Response Schema
export const PauseOrResumeEndpointResponseSchema = z.object({
  pausedUntil: TimestampSchema.nullable().optional().openapi({
    description: "Current pause state: timestamp if paused, null if active, omitted if never paused",
  }),
}).openapi("PauseOrResumeEndpointResponse");

export type PauseOrResumeEndpointResponse = z.infer<typeof PauseOrResumeEndpointResponseSchema>;
```

**AI Agent Usage**: Implement conditional endpoint activation. Pause investigation/recovery endpoints until issues are detected, then resume. Pause noisy alerts during recovery. Set pauseUntil=null to resume.

---

### 3.4 Clear Adaptive Hints

**Purpose**: Remove all AI-applied hints (interval and one-shot) and revert endpoint to baseline scheduling. Clean slate for endpoint state.

```typescript
// Request Schema
export const ClearAdaptiveHintsRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  reason: ReasonSchema.openapi({
    description: "Why hints are being cleared. Used for observability and audit logs.",
    example: "Flash sale ended, reverting all monitoring to baseline cadence",
  }),
}).openapi("ClearAdaptiveHintsRequest");

export type ClearAdaptiveHintsRequest = z.infer<typeof ClearAdaptiveHintsRequestSchema>;

// Response Schema
export const ClearAdaptiveHintsResponseSchema = z.object({
  clearedAt: TimestampSchema.openapi({
    description: "When hints were cleared",
  }),
  
  nextRunAt: TimestampSchema.openapi({
    description: "When endpoint will execute next using baseline cadence (no hints)",
  }),
}).openapi("ClearAdaptiveHintsResponse");

export type ClearAdaptiveHintsResponse = z.infer<typeof ClearAdaptiveHintsResponseSchema>;
```

**AI Agent Usage**: Reset endpoint to baseline after events conclude (e.g., flash sale ends, incident resolved). Ensures clean state without lingering hints.

---

### 3.5 Reset Failure Count

**Purpose**: Manually reset consecutive failure count to zero. Used after deploying fixes to prevent exponential backoff from stale failures.

```typescript
// Request Schema
export const ResetFailureCountRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  reason: ReasonSchema.openapi({
    description: "Why failures are being reset. Used for observability and audit logs.",
    example: "Deployed fix for broken CSS selector in scraper, resetting failures",
  }),
}).openapi("ResetFailureCountRequest");

export type ResetFailureCountRequest = z.infer<typeof ResetFailureCountRequestSchema>;

// Response Schema
export const ResetFailureCountResponseSchema = z.object({
  failureCount: z.number().int().nonnegative().openapi({
    description: "Current failure count after reset (should be 0)",
    example: 0,
  }),
}).openapi("ResetFailureCountResponse");

export type ResetFailureCountResponse = z.infer<typeof ResetFailureCountResponseSchema>;
```

**AI Agent Usage**: Reset failures after confirming fixes are deployed. Prevents scheduler from continuing to back off due to old failures.

---

## Category 4: Execution Visibility & Insights (3 Actions)

### 4.1 List Runs

**Purpose**: Fetch execution history with flexible filtering. Use for debugging, pattern analysis, and health monitoring.

```typescript
// Request Schema
export const ListRunsRequestSchema = z.object({
  userId: UserIdSchema,
  
  jobId: JobIdSchema.optional().openapi({
    description: "Filter runs to a specific job. Omit to see runs across all jobs.",
  }),
  
  endpointId: EndpointIdSchema.optional().openapi({
    description: "Filter runs to a specific endpoint. Omit to see runs across all endpoints.",
  }),
  
  status: ExecutionStatusSchema.optional().openapi({
    description: "Filter by execution status. Omit to see all runs regardless of outcome.",
  }),
  
  limit: z.number()
    .int()
    .positive()
    .max(100)
    .default(50)
    .openapi({
      description: "Maximum number of runs to return. Defaults to 50, max 100.",
      example: 50,
    }),
  
  offset: z.number()
    .int()
    .nonnegative()
    .default(0)
    .openapi({
      description: "Number of runs to skip for pagination. Defaults to 0.",
      example: 0,
    }),
}).openapi("ListRunsRequest");

export type ListRunsRequest = z.infer<typeof ListRunsRequestSchema>;

// Response Schema
export const ListRunsResponseSchema = z.object({
  runs: z.array(z.object({
    runId: RunIdSchema,
    
    endpointId: EndpointIdSchema,
    
    startedAt: TimestampSchema.openapi({
      description: "When this run started",
    }),
    
    status: ExecutionStatusSchema,
    
    durationMs: z.number().int().nonnegative().openapi({
      description: "How long the execution took (milliseconds). Includes timeout cases.",
      example: 152,
    }),
    
    source: z.string().openapi({
      description: "What triggered this execution: 'baseline-cron', 'baseline-interval', 'ai-interval', 'ai-oneshot', 'clamped-min', 'clamped-max', 'paused', etc.",
      example: "ai-interval",
    }),
  })).openapi({
    description: "List of runs matching filter criteria, ordered by startedAt descending (most recent first)",
  }),
  
  total: z.number().int().nonnegative().openapi({
    description: "Total number of runs matching the filter (before limit/offset). Use for pagination.",
    example: 237,
  }),
}).openapi("ListRunsResponse");

export type ListRunsResponse = z.infer<typeof ListRunsResponseSchema>;
```

**AI Agent Usage**: Analyze execution patterns, identify failure trends, understand what triggered runs (baseline vs AI hints). Use `source` field to attribute scheduling decisions.

---

### 4.2 Get Run Details

**Purpose**: Fetch detailed information about a specific execution, including error messages and timing breakdown.

```typescript
// Request Schema
export const GetRunDetailsRequestSchema = z.object({
  runId: RunIdSchema,
  userId: UserIdSchema,
}).openapi("GetRunDetailsRequest");

export type GetRunDetailsRequest = z.infer<typeof GetRunDetailsRequestSchema>;

// Response Schema
export const GetRunDetailsResponseSchema = z.object({
  id: RunIdSchema,
  
  endpointId: EndpointIdSchema,
  
  status: ExecutionStatusSchema,
  
  startedAt: TimestampSchema.openapi({
    description: "When execution began",
  }),
  
  finishedAt: TimestampSchema.optional().openapi({
    description: "When execution completed. Omitted if still running (rare, only during active execution).",
  }),
  
  durationMs: z.number().int().nonnegative().openapi({
    description: "Execution duration in milliseconds",
    example: 152,
  }),
  
  errorMessage: z.string().optional().openapi({
    description: "Error details if status is 'failure'. Includes HTTP status codes, timeout messages, or network errors.",
    example: "HTTP 500: Internal Server Error",
  }),
  
  source: z.string().openapi({
    description: "What triggered this execution",
    example: "ai-oneshot",
  }),
  
  attempt: z.number().int().positive().openapi({
    description: "Attempt number (based on failure count at execution time). First attempt is 1.",
    example: 1,
  }),
}).openapi("GetRunDetailsResponse");

export type GetRunDetailsResponse = z.infer<typeof GetRunDetailsResponseSchema>;
```

**AI Agent Usage**: Investigate specific failures, understand error messages, analyze timing. Use for root cause analysis and debugging.

---

### 4.3 Summarize Endpoint Health

**Purpose**: Quick health snapshot for an endpoint over a time window. Returns success/failure counts and recent execution summary.

```typescript
// Request Schema
export const SummarizeEndpointHealthRequestSchema = z.object({
  endpointId: EndpointIdSchema,
  userId: UserIdSchema,
  
  windowHours: z.number()
    .int()
    .positive()
    .max(168) // 1 week
    .default(24)
    .openapi({
      description: "Time window for health summary (hours). Defaults to 24 hours, max 168 (1 week).",
      example: 24,
    }),
}).openapi("SummarizeEndpointHealthRequest");

export type SummarizeEndpointHealthRequest = z.infer<typeof SummarizeEndpointHealthRequestSchema>;

// Response Schema
export const SummarizeEndpointHealthResponseSchema = z.object({
  successCount: z.number().int().nonnegative().openapi({
    description: "Number of successful executions in the time window",
    example: 143,
  }),
  
  failureCount: z.number().int().nonnegative().openapi({
    description: "Number of failed executions in the time window",
    example: 2,
  }),
  
  avgDurationMs: z.number().nonnegative().openapi({
    description: "Average execution duration across all runs in the window (milliseconds)",
    example: 156.7,
  }),
  
  lastRun: z.object({
    status: ExecutionStatusSchema,
    
    at: TimestampSchema.openapi({
      description: "When the last run occurred",
    }),
  }).optional().openapi({
    description: "Most recent execution summary. Omitted if no runs in the window.",
  }),
  
  failureStreak: z.number().int().nonnegative().openapi({
    description: "Current consecutive failure count (across all time, not just the window). Reset to 0 on successful execution.",
    example: 0,
  }),
}).openapi("SummarizeEndpointHealthResponse");

export type SummarizeEndpointHealthResponse = z.infer<typeof SummarizeEndpointHealthResponseSchema>;
```

**AI Agent Usage**: Assess endpoint health before making adaptive decisions. Use success/failure ratio to determine if issues are transient or persistent. Check failureStreak to understand backoff state.

---

## Usage Examples for AI Agents

### Example 1: Flash Sale Monitoring Setup

```typescript
// 1. Create job container
const jobResponse = await createJob({
  userId: "user_abc123",
  name: "Black Friday Flash Sale Monitor",
  description: "Multi-tier monitoring with adaptive intervals and auto-remediation",
});

// 2. Add health check endpoint
const healthEndpoint = await addEndpointToJob({
  jobId: jobResponse.jobId,
  userId: "user_abc123",
  name: "traffic_monitor",
  url: "https://api.example.com/metrics/traffic",
  method: "GET",
  baseline: {
    intervalMs: 300000, // 5 minutes baseline
  },
  clamp: {
    minIntervalMs: 20000,  // Don't check more than every 20s
    maxIntervalMs: 900000, // Don't check less than every 15min
  },
});

// 3. Add investigation endpoint (paused initially)
const investigationEndpoint = await addEndpointToJob({
  jobId: jobResponse.jobId,
  userId: "user_abc123",
  name: "slow_page_analyzer",
  url: "https://api.example.com/analyze/slow-pages",
  method: "POST",
  baseline: {
    intervalMs: 120000, // 2 minutes when active
  },
});

await pauseOrResumeEndpoint({
  endpointId: investigationEndpoint.endpointId,
  userId: "user_abc123",
  pauseUntil: "2099-12-31T23:59:59Z", // Paused until manually activated
  reason: "Investigation only needed during traffic surges",
});
```

### Example 2: Adaptive Response to Traffic Surge

```typescript
// Check traffic endpoint health
const healthSummary = await summarizeEndpointHealth({
  endpointId: "endpoint_traffic",
  userId: "user_abc123",
  windowHours: 1,
});

// If traffic is high and pages are slow, tighten monitoring
if (trafficIsHigh && pagesAreSlow) {
  // Tighten health check to every 30 seconds for 20 minutes
  await applyIntervalHint({
    endpointId: "endpoint_traffic",
    userId: "user_abc123",
    intervalMs: 30000,
    ttlMinutes: 20,
    reason: "Traffic surge detected, tightening monitoring to 30s intervals",
  });
  
  // Activate investigation endpoint
  await pauseOrResumeEndpoint({
    endpointId: "endpoint_slow_page_analyzer",
    userId: "user_abc123",
    pauseUntil: null, // Resume immediately
    reason: "Traffic high and pages slow, activating page analyzer",
  });
  
  // Schedule one-shot recovery action in 2 minutes
  await scheduleOneShotRun({
    endpointId: "endpoint_cache_warmup",
    userId: "user_abc123",
    runAt: new Date(Date.now() + 120000).toISOString(),
    ttlMinutes: 10,
    reason: "Slow pages detected, scheduling cache warm-up",
  });
}
```

### Example 3: Post-Incident Recovery

```typescript
// After incident resolves, clean up adaptive state
await clearAdaptiveHints({
  endpointId: "endpoint_traffic",
  userId: "user_abc123",
  reason: "Flash sale ended, reverting to baseline monitoring",
});

await pauseOrResumeEndpoint({
  endpointId: "endpoint_slow_page_analyzer",
  userId: "user_abc123",
  pauseUntil: "2099-12-31T23:59:59Z",
  reason: "Investigation no longer needed, pausing analyzer",
});

// Review execution history
const runs = await listRuns({
  userId: "user_abc123",
  jobId: "job_flashsale",
  limit: 100,
});

// Analyze what happened during the surge
runs.runs.forEach(run => {
  console.log(`${run.source}: ${run.status} in ${run.durationMs}ms`);
});
```

---

## Implementation Checklist

### Phase 1: Jobs Lifecycle
- [ ] `POST /jobs` - createJob
- [ ] `GET /jobs/:id` - getJob
- [ ] `GET /jobs` - listJobs
- [ ] `PATCH /jobs/:id` - updateJob
- [ ] `DELETE /jobs/:id` - archiveJob

### Phase 2: Endpoint Orchestration
- [ ] `POST /jobs/:jobId/endpoints` - addEndpointToJob
- [ ] `PATCH /jobs/:jobId/endpoints/:id` - updateEndpointConfig
- [ ] `DELETE /jobs/:jobId/endpoints/:id` - deleteEndpoint
- [ ] `GET /jobs/:jobId/endpoints` - listJobEndpoints

### Phase 3: Adaptive Scheduling Control
- [ ] `POST /jobs/:jobId/endpoints/:id/hints/interval` - applyIntervalHint
- [ ] `POST /jobs/:jobId/endpoints/:id/hints/one-shot` - scheduleOneShotRun
- [ ] `POST /jobs/:jobId/endpoints/:id/pause` - pauseOrResumeEndpoint
- [ ] `DELETE /jobs/:jobId/endpoints/:id/hints` - clearAdaptiveHints
- [ ] `POST /jobs/:jobId/endpoints/:id/reset-failures` - resetFailureCount

### Phase 4: Execution Visibility
- [ ] `GET /runs` - listRuns
- [ ] `GET /runs/:id` - getRunDetails
- [ ] `GET /jobs/:jobId/endpoints/:id/health` - summarizeEndpointHealth

---

## MCP Tool Schema Example

Here's how these Zod schemas map to MCP tool definitions for AI agents:

```typescript
// Example MCP tool for applyIntervalHint
{
  name: "apply_interval_hint",
  description: "Dynamically adjust how often an endpoint executes. Use this to tighten monitoring during incidents or relax after recovery. Hints expire automatically.",
  inputSchema: {
    type: "object",
    properties: {
      endpointId: {
        type: "string",
        description: "Unique identifier for the endpoint to adjust",
      },
      userId: {
        type: "string",
        description: "User ID for authorization",
      },
      intervalMs: {
        type: "number",
        description: "Desired interval between executions (milliseconds). Will be clamped to endpoint's configured min/max.",
      },
      ttlMinutes: {
        type: "number",
        description: "How long this hint remains active (minutes). After expiration, endpoint reverts to baseline. Defaults to 60.",
        default: 60,
      },
      reason: {
        type: "string",
        description: "Why you're making this adjustment (for audit logs)",
      },
    },
    required: ["endpointId", "userId", "intervalMs"],
  },
}
```

---

## Notes for Implementation

1. **Validation Order**: Validate userId/authorization first, then schema validation, then business rules
2. **Error Messages**: Return clear, actionable error messages that AI agents can understand
3. **Idempotency**: Actions like pause (already paused) should succeed with current state
4. **Timestamps**: Always use ISO 8601 format in UTC for consistency
5. **Pagination**: Implement cursor-based pagination if offset-based proves insufficient
6. **Rate Limiting**: Consider rate limits per user for AI agent protection
7. **Audit Logging**: Log all adaptive control actions with userId, reason, and timestamp

---

## Conclusion

These 17 Zod schemas provide:
- ✅ **Type Safety**: Compile-time validation and editor autocomplete
- ✅ **Runtime Validation**: Automatic request/response validation
- ✅ **OpenAPI Generation**: Auto-generate API documentation
- ✅ **MCP Compatibility**: Schema structure maps directly to MCP tool definitions
- ✅ **AI-Friendly**: Clear descriptions and examples for autonomous agents
- ✅ **Consistent Patterns**: Similar actions follow predictable structures

Use these schemas as the foundation for both REST API implementation and MCP server tool definitions.
