/**
 * AI Tools for Adaptive Scheduling
 *
 * These tools are exposed to the AI to adjust endpoint scheduling dynamically.
 * Each tool is endpoint-scoped via closure (endpointId bound at creation time).
 */

import type { Clock, JobsRepo } from "@cronicorn/domain";

import { defineTools, tool } from "@cronicorn/scheduler";
import { z } from "zod";

/**
 * Create endpoint-scoped tools for AI to control scheduling.
 *
 * Tools write hints to the database via JobsRepo methods.
 * The scheduler picks up these hints on next execution (via governor).
 *
 * @param endpointId - The endpoint being analyzed
 * @param jobs - Repository for writing hints
 * @param clock - For calculating expiry times
 * @returns Tools object with propose_interval, propose_next_time, pause_until
 */
export function createToolsForEndpoint(
    endpointId: string,
    jobs: JobsRepo,
    clock: Clock,
) {
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
    });
}
