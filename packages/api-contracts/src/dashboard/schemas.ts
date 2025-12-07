import { z } from "@hono/zod-openapi";

// ==================== Dashboard Descriptions ====================

export const GetDashboardStatsSummary = "Get dashboard statistics";
export const GetDashboardStatsDescription = "Get comprehensive dashboard statistics including job counts, endpoint stats, success rates, recent activity, time-series data, top endpoints, and recent runs. Useful for overview and monitoring.";

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

  jobHealth: z.array(
    z.object({
      jobId: z.string().openapi({
        description: "Job ID",
      }),
      jobName: z.string().openapi({
        description: "Job name",
      }),
      successCount: z.number().int().nonnegative().openapi({
        description: "Number of successful runs for this job",
        example: 142,
      }),
      failureCount: z.number().int().nonnegative().openapi({
        description: "Number of failed runs for this job",
        example: 8,
      }),
    }),
  ).openapi({
    description: "Job health distribution (unfiltered - shows all jobs)",
  }),

  filteredMetrics: z.object({
    totalRuns: z.number().int().nonnegative().openapi({
      description: "Total number of runs matching filters",
      example: 287,
    }),
    successCount: z.number().int().nonnegative().openapi({
      description: "Successful runs matching filters",
      example: 271,
    }),
    failureCount: z.number().int().nonnegative().openapi({
      description: "Failed runs matching filters",
      example: 16,
    }),
    avgDurationMs: z.number().nullable().openapi({
      description: "Average duration in milliseconds for filtered runs",
      example: 234.5,
    }),
  }).openapi({
    description: "Aggregated metrics for filtered runs",
  }),

  sourceDistribution: z.array(
    z.object({
      source: z.string().openapi({
        description: "Scheduling source type",
        example: "ai-interval",
      }),
      count: z.number().int().nonnegative().openapi({
        description: "Number of runs from this source",
        example: 45,
      }),
    }),
  ).openapi({
    description: "Distribution of runs by scheduling source (filtered)",
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
    description: "Time-series data for run activity (filtered by query params)",
  }),

  endpointTimeSeries: z.array(
    z.object({
      date: z.string().openapi({
        description: "Date in YYYY-MM-DD format",
        example: "2025-10-20",
      }),
      endpointId: z.string().openapi({
        description: "Endpoint ID",
        example: "ep-abc123",
      }),
      endpointName: z.string().openapi({
        description: "Endpoint name",
        example: "Health Check",
      }),
      success: z.number().int().nonnegative().openapi({
        description: "Number of successful runs for this endpoint on this date",
        example: 15,
      }),
      failure: z.number().int().nonnegative().openapi({
        description: "Number of failed runs for this endpoint on this date",
        example: 1,
      }),
      totalDurationMs: z.number().int().nonnegative().openapi({
        description: "Total execution duration in milliseconds for this endpoint on this date",
        example: 45230,
      }),
    }),
  ).openapi({
    description: "Time-series data for run activity grouped by endpoint (filtered by query params)",
  }),

  endpointTimeSeriesMaxStacked: z.number().nonnegative().openapi({
    description: "Pre-calculated maximum stacked value for endpointTimeSeries chart Y-axis domain. Includes 10% padding.",
    example: 110,
  }),

  aiSessionTimeSeries: z.array(
    z.object({
      date: z.string().openapi({
        description: "Date in YYYY-MM-DD format",
        example: "2025-10-20",
      }),
      endpointId: z.string().openapi({
        description: "Endpoint ID",
        example: "ep-123",
      }),
      endpointName: z.string().openapi({
        description: "Endpoint name",
        example: "Health Check",
      }),
      sessionCount: z.number().int().nonnegative().openapi({
        description: "Number of AI analysis sessions for this endpoint on this date",
        example: 12,
      }),
      totalTokens: z.number().int().nonnegative().openapi({
        description: "Total tokens consumed for this endpoint on this date",
        example: 15420,
      }),
    }),
  ).openapi({
    description: "Time-series data for AI session activity grouped by endpoint (filtered by query params)",
  }),

  aiSessionTimeSeriesMaxStacked: z.number().nonnegative().openapi({
    description: "Pre-calculated maximum stacked value for aiSessionTimeSeries chart Y-axis domain. Includes 10% padding.",
    example: 55,
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
  jobId: z.string().optional().openapi({
    description: "Filter by job ID (optional)",
    example: "job_123abc",
  }),
  source: z.string().optional().openapi({
    description: "Filter by scheduling source (baseline-cron, baseline-interval, ai-interval, ai-oneshot, clamped-min, clamped-max, etc.)",
    example: "ai-interval",
  }),
  timeRange: z.enum(["24h", "7d", "30d", "all"]).optional().openapi({
    description: "Time range filter for runs (optional, overrides 'days' for certain queries)",
    example: "7d",
  }),
  endpointLimit: z.coerce.number().int().positive().max(100).optional().default(20).openapi({
    description: "Maximum number of endpoints to include in time-series data (sorted by run count DESC). Max 100, default 20.",
    example: 20,
  }),
}).openapi({
  description: "Query parameters for dashboard stats",
});

