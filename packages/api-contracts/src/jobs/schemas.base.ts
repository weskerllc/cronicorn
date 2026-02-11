/**
 * Base Zod Schemas (Pure)
 *
 * These schemas are compatible with both zod 3.x and 4.x and contain no
 * OpenAPI decorations. They can be used by:
 * - MCP server (uses plain zod)
 * - Web app forms (uses plain zod)
 * - Any future clients
 *
 * The schemas.ts file extends these with OpenAPI decorations for the API.
 */

import cronParser from "cron-parser";
import { z } from "zod";

// ==================== Helper Functions ====================

function validateCronExpression(expr: string): boolean {
  try {
    cronParser.parseExpression(expr, { utc: true });
    return true;
  }
  catch {
    return false;
  }
}

// ==================== Job Lifecycle Schemas ====================

export const CreateJobRequestBaseSchema = z.object({
  name: z.string().min(1).max(255).describe("Job name"),
  description: z.string().max(1000).optional().describe("Job description"),
});

export const UpdateJobRequestBaseSchema = z.object({
  name: z.string().min(1).max(255).optional().describe("Job name"),
  description: z.string().max(1000).optional().describe("Job description"),
});

export const JobResponseBaseSchema = z.object({
  id: z.string().describe("Job ID"),
  userId: z.string().describe("User ID"),
  name: z.string().describe("Job name"),
  description: z.string().optional().describe("Job description"),
  status: z.enum(["active", "paused", "archived"]).describe("Job status"),
  createdAt: z.string().datetime().describe("Creation timestamp"),
  updatedAt: z.string().datetime().describe("Last update timestamp"),
  archivedAt: z.string().datetime().optional().describe("Archive timestamp"),
});

export const JobWithCountResponseBaseSchema = JobResponseBaseSchema.extend({
  endpointCount: z.number().int().describe("Number of endpoints in this job"),
});

// ==================== Endpoint Orchestration Schemas ====================

const EndpointFieldsBaseSchemaShape = {
  name: z.string().min(1).max(255).describe("Endpoint name"),
  description: z.string().max(2000).optional().describe("Endpoint-specific context: what it does, response schema, thresholds, coordination logic"),
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
  maxExecutionTimeMs: z.number().int().positive().max(1800000).optional().describe("Maximum expected execution time in milliseconds (for lock duration). Default: 60000 (1 minute). Max: 1800000 (30 minutes)."),
  maxResponseSizeKb: z.number().int().positive().optional().describe("Maximum response size in kilobytes"),
};

export const EndpointFieldsBaseSchema = z.object(EndpointFieldsBaseSchemaShape);

const EndpointFieldsWithValidationBaseSchema = EndpointFieldsBaseSchema.refine(
  data => !data.minIntervalMs || !data.maxIntervalMs || data.minIntervalMs <= data.maxIntervalMs,
  {
    message: "minIntervalMs must be less than or equal to maxIntervalMs",
    path: ["minIntervalMs"],
  },
);

export const AddEndpointRequestBaseSchema = EndpointFieldsWithValidationBaseSchema.refine(
  data =>
    // XOR condition: exactly one must be provided
    (data.baselineCron && !data.baselineIntervalMs)
    || (!data.baselineCron && data.baselineIntervalMs),
  {
    message: "Provide either baselineCron or baselineIntervalMs, but not both.",
    path: ["baselineCron"],
  },
);

export const UpdateEndpointRequestBaseSchema = EndpointFieldsBaseSchema.partial().refine(
  data => !data.minIntervalMs || !data.maxIntervalMs || data.minIntervalMs <= data.maxIntervalMs,
  {
    message: "minIntervalMs must be less than or equal to maxIntervalMs",
    path: ["minIntervalMs"],
  },
);

export const EndpointResponseBaseSchema = z.object({
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
  aiHintIntervalMs: z.number().int().optional().describe("AI-suggested interval in milliseconds. If both interval and one-shot hints are active, the earliest scheduled time wins."),
  aiHintNextRunAt: z.string().datetime().optional().describe("AI-suggested next run time (one-shot). If both interval and one-shot hints are active, the earliest scheduled time wins."),
  aiHintExpiresAt: z.string().datetime().optional().describe("When the AI hint expires"),
  aiHintReason: z.string().optional().describe("Reason for AI hint"),
});

// ==================== Adaptive Scheduling Schemas ====================

