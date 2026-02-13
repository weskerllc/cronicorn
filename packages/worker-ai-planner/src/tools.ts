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
 * Truncate response body to prevent token overflow in AI context.
 * Handles both string and object response bodies.
 * Returns the truncated value and whether truncation occurred.
 */
function truncateResponseBody(
  responseBody: unknown,
  maxLength = 1000,
): { value: unknown; wasTruncated: boolean } {
  if (typeof responseBody === "string") {
    if (responseBody.length <= maxLength)
      return { value: responseBody, wasTruncated: false };
    return {
      value: `${responseBody.substring(0, maxLength)}...[truncated]`,
      wasTruncated: true,
    };
  }

  if (typeof responseBody === "object" && responseBody !== null) {
    const str = JSON.stringify(responseBody);
    if (str.length <= maxLength)
      return { value: responseBody, wasTruncated: false };
    try {
      return {
        value: JSON.parse(str.substring(0, maxLength - 20)),
        wasTruncated: true,
      };
    }
    catch {
      return {
        value: `${str.substring(0, maxLength)}...[truncated]`,
        wasTruncated: true,
      };
    }
  }

  return { value: responseBody, wasTruncated: false };
}

function summarizeResponseBody(responseBody: unknown, maxLength = 200): string | null {
  if (responseBody === null || typeof responseBody === "undefined")
    return null;

  if (typeof responseBody === "string")
    return responseBody.length <= maxLength ? responseBody : `${responseBody.slice(0, maxLength)}...[truncated]`;

  if (typeof responseBody === "object") {
    try {
      const str = JSON.stringify(responseBody);
      return str.length <= maxLength ? str : `${str.slice(0, maxLength)}...[truncated]`;
    }
    catch {
      return "[unserializable object]";
    }
  }

  return String(responseBody).slice(0, maxLength);
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
        next_analysis_in_ms: z.number().int().min(300000).max(86400000).optional().describe("When to analyze this endpoint again (ms). Min 5min, Max 24h. Omit to use baseline interval. Set shorter during incidents, longer when stable."),
      }),
      execute: async (args) => {
        // This is a terminal tool - just return the analysis
        // The reasoning will be captured by the planner
        return {
          status: "analysis_complete",
          reasoning: args.reasoning,
          actions_taken: args.actions_taken || [],
          confidence: args.confidence || "high",
          next_analysis_in_ms: args.next_analysis_in_ms,
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

    clear_hints: tool({
      description: "Clear all AI hints (interval and one-shot), reverting to baseline schedule immediately. Use when adaptive behavior should be reset, e.g., after manual intervention or when hints are no longer relevant.",
      schema: z.object({
        reason: z.string().describe("Explanation for clearing hints"),
      }),
      execute: async (args) => {
        await jobs.clearAIHints(endpointId);
        return `Cleared all AI hints, reverted to baseline schedule: ${args.reason}`;
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

        const { value, wasTruncated } = truncateResponseBody(result.responseBody, 500);

        return {
          found: true,
          responseBody: value,
          timestamp: result.timestamp.toISOString(),
          status: result.status,
          tokenSavingNote: wasTruncated
            ? "Response body truncated at 500 chars to reduce token usage"
            : undefined,
        };
      },
    }),

    get_response_history: tool({
      description: "Get recent responses to identify trends. Bodies are omitted by default to keep costs low—set includeBodies=true when you really need the raw payloads. Responses are returned newest-first.",
      schema: z.object({
        limit: z.number().int().min(1).max(10).default(5).describe("Number of recent responses to retrieve (max 10, default 5)"),
        offset: z.number().int().min(0).default(0).describe("Number of newest responses to skip for pagination (0 = start from most recent)"),
        includeBodies: z.boolean().default(false).describe("Set true to include truncated response bodies (defaults to metadata only)"),
      }),
      execute: async (args) => {
        // Fetch one extra to check for more results without a separate query
        const rawHistory = await runs.getResponseHistory(endpointId, args.limit + 1, args.offset);
        const hasMore = rawHistory.length > args.limit;
        const history = hasMore ? rawHistory.slice(0, args.limit) : rawHistory;

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
        let anyTruncated = false;
        let lastSignature: string | null = null;
        const truncatedResponses = history.map((r) => {
          const signature = JSON.stringify(r.responseBody ?? null);
          const isDuplicate = signature === lastSignature;
          if (!isDuplicate)
            lastSignature = signature;

          const { value, wasTruncated } = args.includeBodies
            ? truncateResponseBody(r.responseBody, 500)
            : { value: undefined, wasTruncated: false };
          if (wasTruncated)
            anyTruncated = true;

          // Preview only when bodies are omitted — avoids sending duplicate data
          const preview = args.includeBodies ? undefined : summarizeResponseBody(r.responseBody);

          return {
            responseBody: args.includeBodies ? value : undefined,
            responsePreview: preview,
            timestamp: r.timestamp.toISOString(),
            status: r.status,
            durationMs: r.durationMs,
            duplicateOfNewer: isDuplicate || undefined,
          };
        });

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
            ? "More history exists if needed, but smaller batches (<=5) keep token usage low"
            : args.offset > 0
              ? "Reached end of history"
              : undefined,
          tokenSavingNote: args.includeBodies
            ? anyTruncated
              ? "Response bodies truncated at 500 chars to prevent token overflow"
              : undefined
            : "Response bodies omitted by default. Set includeBodies=true only when necessary.",
        };
      },
    }),

    get_sibling_latest_responses: tool({
      description: "Get latest responses from sibling endpoints. Metadata is returned by default; set includeResponses=true only when you need the raw payloads.",
      schema: z.object({
        includeResponses: z.boolean().default(false).describe("Set true to include truncated response bodies"),
      }),
      execute: async (args) => {
        const now = clock.now();

        // Get sibling responses
        const siblingResponses = await runs.getSiblingLatestResponses(jobId, endpointId);

        if (siblingResponses.length === 0) {
          return {
            count: 0,
            message: "No sibling endpoints found or no executions yet",
            siblings: [],
          };
        }

        // Get all endpoints in job to get schedule/hint info
        const allEndpoints = await jobs.listEndpointsByJob(jobId);
        const siblingEndpoints = allEndpoints.filter(ep => ep.id !== endpointId);

        // Combine response data with endpoint info
        const enrichedSiblings = siblingResponses.map((response) => {
          const endpoint = siblingEndpoints.find(ep => ep.id === response.endpointId);
          const { value, wasTruncated } = args.includeResponses
            ? truncateResponseBody(response.responseBody, 400)
            : { value: undefined, wasTruncated: false };
          const preview = summarizeResponseBody(response.responseBody);

          // Build schedule info
          const scheduleInfo = endpoint
            ? {
                baseline: endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms`,
                nextRunAt: endpoint.nextRunAt?.toISOString() || null,
                lastRunAt: endpoint.lastRunAt?.toISOString() || null,
                isPaused: !!(endpoint.pausedUntil && endpoint.pausedUntil > now),
                pausedUntil: endpoint.pausedUntil?.toISOString() || null,
                failureCount: endpoint.failureCount || 0,
              }
            : null;

          // Build AI hints info (if active)
          const aiHintsActive = endpoint?.aiHintExpiresAt && endpoint.aiHintExpiresAt > now;
          const aiHints = aiHintsActive
            ? {
                intervalMs: endpoint?.aiHintIntervalMs || null,
                nextRunAt: endpoint?.aiHintNextRunAt?.toISOString() || null,
                expiresAt: endpoint?.aiHintExpiresAt?.toISOString() || null,
                reason: endpoint?.aiHintReason || null,
              }
            : null;

          return {
            endpointId: response.endpointId,
            endpointName: response.endpointName,
            responseBody: args.includeResponses ? value : undefined,
            responsePreview: preview,
            timestamp: response.timestamp.toISOString(),
            status: response.status,
            schedule: scheduleInfo,
            aiHints,
            tokenSavingNote: args.includeResponses && wasTruncated
              ? "Response truncated at 400 chars"
              : undefined,
          };
        });

        return {
          count: enrichedSiblings.length,
          siblings: enrichedSiblings,
          note: args.includeResponses
            ? undefined
            : "Response bodies omitted by default to minimize token usage",
        };
      },
    }),
  });
}