// ==================== Activity Timeline Schemas ====================

/**
 * An activity event - either a run execution or an AI analysis session.
 */
export const ActivityEventSchema = z.object({
  type: z.enum(["run", "session"]).openapi({
    description: "Type of activity event",
    example: "run",
  }),
  id: z.string().openapi({
    description: "Event ID (run ID or session ID)",
    example: "run_123abc",
  }),
  endpointId: z.string().openapi({
    description: "Endpoint ID",
    example: "ep_abc123",
  }),
  endpointName: z.string().openapi({
    description: "Endpoint name",
    example: "Health Check",
  }),
  timestamp: z.string().datetime().openapi({
    description: "Event timestamp (ISO 8601)",
    example: "2025-10-20T10:30:00.000Z",
  }),
  // Run-specific fields (only present when type = "run")
  status: z.string().optional().openapi({
    description: "Run status (success, failed, timeout, running)",
    example: "success",
  }),
  durationMs: z.number().int().optional().openapi({
    description: "Run duration in milliseconds",
    example: 234,
  }),
  source: z.string().optional().openapi({
    description: "Scheduling source that triggered this run",
    example: "baseline-cron",
  }),
  // Session-specific fields (only present when type = "session")
  reasoning: z.string().optional().openapi({
    description: "AI reasoning/explanation",
    example: "Traffic patterns suggest increasing check frequency",
  }),
  toolCalls: z.array(z.object({
    tool: z.string(),
    args: z.unknown().optional(),
    result: z.unknown().optional(),
  })).optional().openapi({
    description: "AI tool calls made during session",
  }),
  tokenUsage: z.number().int().optional().openapi({
    description: "Tokens consumed during AI session",
    example: 1250,
  }),
}).openapi({
  description: "An activity event (run or AI session)",
});

export const JobActivityTimelineQuerySchema = z.object({
  timeRange: z.enum(["24h", "7d", "30d"]).optional().default("7d").openapi({
    description: "Time range filter for activity events",
    example: "7d",
  }),
  limit: z.coerce.number().int().positive().max(100).optional().default(50).openapi({
    description: "Maximum number of events to return",
    example: 50,
  }),
  offset: z.coerce.number().int().nonnegative().optional().default(0).openapi({
    description: "Pagination offset",
    example: 0,
  }),
}).openapi({
  description: "Query parameters for job activity timeline",
});

export const JobActivityTimelineResponseSchema = z.object({
  events: z.array(ActivityEventSchema).openapi({
    description: "Combined timeline of runs and AI sessions, ordered by timestamp descending",
  }),
  total: z.number().int().nonnegative().openapi({
    description: "Total count of events matching the filter",
    example: 150,
  }),
  summary: z.object({
    runsCount: z.number().int().nonnegative().openapi({
      description: "Number of runs in the response",
      example: 35,
    }),
    sessionsCount: z.number().int().nonnegative().openapi({
      description: "Number of AI sessions in the response",
      example: 15,
    }),
    successRate: z.number().min(0).max(100).openapi({
      description: "Success rate percentage for runs in the response",
      example: 94.3,
    }),
  }).openapi({
    description: "Summary statistics for the returned events",
  }),
}).openapi({
  description: "Job activity timeline response",
});
