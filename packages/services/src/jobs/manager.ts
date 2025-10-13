import type { Clock, JobEndpoint } from "@cronicorn/domain";

import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { DrizzleJobsRepo } from "@cronicorn/adapter-drizzle";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { nanoid } from "nanoid";

import type { CreateJobInput, TransactionProvider } from "../types.js";

/**
 * JobsManager handles business logic for job operations.
 *
 * Responsibilities:
 * - Validate business rules
 * - Construct domain entities
 * - Calculate scheduling (nextRunAt)
 * - Orchestrate repository operations
 * - Manage transactions
 *
 * This layer is framework-agnostic and can be used by:
 * - Hono HTTP API
 * - MCP server adapter
 * - CLI tools
 * - Background workers
 */
export class JobsManager {
    private readonly clock: Clock;
    private readonly cron: CronParserAdapter;

    constructor(
        private readonly txProvider: TransactionProvider,
        clock?: Clock,
    ) {
        this.clock = clock ?? new SystemClock();
        this.cron = new CronParserAdapter();
    }

    /**
     * Create a new job for a user.
     *
     * @param userId - The user/tenant ID who owns this job
     * @param input - Job configuration
     * @returns The created JobEndpoint domain entity
     */
    async createJob(userId: string, input: CreateJobInput): Promise<JobEndpoint> {
        return this.txProvider.transaction(async (tx) => {
            const now = this.clock.now();
            const endpointId = nanoid();
            const jobId = nanoid(); // TODO: Proper job grouping in future phase

            // Build JobEndpoint domain entity
            const endpoint: JobEndpoint = {
                id: endpointId,
                jobId,
                tenantId: userId, // Use userId as tenantId for now
                name: input.name,
                baselineCron: input.baselineCron,
                baselineIntervalMs: input.baselineIntervalMs,
                minIntervalMs: input.minIntervalMs,
                maxIntervalMs: input.maxIntervalMs,
                nextRunAt: now, // Temporary: will calculate below
                failureCount: 0,
                url: input.url,
                method: input.method,
                headersJson: input.headersJson,
                bodyJson: input.bodyJson,
                timeoutMs: input.timeoutMs,
            };

            // Calculate initial nextRunAt based on baseline schedule
            // For cron: calculate next occurrence from now
            // For interval: add interval to now
            // The scheduler will use full governor logic (with AI hints, clamps, etc.) for subsequent runs
            if (endpoint.baselineCron) {
                endpoint.nextRunAt = this.cron.next(endpoint.baselineCron, now);
            }
            else if (endpoint.baselineIntervalMs) {
                endpoint.nextRunAt = new Date(now.getTime() + endpoint.baselineIntervalMs);
            }
            else {
                // Fallback: shouldn't happen due to validation, but be safe
                endpoint.nextRunAt = new Date(now.getTime() + 60_000);
            }

            // Persist to database
            // eslint-disable-next-line ts/consistent-type-assertions, ts/no-explicit-any
            const repo = new DrizzleJobsRepo(tx as any, () => now);
            await repo.add(endpoint);

            return endpoint;
        });
    }
}
