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

import { z } from "zod";
import cronParser from "cron-parser";

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
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const UpdateJobRequestBaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const JobResponseBaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "archived"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().optional(),
});

export const JobWithCountResponseBaseSchema = JobResponseBaseSchema.extend({
  endpointCount: z.number().int(),
});

// ==================== Endpoint Orchestration Schemas ====================

const EndpointFieldsBaseSchemaShape = {
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  baselineCron: z
    .string()
    .optional()
    .refine(
      val => !val || validateCronExpression(val),
      { message: "Invalid cron expression. Use standard 5-field format (minute hour day month weekday)" },
    ),
  baselineIntervalMs: z.number().int().positive().optional(),
  minIntervalMs: z.number().int().positive().optional(),
  maxIntervalMs: z.number().int().positive().optional(),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  headersJson: z.record(z.string(), z.string()).optional(),
  bodyJson: z.any().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxExecutionTimeMs: z.number().int().positive().max(1800000).optional(),
  maxResponseSizeKb: z.number().int().positive().optional(),
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
  id: z.string(),
  jobId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  baselineCron: z.string().optional(),
  baselineIntervalMs: z.number().optional(),
  minIntervalMs: z.number().optional(),
  maxIntervalMs: z.number().optional(),
  nextRunAt: z.string().datetime(),
  lastRunAt: z.string().datetime().optional(),
  failureCount: z.number().int(),
  pausedUntil: z.string().datetime().optional(),
  url: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headersJson: z.record(z.string(), z.string()).optional(),
  bodyJson: z.any().optional(),
  timeoutMs: z.number().optional(),
  maxExecutionTimeMs: z.number().optional(),
  maxResponseSizeKb: z.number().optional(),
  aiHintIntervalMs: z.number().int().optional(),
  aiHintNextRunAt: z.string().datetime().optional(),
  aiHintExpiresAt: z.string().datetime().optional(),
  aiHintReason: z.string().optional(),
});

// ==================== Adaptive Scheduling Schemas ====================

export const ApplyIntervalHintRequestBaseSchema = z.object({
  intervalMs: z.number().int().positive(),
  ttlMinutes: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export const ScheduleOneShotRequestBaseSchema = z.object({
  nextRunAt: z.string().datetime().optional(),
  nextRunInMs: z.number().int().positive().optional(),
  ttlMinutes: z.number().int().positive().optional(),
  reason: z.string().optional(),
}).refine(
  data => data.nextRunAt || data.nextRunInMs !== undefined,
  { message: "Must provide either nextRunAt or nextRunInMs", path: ["nextRunAt"] },
);

export const PauseResumeRequestBaseSchema = z.object({
  pausedUntil: z.string().datetime().nullable(),
  reason: z.string().optional(),
});

// ==================== Execution Visibility Schemas ====================

export const ListRunsQueryBaseSchema = z.object({
  endpointId: z.string().optional(),
  status: z.enum(["success", "failed"]).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const RunSummaryResponseBaseSchema = z.object({
  runId: z.string(),
  endpointId: z.string(),
  startedAt: z.string().datetime(),
  status: z.string(),
  durationMs: z.number().optional(),
  source: z.string().optional(),
});

export const ListRunsResponseBaseSchema = z.object({
  runs: z.array(RunSummaryResponseBaseSchema),
  total: z.number().int(),
});

export const RunDetailsResponseBaseSchema = z.object({
  id: z.string(),
  endpointId: z.string(),
  status: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
  source: z.string().optional(),
  attempt: z.number().int(),
  responseBody: z.any().nullable().optional(),
  statusCode: z.number().int().optional(),
  endpoint: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  }).optional(),
});

export const HealthSummaryQueryBaseSchema = z.object({
  sinceHours: z.coerce.number().int().positive().optional(),
});

export const HealthSummaryResponseBaseSchema = z.object({
  successCount: z.number().int(),
  failureCount: z.number().int(),
  avgDurationMs: z.number().nullable(),
  lastRun: z.object({
    status: z.string(),
    at: z.string().datetime(),
  }).nullable(),
  failureStreak: z.number().int(),
});
