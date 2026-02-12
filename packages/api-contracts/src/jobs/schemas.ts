import { z } from "@hono/zod-openapi";
import cronParser from "cron-parser";

// ==================== Endpoint Orchestration Schemas ====================
import * as base from "./schemas.base.js";

// ==================== Job Lifecycle Schemas ====================

/**
 * These schemas extend the base schemas with OpenAPI decorations.
 * For clients that don't need OpenAPI (MCP, web forms), import from schemas.base.ts
 */

// ==================== Route Descriptions ====================
// Centralized descriptions for use by both API and MCP server

// Job Routes
export const CreateJobSummary = "Create a new job";
export const CreateJobDescription = "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use the addEndpoint tool to add executable endpoints.";

export const GetJobSummary = "Get a job by ID";
export const GetJobDescription = "Retrieve a single job by ID. Returns full job details including status and timestamps.";

export const ListJobsSummary = "List all jobs";
export const ListJobsDescription = "List all jobs for the authenticated user. Optionally filter by status (active, paused, archived). Returns jobs with endpoint counts.";

export const UpdateJobSummary = "Update a job";
export const UpdateJobDescription = "Update job name or description. All fields are optional - only provided fields will be updated.";

export const ArchiveJobSummary = "Archive a job";
export const ArchiveJobDescription = "Archive a job (soft delete). The job status will be set to 'archived' and an archivedAt timestamp will be recorded. Archived jobs can be recovered if needed.";

export const PauseJobSummary = "Pause a job";
export const PauseJobDescription = "Pause a job. The job status will be set to 'paused' and all associated endpoints will stop executing until resumed.";

export const ResumeJobSummary = "Resume a job";
export const ResumeJobDescription = "Resume a paused job. The job status will be set to 'active' and all associated endpoints will resume executing on their schedules.";

// ==================== Request/Response Schemas ====================

export const GetJobRequestSchema = z.object({
  id: z.string().openapi({
    description: "Job ID",
    example: "job_1234567890abcdef",
  }).describe("Job ID"),
});

export const CreateJobRequestSchema = z.object({
  name: z.string().min(1).max(255).openapi({
    description: "Job name",
    example: "Daily sales report",
  }).describe("Job name"),
  description: z.string().max(1000).optional().openapi({
    description: "Job description",
    example: "Generates daily sales metrics",
  }).describe("Job description"),
});

export const UpdateJobRequestSchema = z.object({
  name: z.string().min(1).max(255).optional().describe("Job name"),
  description: z.string().max(1000).optional().describe("Job description"),
});

export const JobResponseSchema = z.object({
  id: z.string().describe("Job ID"),
  userId: z.string().describe("User ID"),
  name: z.string().describe("Job name"),
  description: z.string().optional().describe("Job description"),
  status: z.enum(["active", "paused", "archived"]).describe("Job status"),
  createdAt: z.string().datetime().describe("Creation timestamp"),
  updatedAt: z.string().datetime().describe("Last update timestamp"),
  archivedAt: z.string().datetime().optional().describe("Archive timestamp"),
});

export const JobWithCountResponseSchema = JobResponseSchema.extend({
  endpointCount: z.number().int().describe("Number of endpoints in this job"),
});

// Helper function to validate cron expressions
function validateCronExpression(expr: string): boolean {
  try {
    cronParser.parseExpression(expr, { utc: true });
    return true;
  }
  catch {
    return false;
  }
}

// ==================== Endpoint Orchestration Descriptions ====================

export const AddEndpointSummary = "Add endpoint to job";
export const AddEndpointDescription = "Add an endpoint to a job. Must provide either baselineCron OR baselineIntervalMs (not both). The endpoint will execute according to the baseline schedule and can be dynamically adjusted with AI hints.";

export const GetEndpointSummary = "Get endpoint by ID";
export const GetEndpointDescription = "Retrieve a single endpoint by ID. Returns full configuration including baseline schedule, AI hints, execution settings, and current state.";

export const ListEndpointsSummary = "List job endpoints";
export const ListEndpointsDescription = "List all endpoints for a job. Returns complete endpoint configurations including schedules, AI hints, and execution settings.";

export const UpdateEndpointSummary = "Update endpoint";
export const UpdateEndpointDescription = "Update endpoint configuration. All fields are optional - only provided fields will be updated.";

export const DeleteEndpointSummary = "Delete endpoint";
export const DeleteEndpointDescription = "Permanently delete an endpoint. This action cannot be undone. All associated run history will be deleted.";

export const ArchiveEndpointSummary = "Archive endpoint";
export const ArchiveEndpointDescription = "Archive an endpoint (soft delete). The endpoint will be marked as archived and will no longer count toward quota limits or be scheduled for execution. Archived endpoints can be permanently deleted later if needed.";

// ==================== Endpoint Request/Response Schemas ====================