export const ApplyIntervalHintRequestBaseSchema = z.object({
  intervalMs: z.number().int().positive().describe("AI-suggested interval in milliseconds"),
  ttlMinutes: z.number().int().positive().optional().describe("Time-to-live for hint in minutes"),
  reason: z.string().optional().describe("Reason for the interval adjustment"),
});

export const ScheduleOneShotRequestBaseSchema = z.object({
  nextRunAt: z.string().datetime().optional().describe("ISO 8601 datetime for next run"),
  nextRunInMs: z.number().int().positive().optional().describe("Milliseconds from now for next run"),
  ttlMinutes: z.number().int().positive().optional().describe("Time-to-live for hint in minutes"),
  reason: z.string().optional().describe("Reason for the one-shot schedule"),
}).refine(
  data => data.nextRunAt || data.nextRunInMs !== undefined,
  { message: "Must provide either nextRunAt or nextRunInMs", path: ["nextRunAt"] },
);

export const PauseResumeRequestBaseSchema = z.object({
  pausedUntil: z.string().datetime().nullable().describe("ISO datetime to pause until (null to resume)"),
  reason: z.string().optional().describe("Reason for pausing/resuming"),
});

// ==================== Execution Visibility Schemas ====================

export const ListRunsQueryBaseSchema = z.object({
  endpointId: z.string().optional().describe("Filter by endpoint ID"),
  status: z.enum(["success", "failed"]).optional().describe("Filter by run status"),
  limit: z.coerce.number().int().positive().max(1000).optional().describe("Maximum number of runs to return"),
  offset: z.coerce.number().int().nonnegative().optional().describe("Number of runs to skip"),
});

export const RunSummaryResponseBaseSchema = z.object({
  runId: z.string().describe("Run ID"),
  endpointId: z.string().describe("Endpoint ID"),
  startedAt: z.string().datetime().describe("Run start time"),
  status: z.string().describe("Run status"),
  durationMs: z.number().optional().describe("Execution duration in milliseconds"),
  source: z.string().optional().describe("Scheduling source that triggered this run"),
});

export const ListRunsResponseBaseSchema = z.object({
  runs: z.array(RunSummaryResponseBaseSchema).describe("List of run summaries"),
  total: z.number().int().describe("Total number of runs matching filters"),
});

export const RunDetailsResponseBaseSchema = z.object({
  id: z.string().describe("Run ID"),
  endpointId: z.string().describe("Endpoint ID"),
  status: z.string().describe("Run status"),
  startedAt: z.string().datetime().describe("Run start time"),
  finishedAt: z.string().datetime().optional().describe("Run finish time"),
  durationMs: z.number().optional().describe("Execution duration in milliseconds"),
  errorMessage: z.string().optional().describe("Error message if run failed"),
  source: z.string().optional().describe("Scheduling source that triggered this run"),
  attempt: z.number().int().describe("Execution attempt number"),
  responseBody: z.any().nullable().optional().describe("Response body from endpoint execution (if JSON and within size limit)"),
  statusCode: z.number().int().optional().describe("HTTP status code from endpoint response"),
  endpoint: z.object({
    id: z.string().describe("Endpoint ID"),
    name: z.string().describe("Endpoint name"),
    url: z.string().optional().describe("Endpoint URL"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("HTTP method"),
  }).optional().describe("Endpoint details for debugging"),
});

export const HealthSummaryQueryBaseSchema = z.object({
  sinceHours: z.coerce.number().int().positive().optional().describe("Number of hours to look back for health metrics"),
});

export const HealthSummaryResponseBaseSchema = z.object({
  successCount: z.number().int().describe("Number of successful runs"),
  failureCount: z.number().int().describe("Number of failed runs"),
  avgDurationMs: z.number().nullable().describe("Average execution duration in milliseconds"),
  lastRun: z.object({
    status: z.string().describe("Status of last run"),
    at: z.string().datetime().describe("Timestamp of last run"),
  }).nullable().describe("Last run information"),
  failureStreak: z.number().int().describe("Current consecutive failure count"),
});

export const TestEndpointResponseBaseSchema = z.object({
  runId: z.string().describe("ID of the test run record"),
  status: z.enum(["success", "failed"]).describe("Execution result"),
  durationMs: z.number().describe("Execution duration in milliseconds"),
  statusCode: z.number().int().optional().describe("HTTP status code"),
  responseBody: z.any().nullable().optional().describe("Response body (JSON, within size limit)"),
  errorMessage: z.string().optional().describe("Error message if failed"),
});
