import { z } from "@hono/zod-openapi";

/**
 * Zod schemas for Job API endpoints.
 * Uses @hono/zod-openapi for automatic OpenAPI doc generation.
 */

// ----- Request Schemas -----

/**
 * Schema for creating a new job.
 * Maps to domain JobEndpoint creation requirements.
 */
export const CreateJobRequestSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(255, "Name must be 255 characters or less")
      .openapi({
        description: "Human-readable name for the job",
        example: "Daily sales report",
      }),

    // Baseline cadence (one required)
    baselineCron: z
      .string()
      .optional()
      .openapi({
        description: "Cron expression for baseline scheduling (e.g., '0 0 * * *' for daily at midnight UTC)",
        example: "0 9 * * 1-5",
      }),

    baselineIntervalMs: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        description: "Fixed interval in milliseconds for baseline scheduling",
        example: 3600000, // 1 hour
      }),

    // Guardrails (optional)
    minIntervalMs: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        description: "Minimum allowed interval between runs (in milliseconds). AI hints are clamped to this.",
        example: 60000, // 1 minute
      }),

    maxIntervalMs: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        description: "Maximum allowed interval between runs (in milliseconds). AI hints are clamped to this.",
        example: 86400000, // 1 day
      }),

    // HTTP execution config
    url: z
      .string()
      .url("Must be a valid URL")
      .openapi({
        description: "HTTP endpoint to call when job executes",
        example: "https://api.example.com/webhooks/daily-report",
      }),

    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .default("GET")
      .openapi({
        description: "HTTP method for the request",
        example: "POST",
      }),

    headersJson: z
      .record(z.string())
      .optional()
      .openapi({
        description: "HTTP headers to include in the request",
        example: {
          "Content-Type": "application/json",
          "X-API-Key": "secret-key",
        },
      }),

    bodyJson: z
      .any()
      .optional()
      .openapi({
        description: "JSON body to send with the request (for POST/PUT/PATCH)",
        example: { reportType: "sales", period: "daily" },
      }),

    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({
        description: "Request timeout in milliseconds",
        example: 30000,
      }),
  })
  .refine(
    data => data.baselineCron || data.baselineIntervalMs,
    {
      message: "Either baselineCron or baselineIntervalMs must be provided",
      path: ["baselineCron"],
    },
  )
  .openapi("CreateJobRequest");

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

// ----- Response Schemas -----

/**
 * Schema for job response (after creation or fetch).
 * Matches domain JobEndpoint fields that are safe to expose via API.
 */
export const JobResponseSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique job ID",
      example: "job_abc123",
    }),

    name: z.string().openapi({
      description: "Job name",
      example: "Daily sales report",
    }),

    // Baseline cadence
    baselineCron: z.string().optional().openapi({
      description: "Cron expression for baseline scheduling",
      example: "0 9 * * 1-5",
    }),

    baselineIntervalMs: z.number().optional().openapi({
      description: "Fixed interval in milliseconds",
      example: 3600000,
    }),

    // Guardrails
    minIntervalMs: z.number().optional().openapi({
      description: "Minimum interval between runs (ms)",
      example: 60000,
    }),

    maxIntervalMs: z.number().optional().openapi({
      description: "Maximum interval between runs (ms)",
      example: 86400000,
    }),

    // Runtime state
    nextRunAt: z.string().datetime().openapi({
      description: "Next scheduled run time (ISO 8601)",
      example: "2024-10-14T09:00:00Z",
    }),

    lastRunAt: z.string().datetime().optional().openapi({
      description: "Last execution time (ISO 8601)",
      example: "2024-10-13T09:00:00Z",
    }),

    failureCount: z.number().int().openapi({
      description: "Consecutive failure count",
      example: 0,
    }),

    pausedUntil: z.string().datetime().optional().openapi({
      description: "Job is paused until this time (ISO 8601)",
      example: "2024-10-15T00:00:00Z",
    }),

    // Execution config
    url: z.string().optional().openapi({
      description: "HTTP endpoint URL",
      example: "https://api.example.com/webhooks/daily-report",
    }),

    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .optional()
      .openapi({
        description: "HTTP method",
        example: "POST",
      }),

    headersJson: z.record(z.string()).optional().openapi({
      description: "HTTP headers",
    }),

    bodyJson: z.any().optional().openapi({
      description: "JSON request body",
    }),

    timeoutMs: z.number().optional().openapi({
      description: "Request timeout (ms)",
      example: 30000,
    }),

    // Metadata
    createdAt: z.string().datetime().openapi({
      description: "Job creation timestamp (ISO 8601)",
      example: "2024-10-13T08:00:00Z",
    }),

    updatedAt: z.string().datetime().openapi({
      description: "Last update timestamp (ISO 8601)",
      example: "2024-10-13T08:00:00Z",
    }),
  })
  .openapi("JobResponse");

export type JobResponse = z.infer<typeof JobResponseSchema>;

/**
 * Schema for successful job creation response.
 */
export const CreateJobResponseSchema = JobResponseSchema.openapi("CreateJobResponse");

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;
