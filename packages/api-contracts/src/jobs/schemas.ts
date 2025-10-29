import { z } from "@hono/zod-openapi";
import cronParser from "cron-parser";

// ==================== Job Lifecycle Schemas ====================

export const CreateJobRequestSchema = z.object({
  name: z.string().min(1).max(255).openapi({
    description: "Job name",
    example: "Daily sales report",
  }),
  description: z.string().max(1000).optional().openapi({
    description: "Job description",
    example: "Generates daily sales metrics",
  }),
});

export const UpdateJobRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const JobResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]),
});

export const JobWithCountResponseSchema = JobResponseSchema.extend({
  endpointCount: z.number().int(),
});

// ==================== Endpoint Orchestration Schemas ====================

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

const EndpointFieldsBaseSchema = z.object({
  name: z.string().min(1).max(255),
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
  maxExecutionTimeMs: z.number().int().positive().max(1800000).optional().openapi({
    description: "Maximum expected execution time in milliseconds (for lock duration). Default: 60000 (1 minute). Max: 1800000 (30 minutes).",
    example: 120000,
  }),
  maxResponseSizeKb: z.number().int().positive().optional(),
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
  id: z.string(),
  jobId: z.string().optional(),
  name: z.string(),
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
  aiHintIntervalMs: z.number().int().optional().openapi({
    description: "AI-suggested interval in milliseconds. If both interval and one-shot hints are active, the earliest scheduled time wins.",
  }),
  aiHintNextRunAt: z.string().datetime().optional().openapi({
    description: "AI-suggested next run time (one-shot). If both interval and one-shot hints are active, the earliest scheduled time wins.",
  }),
  aiHintExpiresAt: z.string().datetime().optional().openapi({
    description: "When the AI hint expires",
  }),
  aiHintReason: z.string().optional().openapi({
    description: "Reason for AI hint",
  }),
});

// ==================== Adaptive Scheduling Schemas ====================

export const ApplyIntervalHintRequestSchema = z.object({
  intervalMs: z.number().int().positive(),
  ttlMinutes: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export const ScheduleOneShotRequestSchema = z.object({
  nextRunAt: z.string().datetime().optional(),
  nextRunInMs: z.number().int().positive().optional(),
  ttlMinutes: z.number().int().positive().optional(),
  reason: z.string().optional(),
}).refine(
  data => data.nextRunAt || data.nextRunInMs !== undefined,
  { message: "Must provide either nextRunAt or nextRunInMs", path: ["nextRunAt"] },
);

export const PauseResumeRequestSchema = z.object({
  pausedUntil: z.string().datetime().nullable(),
  reason: z.string().optional(),
});

// ==================== Execution Visibility Schemas ====================

export const ListRunsQuerySchema = z.object({
  endpointId: z.string().optional(),
  status: z.enum(["success", "failed"]).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const RunSummaryResponseSchema = z.object({
  runId: z.string(),
  endpointId: z.string(),
  startedAt: z.string().datetime(),
  status: z.string(),
  durationMs: z.number().optional(),
  source: z.string().optional(),
});

export const ListRunsResponseSchema = z.object({
  runs: z.array(RunSummaryResponseSchema),
  total: z.number().int(),
});

export const RunDetailsResponseSchema = z.object({
  id: z.string(),
  endpointId: z.string(),
  status: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
  source: z.string().optional(),
  attempt: z.number().int(),
  responseBody: z.any().nullable().optional().openapi({
    description: "Response body from endpoint execution (if JSON and within size limit)",
  }),
  statusCode: z.number().int().optional().openapi({
    description: "HTTP status code from endpoint response",
  }),
  endpoint: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  }).optional().openapi({
    description: "Endpoint details for debugging",
  }),
});

export const HealthSummaryQuerySchema = z.object({
  sinceHours: z.coerce.number().int().positive().optional(),
});

export const HealthSummaryResponseSchema = z.object({
  successCount: z.number().int(),
  failureCount: z.number().int(),
  avgDurationMs: z.number().nullable(),
  lastRun: z.object({
    status: z.string(),
    at: z.string().datetime(),
  }).nullable(),
  failureStreak: z.number().int(),
});
