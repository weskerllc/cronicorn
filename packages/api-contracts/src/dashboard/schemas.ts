import { z } from "@hono/zod-openapi";

// ==================== Dashboard Stats Response Schema ====================

/**
 * These schemas extend the base schemas with OpenAPI decorations.
 * For clients that don't need OpenAPI (MCP, web forms), import from schemas.base.ts
 */

export const DashboardStatsResponseSchema = z.object({
  jobs: z.object({
    total: z.number().int().nonnegative().openapi({
      description: "Total number of jobs",
      example: 12,
    }),
  }).openapi({
    description: "Job statistics",
  }),

  endpoints: z.object({
    total: z.number().int().nonnegative().openapi({
      description: "Total number of endpoints across all jobs",
      example: 45,
    }),
    active: z.number().int().nonnegative().openapi({
      description: "Number of active (not paused) endpoints",
      example: 42,
    }),
    paused: z.number().int().nonnegative().openapi({
      description: "Number of paused endpoints",
      example: 3,
    }),
  }).openapi({
    description: "Endpoint statistics",
  }),

  successRate: z.object({
    overall: z.number().min(0).max(100).openapi({
      description: "Overall success rate percentage across all endpoints",
      example: 94.5,
    }),
    trend: z.enum(["up", "down", "stable"]).openapi({
      description: "Success rate trend compared to previous period",
      example: "up",
    }),
  }).openapi({
    description: "Success rate metrics",
  }),

  recentActivity: z.object({
    runs24h: z.number().int().nonnegative().openapi({
      description: "Total number of runs in the last 24 hours",
      example: 287,
    }),
    success24h: z.number().int().nonnegative().openapi({
      description: "Successful runs in the last 24 hours",
      example: 271,
    }),
    failure24h: z.number().int().nonnegative().openapi({
      description: "Failed runs in the last 24 hours",
      example: 16,
    }),
  }).openapi({
    description: "Recent activity metrics (last 24 hours)",
  }),

  runTimeSeries: z.array(
    z.object({
      date: z.string().openapi({
        description: "Date in YYYY-MM-DD format",
        example: "2025-10-20",
      }),
      success: z.number().int().nonnegative().openapi({
        description: "Number of successful runs on this date",
        example: 45,
      }),
      failure: z.number().int().nonnegative().openapi({
        description: "Number of failed runs on this date",
        example: 3,
      }),
    }),
  ).openapi({
    description: "Time-series data for run activity (last 7 days)",
  }),

  topEndpoints: z.array(
    z.object({
      id: z.string().openapi({
        description: "Endpoint ID",
      }),
      name: z.string().openapi({
        description: "Endpoint name",
      }),
      jobName: z.string().openapi({
        description: "Parent job name",
      }),
      successRate: z.number().min(0).max(100).openapi({
        description: "Success rate percentage for this endpoint",
        example: 98.5,
      }),
      lastRunAt: z.string().datetime().nullable().openapi({
        description: "Timestamp of last run",
      }),
      runCount: z.number().int().nonnegative().openapi({
        description: "Total number of runs for this endpoint",
        example: 156,
      }),
    }),
  ).openapi({
    description: "Top 5 endpoints by run count",
  }),

  recentRuns: z.array(
    z.object({
      id: z.string(),
      endpointId: z.string(),
      endpointName: z.string().openapi({
        description: "Name of the endpoint that ran",
      }),
      jobName: z.string().openapi({
        description: "Name of the parent job",
      }),
      status: z.string().openapi({
        description: "Run status (success, failed, timeout, cancelled)",
        example: "success",
      }),
      startedAt: z.string().datetime().openapi({
        description: "When the run started",
      }),
      durationMs: z.number().int().nonnegative().nullable().openapi({
        description: "Duration in milliseconds",
        example: 234,
      }),
      source: z.string().nullable().openapi({
        description: "What triggered this run (baseline-cron, ai-interval, etc)",
        example: "baseline-cron",
      }),
    }),
  ).openapi({
    description: "Most recent 50 runs across all endpoints",
  }),

  recentAISessions: z.array(
    z.object({
      id: z.string(),
      endpointId: z.string(),
      endpointName: z.string().openapi({
        description: "Name of the endpoint that was analyzed",
      }),
      jobName: z.string().openapi({
        description: "Name of the parent job",
      }),
      analyzedAt: z.string().datetime().openapi({
        description: "When the AI analysis occurred",
      }),
      reasoning: z.string().openapi({
        description: "AI's reasoning/explanation for its decisions",
      }),
      tokenUsage: z.number().int().nonnegative().nullable().openapi({
        description: "Number of tokens consumed",
        example: 1523,
      }),
      durationMs: z.number().int().nonnegative().nullable().openapi({
        description: "Analysis duration in milliseconds",
        example: 3421,
      }),
      toolCallCount: z.number().int().nonnegative().openapi({
        description: "Number of tools called during analysis",
        example: 3,
      }),
    }),
  ).openapi({
    description: "Most recent 50 AI analysis sessions across all endpoints",
  }),
}).openapi({
  description: "Aggregated dashboard statistics for the authenticated user",
});

// ==================== Dashboard Query Schema ====================

export const DashboardStatsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(30).optional().default(7).openapi({
    description: "Number of days for time-series data (max 30)",
    example: 7,
  }),
}).openapi({
  description: "Query parameters for dashboard stats",
});
