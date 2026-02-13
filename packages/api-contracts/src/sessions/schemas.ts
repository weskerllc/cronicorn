import { z } from "@hono/zod-openapi";

// ==================== AI Analysis Sessions Schemas ====================

/**
 * Schemas for AI analysis session endpoints.
 * Sessions track AI planner decisions for debugging, cost tracking, and observability.
 */

// ==================== Route Descriptions ====================

export const ListSessionsSummary = "List AI analysis sessions for an endpoint";
export const ListSessionsDescription = "Retrieve recent AI analysis sessions for an endpoint. Shows what the AI planner decided, which tools it called, reasoning, and resource usage. Useful for debugging scheduling decisions and tracking AI costs.";

export const GetSessionSummary = "Get AI analysis session details";
export const GetSessionDescription = "Retrieve details of a single AI analysis session by ID. Shows reasoning, tool calls, and resource usage for the analysis.";

// ==================== Request/Response Schemas ====================

export const ListSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10).openapi({
    description: "Maximum number of sessions to return (max 100, default 10)",
    example: 10,
  }),
  offset: z.coerce.number().int().nonnegative().optional().default(0).openapi({
    description: "Number of sessions to skip for pagination (default 0)",
    example: 0,
  }),
});

export const ToolCallSchema = z.object({
  tool: z.string().openapi({
    description: "Tool name (e.g., propose_interval, pause_until)",
    example: "propose_interval",
  }),
  args: z.unknown().openapi({
    description: "Tool input arguments",
    example: { intervalMs: 300000, reason: "Detected high error rate" },
  }),
  result: z.unknown().openapi({
    description: "Tool execution result",
    example: { success: true },
  }),
});

export const AISessionWarningSchema = z.object({
  code: z.enum(["output_truncated", "missing_final_tool", "missing_reasoning"]).openapi({
    description: "Warning code identifying the issue type",
    example: "output_truncated",
  }),
  message: z.string().openapi({
    description: "Human-readable warning message",
    example: "Output token limit hit on 1 step(s) — model response was truncated",
  }),
  meta: z.record(z.unknown()).optional().openapi({
    description: "Optional metadata about the warning",
  }),
});

export const AISessionSchema = z.object({
  id: z.string().openapi({
    description: "Session ID",
    example: "session_1732086000000_0",
  }),
  analyzedAt: z.string().datetime().openapi({
    description: "When the analysis was performed (ISO 8601)",
    example: "2025-11-20T10:30:00.000Z",
  }),
  toolCalls: z.array(ToolCallSchema).openapi({
    description: "Tools called during analysis",
  }),
  reasoning: z.string().openapi({
    description: "AI's reasoning/analysis text",
    example: "High error rate detected in recent runs. Reducing frequency to allow system recovery.",
  }),
  tokenUsage: z.number().int().nullable().openapi({
    description: "Tokens consumed by this analysis (null if not tracked)",
    example: 1250,
  }),
  durationMs: z.number().int().nullable().openapi({
    description: "Analysis duration in milliseconds (null if not tracked)",
    example: 3420,
  }),
  warnings: z.array(AISessionWarningSchema).openapi({
    description: "Warnings detected during the session (empty array if clean)",
  }),
});

export const ListSessionsResponseSchema = z.object({
  sessions: z.array(AISessionSchema).openapi({
    description: "List of AI analysis sessions, ordered newest to oldest",
  }),
  total: z.number().int().nonnegative().openapi({
    description: "Total number of sessions for this endpoint (for pagination)",
    example: 150,
  }),
});

export const AISessionDetailSchema = z.object({
  id: z.string().openapi({
    description: "Session ID",
    example: "session_1732086000000_0",
  }),
  endpointId: z.string().openapi({
    description: "The endpoint this session analyzed",
    example: "ep_abc123",
  }),
  endpointName: z.string().openapi({
    description: "Name of the endpoint",
    example: "Health Check API",
  }),
  analyzedAt: z.string().datetime().openapi({
    description: "When the analysis was performed (ISO 8601)",
    example: "2025-11-20T10:30:00.000Z",
  }),
  toolCalls: z.array(ToolCallSchema).openapi({
    description: "Tools called during analysis",
  }),
  reasoning: z.string().openapi({
    description: "AI's reasoning/analysis text",
    example: "High error rate detected in recent runs. Reducing frequency to allow system recovery.",
  }),
  tokenUsage: z.number().int().nullable().openapi({
    description: "Tokens consumed by this analysis (null if not tracked)",
    example: 1250,
  }),
  durationMs: z.number().int().nullable().openapi({
    description: "Analysis duration in milliseconds (null if not tracked)",
    example: 3420,
  }),
  warnings: z.array(AISessionWarningSchema).openapi({
    description: "Warnings detected during the session (empty array if clean)",
  }),
});