const EndpointFieldsBaseSchema = z.object({
  name: z.string().min(1).max(255).describe("Endpoint name"),
  description: z
    .string()
    .max(2000)
    .optional()
    .openapi({
      description: "Endpoint-specific context: what it does, response schema, thresholds, coordination logic",
      example: "Monitors website traffic and page load times. Returns {visitors: number, loadTimeMs: number}. Normal: <1000 visitors/min, Surge: >3000. Tighten from 5min to 30s during surge.",
    })
    .describe("Endpoint-specific context: what it does, response schema, thresholds, coordination logic"),
  baselineCron: z
    .string()
    .optional()
    .refine(
      val => !val || validateCronExpression(val),
      { message: "Invalid cron expression. Use standard 5-field format (minute hour day month weekday)" },
    )
    .describe("Baseline cron expression (standard 5-field format)"),
  baselineIntervalMs: z.number().int().positive().optional().describe("Baseline interval in milliseconds"),
  minIntervalMs: z.number().int().positive().optional().describe("Minimum interval in milliseconds"),
  maxIntervalMs: z.number().int().positive().optional().describe("Maximum interval in milliseconds"),
  url: z.string().url().describe("HTTP endpoint URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET").describe("HTTP method"),
  headersJson: z.record(z.string(), z.string()).optional().describe("HTTP headers as key-value pairs"),
  bodyJson: z.any().optional().describe("Request body (JSON)"),
  timeoutMs: z.number().int().positive().optional().describe("Request timeout in milliseconds"),
  maxExecutionTimeMs: z
    .number()
    .int()
    .positive()
    .max(1800000)
    .optional()
    .openapi({
      description: "Maximum expected execution time in milliseconds (for lock duration). Default: 60000 (1 minute). Max: 1800000 (30 minutes).",
      example: 120000,
    })
    .describe("Maximum expected execution time in milliseconds (for lock duration). Default: 60000 (1 minute). Max: 1800000 (30 minutes)."),
  maxResponseSizeKb: z.number().int().positive().optional().describe("Maximum response size in kilobytes"),
});

const EndpointFieldsSchema = EndpointFieldsBaseSchema.refine(
  data => !data.minIntervalMs || !data.maxIntervalMs || data.minIntervalMs <= data.maxIntervalMs,
  {
    message: "minIntervalMs must be less than or equal to maxIntervalMs",
    path: ["minIntervalMs"],
  },
);

export const AddEndpointRequestSchema = EndpointFieldsSchema.refine(
  data =>
    // XOR condition: exactly one must be provided
    (data.baselineCron && !data.baselineIntervalMs)
    || (!data.baselineCron && data.baselineIntervalMs),
  {
    message: "Provide either baselineCron or baselineIntervalMs, but not both.",
    path: ["baselineCron"],
  },
);

export const UpdateEndpointRequestSchema = EndpointFieldsBaseSchema.partial().refine(
  data => !data.minIntervalMs || !data.maxIntervalMs || data.minIntervalMs <= data.maxIntervalMs,
  {
    message: "minIntervalMs must be less than or equal to maxIntervalMs",
    path: ["minIntervalMs"],
  },
);

