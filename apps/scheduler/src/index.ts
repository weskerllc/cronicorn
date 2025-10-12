/**
 * Worker Composition Root
 *
 * Wires all adapters together for production deployment.
 * This is the main entry point for the scheduling worker.
 */

import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { DrizzleJobsRepo, DrizzleRunsRepo, jobEndpoints, runs } from "@cronicorn/adapter-drizzle";
import { HttpDispatcher } from "@cronicorn/adapter-http";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { Scheduler } from "@cronicorn/scheduler";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

/**
 * Structured JSON logger
 */
function logger(level: "info" | "warn" | "error" | "fatal", message: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    }));
}

/**
 * Configuration schema with sensible defaults
 */
const configSchema = z.object({
    DATABASE_URL: z.string().url(),
    BATCH_SIZE: z.coerce.number().int().positive().default(10),
    POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    LOCK_TTL_MS: z.coerce.number().int().positive().default(60000),
});

type Config = z.infer<typeof configSchema>;

/**
 * Main worker function
 */
async function main() {
    // Parse and validate configuration
    // eslint-disable-next-line node/no-process-env
    const config: Config = configSchema.parse(process.env);

    // Setup database connection
    const pool = new Pool({ connectionString: config.DATABASE_URL });
    const db = drizzle(pool, { schema: { jobEndpoints, runs } });

    // Instantiate all adapters
    const clock = new SystemClock();
    const cron = new CronParserAdapter();
    const dispatcher = new HttpDispatcher();
    const jobsRepo = new DrizzleJobsRepo(db);
    const runsRepo = new DrizzleRunsRepo(db);

    // Wire up scheduler with dependencies
    const scheduler = new Scheduler({
        clock,
        cron,
        dispatcher,
        jobs: jobsRepo,
        runs: runsRepo,
    });

    // State for tick loop and shutdown
    let currentTick: Promise<void> | null = null;
    let isShuttingDown = false;

    logger("info", "Worker started", {
        batchSize: config.BATCH_SIZE,
        pollIntervalMs: config.POLL_INTERVAL_MS,
        lockTtlMs: config.LOCK_TTL_MS,
    });

    // Main tick loop
    const intervalId = setInterval(async () => {
        if (isShuttingDown)
            return;

        try {
            currentTick = scheduler.tick(config.BATCH_SIZE, config.LOCK_TTL_MS);
            await currentTick;
            currentTick = null;
        }
        catch (err) {
            logger("error", "Tick failed", {
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
            // Continue to next tick - don't crash worker
        }
    }, config.POLL_INTERVAL_MS);

    // Graceful shutdown handler
    async function shutdown(signal: string) {
        logger("info", "Shutdown signal received", { signal });
        isShuttingDown = true;
        clearInterval(intervalId);

        if (currentTick) {
            logger("info", "Waiting for current tick to complete");
            await currentTick;
        }

        await pool.end();
        logger("info", "Worker shutdown complete");
        process.exit(0);
    }

    // Register shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

// Top-level error handler for startup failures
main().catch((err) => {
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "fatal",
        message: "Worker failed to start",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
    }));
    process.exit(1);
});
