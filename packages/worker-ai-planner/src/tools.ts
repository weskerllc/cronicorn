/**
 * AI Tools for Adaptive Scheduling
 *
 * These tools are exposed to the AI to adjust endpoint scheduling dynamically.
 * Each tool is endpoint-scoped via closure (endpointId bound at creation time).
 */

import type { Clock, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { defineTools, tool } from "@cronicorn/domain";
import { z } from "zod";

/**
 * Truncate response body to prevent token overflow while preserving key information.
 */
function truncateResponseBody(responseBody: unknown, maxLength = 1000): unknown {
  if (typeof responseBody === "string") {
    if (responseBody.length <= maxLength)
      return responseBody;
    return `${responseBody.substring(0, maxLength)}...[truncated]`;
  }

  if (typeof responseBody === "object" && responseBody !== null) {
    const str = JSON.stringify(responseBody);
    if (str.length <= maxLength)
      return responseBody;
    try {
      return JSON.parse(str.substring(0, maxLength - 20));
    }
    catch {
      return `${str.substring(0, maxLength)}...[truncated]`;
    }
  }

  return responseBody;
}

/**
 * Create endpoint-scoped tools for AI to control scheduling.
 *
 * Tools write hints to the database via JobsRepo methods.
 * The scheduler picks up these hints on next execution (via governor).
 *
 * Query tools read response data from RunsRepo to inform scheduling decisions.
 *
 * @param endpointId - The endpoint being analyzed
 * @param jobId - The job this endpoint belongs to (for sibling queries)
 * @param deps - Dependencies object
 * @param deps.jobs - JobsRepo instance for job operations
 * @param deps.runs - RunsRepo instance for run/response queries
 * @param deps.clock - Clock instance for current time
 * @returns Tools object with 6 tools (3 query + 3 action)
 */
export function createToolsForEndpoint(
  endpointId: string,
  jobId: string,
  deps: { jobs: JobsRepo; runs: RunsRepo; clock: Clock },
) {
  const { jobs, runs, clock } = deps;
  return defineTools({
    // ============================================================================
    // Final Answer Tool: Submit Analysis
    // ============================================================================

    submit_analysis: tool({
      description: "Submit your final analysis and reasoning after gathering data and taking any necessary actions. This signals you are done analyzing the endpoint.",
      schema: z.object({
        reasoning: z.string().describe("Your analysis of the endpoint's health and performance, including what data you examined and why you took (or didn't take) any actions"),
        actions_taken: z.array(z.string()).optional().describe("List of action tools called (e.g., ['propose_interval', 'pause_until'])"),
        confidence: z.enum(["high", "medium", "low"]).optional().describe("Confidence level in your analysis"),
      }),
      execute: async (args) => {
        // This is a terminal tool - just return the analysis
        // The reasoning will be captured by the planner
        return {
          status: "analysis_complete",
          reasoning: args.reasoning,
          actions_taken: args.actions_taken || [],
          confidence: args.confidence || "high",
        };
      },
    }),

    // ============================================================================
    // Action Tools: Scheduling Adjustments
    // ============================================================================

    propose_interval: tool({
      description: "Adjust endpoint execution interval based on observed patterns (e.g., increase frequency if failures detected, decrease if stable)",
      schema: z.object({
        intervalMs: z.number().positive().describe("New execution interval in milliseconds"),
        ttlMinutes: z.number().positive().default(60).describe("How long this hint is valid (minutes)"),
        reason: z.string().optional().describe("Explanation for the adjustment"),
      }),
      execute: async (args) => {
        const now = clock.now();
        const expiresAt = new Date(now.getTime() + args.ttlMinutes * 60 * 1000);

        // Write AI hint to database
        await jobs.writeAIHint(endpointId, {
          intervalMs: args.intervalMs,
          expiresAt,
          reason: args.reason,
        });

        // Nudge next run to apply immediately (if earlier than current nextRunAt)
        const nextRunAt = new Date(now.getTime() + args.intervalMs);
        await jobs.setNextRunAtIfEarlier(endpointId, nextRunAt);

        return `Adjusted interval to ${args.intervalMs}ms (expires in ${args.ttlMinutes} minutes)${args.reason ? `: ${args.reason}` : ""}`;
      },
    }),

    propose_next_time: tool({
      description: "Schedule a one-shot execution at a specific time (e.g., run immediately to investigate failure, or defer to off-peak hours)",
      schema: z.object({
        nextRunAtIso: z.string().datetime().describe("ISO 8601 timestamp for next execution"),
        ttlMinutes: z.number().positive().default(30).describe("How long this hint is valid (minutes)"),
        reason: z.string().optional().describe("Explanation for the one-shot execution"),
      }),
      execute: async (args) => {
        const now = clock.now();
        const nextRunAt = new Date(args.nextRunAtIso);
        const expiresAt = new Date(now.getTime() + args.ttlMinutes * 60 * 1000);

        // Write AI hint to database
        await jobs.writeAIHint(endpointId, {
          nextRunAt,
          expiresAt,
          reason: args.reason,
        });

        // Nudge to apply immediately (if earlier than current nextRunAt)
        await jobs.setNextRunAtIfEarlier(endpointId, nextRunAt);

        return `Scheduled one-shot execution at ${nextRunAt.toISOString()} (expires in ${args.ttlMinutes} minutes)${args.reason ? `: ${args.reason}` : ""}`;
      },
    }),

    pause_until: tool({
      description: "Pause endpoint execution temporarily (e.g., during maintenance window) or indefinitely (pass null to resume)",
      schema: z.object({
        untilIso: z.string().datetime().nullable().describe("ISO 8601 timestamp to pause until, or null to resume immediately"),
        reason: z.string().optional().describe("Explanation for pausing"),
      }),
      execute: async (args) => {
        const until = args.untilIso ? new Date(args.untilIso) : null;

        await jobs.setPausedUntil(endpointId, until);

        if (until) {
          return `Paused until ${until.toISOString()}${args.reason ? `: ${args.reason}` : ""}`;
        }
        else {
          return `Resumed execution${args.reason ? `: ${args.reason}` : ""}`;
        }
      },
    }),

    // ============================================================================
    // Query Tools: Response Data Retrieval
    // ============================================================================

    get_latest_response: tool({
      description: "Get the latest response body from this endpoint's most recent execution. Use this to check current state (e.g., error rate, queue depth, data availability).",
      schema: z.object({}),
      execute: async () => {
        const result = await runs.getLatestResponse(endpointId);

        if (!result) {
          return {
            found: false,
            message: "No executions found for this endpoint",
          };
        }

        return {
          found: true,
          responseBody: result.responseBody,
          timestamp: result.timestamp.toISOString(),
          status: result.status,
        };
      },
    }),

    get_response_history: tool({
      description: "Get recent response bodies from this endpoint to identify trends (e.g., increasing error rates, growing queue sizes, performance degradation). Use offset for pagination: start with limit=2, then use offset to skip previous results. Responses are returned newest-first.",
      schema: z.object({
        limit: z.number().int().min(1).max(10).default(2).describe("Number of recent responses to retrieve (max 10, default 2 for token efficiency)"),
        offset: z.number().int().min(0).default(0).describe("Number of newest responses to skip for pagination (0 = start from most recent)"),
      }),
      execute: async (args) => {
        const history = await runs.getResponseHistory(endpointId, args.limit, args.offset);

        if (history.length === 0) {
          return {
            count: 0,
            message: args.offset > 0
              ? `No more execution history found (offset ${args.offset})`
              : "No execution history found for this endpoint",
            hasMore: false,
            pagination: { offset: args.offset, limit: args.limit },
          };
        }

        // Truncate response bodies to prevent token overflow
        const truncatedResponses = history.map(r => ({
          responseBody: truncateResponseBody(r.responseBody),
          timestamp: r.timestamp.toISOString(),
          status: r.status,
          durationMs: r.durationMs,
        }));

        // Check if there are more results by requesting one extra with next offset
        const hasMoreCheck = await runs.getResponseHistory(endpointId, 1, args.offset + args.limit);
        const hasMore = hasMoreCheck.length > 0;

        return {
          count: history.length,
          pagination: {
            offset: args.offset,
            limit: args.limit,
            nextOffset: hasMore ? args.offset + args.limit : undefined,
          },
          hasMore,
          responses: truncatedResponses,
          hint: hasMore
            ? `More history available - call again with offset: ${args.offset + args.limit} to get next ${args.limit} older responses`
            : args.offset > 0
              ? "Reached end of history"
              : undefined,
          tokenSavingNote: "Response bodies truncated at 1000 chars to prevent token overflow",
        };
      },
    }),

    get_sibling_latest_responses: tool({
      description: "Get latest responses from all sibling endpoints in the same job. Use this for coordinating across endpoints (e.g., ETL pipeline dependencies, cross-endpoint monitoring).",
      schema: z.object({}),
      execute: async () => {
        const siblings = await runs.getSiblingLatestResponses(jobId, endpointId);

        if (siblings.length === 0) {
          return {
            count: 0,
            message: "No sibling endpoints found or no executions yet",
            siblings: [],
          };
        }

        return {
          count: siblings.length,
          siblings: siblings.map(s => ({
            endpointId: s.endpointId,
            endpointName: s.endpointName,
            responseBody: s.responseBody,
            timestamp: s.timestamp.toISOString(),
            status: s.status,
          })),
        };
      },
    }),
  });
}
