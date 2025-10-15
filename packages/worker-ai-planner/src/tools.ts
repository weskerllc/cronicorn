/**
 * AI Tools for Adaptive Scheduling
 *
 * These tools are exposed to the AI to adjust endpoint scheduling dynamically.
 * Each tool is endpoint-scoped via closure (endpointId bound at creation time).
 */

import type { Clock, JobsRepo, JsonValue, RunsRepo } from "@cronicorn/domain";

import { defineTools, tool } from "@cronicorn/domain";
import { z } from "zod";

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
 * @param deps - Dependencies { jobs: JobsRepo, runs: RunsRepo, clock: Clock }
 * @returns Tools object with 6 tools (3 query + 3 action)
 */
export function createToolsForEndpoint(
  endpointId: string,
  jobId: string,
  deps: { jobs: JobsRepo; runs: RunsRepo; clock: Clock },
) {
  const { jobs, runs, clock } = deps;
  return defineTools({
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
      description: "Get recent response bodies from this endpoint to identify trends (e.g., increasing error rates, growing queue sizes, performance degradation). Returns up to 50 most recent responses.",
      schema: z.object({
        limit: z.number().int().min(1).max(50).default(10).describe("Number of recent responses to retrieve (max 50)"),
      }),
      execute: async (args) => {
        const history = await runs.getResponseHistory(endpointId, args.limit);

        if (history.length === 0) {
          return {
            count: 0,
            message: "No execution history found for this endpoint",
          };
        }

        return {
          count: history.length,
          responses: history.map(r => ({
            responseBody: r.responseBody,
            timestamp: r.timestamp.toISOString(),
            status: r.status,
            durationMs: r.durationMs,
          })),
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