export const EndpointResponseSchema = z.object({
  id: z.string().describe("Endpoint ID"),
  jobId: z.string().optional().describe("Parent job ID"),
  name: z.string().describe("Endpoint name"),
  description: z.string().optional().describe("Endpoint description"),
  baselineCron: z.string().optional().describe("Baseline cron expression"),
  baselineIntervalMs: z.number().optional().describe("Baseline interval in milliseconds"),
  minIntervalMs: z.number().optional().describe("Minimum interval in milliseconds"),
  maxIntervalMs: z.number().optional().describe("Maximum interval in milliseconds"),
  nextRunAt: z.string().datetime().describe("Next scheduled run time"),
  lastRunAt: z.string().datetime().optional().describe("Last run time"),
  failureCount: z.number().int().describe("Consecutive failure count"),
  pausedUntil: z.string().datetime().optional().describe("Pause expiration time"),
  archivedAt: z.string().datetime().optional().describe("Archive timestamp (soft delete)"),
  url: z.string().optional().describe("HTTP endpoint URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("HTTP method"),
  headersJson: z.record(z.string(), z.string()).optional().describe("HTTP headers"),
  bodyJson: z.any().optional().describe("Request body"),
  timeoutMs: z.number().optional().describe("Request timeout in milliseconds"),
  maxExecutionTimeMs: z.number().optional().describe("Maximum execution time in milliseconds"),
  maxResponseSizeKb: z.number().optional().describe("Maximum response size in kilobytes"),
  aiHintIntervalMs: z
    .number()
    .int()
    .optional()
    .openapi({
      description: "AI-suggested interval in milliseconds. If both interval and one-shot hints are active, the earliest scheduled time wins.",
    })
    .describe("AI-suggested interval in milliseconds. If both interval and one-shot hints are active, the earliest scheduled time wins."),
  aiHintNextRunAt: z
    .string()
    .datetime()
    .optional()
    .openapi({
      description: "AI-suggested next run time (one-shot). If both interval and one-shot hints are active, the earliest scheduled time wins.",
    })
    .describe("AI-suggested next run time (one-shot). If both interval and one-shot hints are active, the earliest scheduled time wins."),
  aiHintExpiresAt: z
    .string()
    .datetime()
    .optional()
    .openapi({
      description: "When the AI hint expires",
    })
    .describe("When the AI hint expires"),
  aiHintReason: z
    .string()
    .optional()
    .openapi({
      description: "Reason for AI hint",
    })
    .describe("Reason for AI hint"),
});

// ==================== Adaptive Scheduling Descriptions ====================

export const ApplyIntervalHintSummary = "Apply interval hint";
export const ApplyIntervalHintDescription = "Apply an AI-suggested interval adjustment to an endpoint. The hint will override the baseline schedule until it expires. Useful for dynamic scaling based on traffic patterns, errors, or other signals.";

export const ScheduleOneShotSummary = "Schedule one-shot run";
export const ScheduleOneShotDescription = "Schedule a one-time run at a specific time or after a delay. Provide either nextRunAt (ISO datetime) or nextRunInMs (delay in ms). Useful for immediate checks or scheduled interventions.";

export const PauseResumeSummary = "Pause/resume endpoint";
export const PauseResumeDescription = "Pause an endpoint until a specific time or resume it immediately. Set pausedUntil to an ISO datetime to pause, or null to resume. Useful for maintenance windows or temporary disabling.";

export const ClearHintsSummary = "Clear AI hints";
export const ClearHintsDescription = "Clear all AI hints (interval and one-shot) for an endpoint. The endpoint will revert to its baseline schedule. Useful for resetting adaptive behavior.";

export const ResetFailuresSummary = "Reset failure count";
export const ResetFailuresDescription = "Reset the failure count for an endpoint to zero. Useful after fixing an issue or to clear accumulated failures that may trigger alerts or backoff behavior.";

// ==================== Adaptive Scheduling Schemas ====================

export const ApplyIntervalHintRequestSchema = base.ApplyIntervalHintRequestBaseSchema;

export const ScheduleOneShotRequestSchema = base.ScheduleOneShotRequestBaseSchema;

export const PauseResumeRequestSchema = base.PauseResumeRequestBaseSchema;

// ==================== Execution Visibility Descriptions ====================

export const ListRunsSummary = "List endpoint runs";
export const ListRunsDescription = "List run history for an endpoint. Supports filtering by status and pagination with limit/offset. Returns run summaries with execution details.";

export const GetRunDetailsSummary = "Get run details";
export const GetRunDetailsDescription = "Get detailed information about a specific run. Includes full execution details, error messages, response body (if available), status code, and endpoint context.";

export const GetHealthSummarySummary = "Get endpoint health";
export const GetHealthSummaryDescription = "Get health summary for an endpoint. Returns success/failure counts, average duration, last run info, and current failure streak. Useful for monitoring and alerting.";

export const TestEndpointSummary = "Test endpoint";
export const TestEndpointDescription = "Execute an endpoint immediately and return the result. Creates a run record (source: 'test') but does NOT affect scheduling state (nextRunAt, lastRunAt, failureCount). Works on paused endpoints. Blocked on archived endpoints.";
export const TestEndpointResponseSchema = base.TestEndpointResponseBaseSchema;

// ==================== Execution Visibility Schemas ====================

export const ListRunsQuerySchema = base.ListRunsQueryBaseSchema;

export const RunSummaryResponseSchema = base.RunSummaryResponseBaseSchema;

export const ListRunsResponseSchema = base.ListRunsResponseBaseSchema;

export const RunDetailsResponseSchema = z.object({
  id: z.string().describe("Run ID"),
  endpointId: z.string().describe("Endpoint ID"),
  status: z.string().describe("Run status"),
  startedAt: z.string().datetime().describe("Run start time"),
  finishedAt: z.string().datetime().optional().describe("Run finish time"),
  durationMs: z.number().optional().describe("Execution duration in milliseconds"),
  errorMessage: z.string().optional().describe("Error message if run failed"),
  source: z.string().optional().describe("Scheduling source that triggered this run"),
  attempt: z.number().int().describe("Execution attempt number"),
  responseBody: z
    .any()
    .nullable()
    .optional()
    .openapi({
      description: "Response body from endpoint execution (if JSON and within size limit)",
    })
    .describe("Response body from endpoint execution (if JSON and within size limit)"),
  statusCode: z
    .number()
    .int()
    .optional()
    .openapi({
      description: "HTTP status code from endpoint response",
    })
    .describe("HTTP status code from endpoint response"),
  endpoint: z
    .object({
      id: z.string().describe("Endpoint ID"),
      name: z.string().describe("Endpoint name"),
      url: z.string().optional().describe("Endpoint URL"),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("HTTP method"),
    })
    .optional()
    .openapi({
      description: "Endpoint details for debugging",
    })
    .describe("Endpoint details for debugging"),
});

export const HealthSummaryQuerySchema = base.HealthSummaryQueryBaseSchema;

export const HealthSummaryResponseSchema = base.HealthSummaryResponseBaseSchema;
