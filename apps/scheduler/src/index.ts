/**
 * Worker Composition Root
 *
 * Wires all adapters together for production deployment.
 * This is the main entry point for the scheduling worker.
 */

import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { DrizzleJobsRepo, DrizzleRunsRepo, schema } from "@cronicorn/adapter-drizzle";
import { HttpDispatcher } from "@cronicorn/adapter-http";
import { PinoLoggerAdapter } from "@cronicorn/adapter-pino";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { DEV_AUTH, DEV_DATABASE, DEV_ENV } from "@cronicorn/config-defaults";
import { Scheduler } from "@cronicorn/worker-scheduler";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import pino from "pino";
import { z } from "zod";

/**
 * Configuration schema with sensible defaults
 */
const configSchema = z.object({
  DATABASE_URL: z.string().url().default(DEV_DATABASE.URL),
  BETTER_AUTH_SECRET: z.string().min(32).default(DEV_AUTH.SECRET),
  BATCH_SIZE: z.coerce.number().int().positive().default(10),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  CLAIM_HORIZON_MS: z.coerce.number().int().positive().default(10000),
  CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
  ZOMBIE_RUN_THRESHOLD_MS: z.coerce.number().int().positive().default(3600000), // 1 hour
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default(DEV_ENV.LOG_LEVEL),
  // eslint-disable-next-line node/no-process-env
  NODE_ENV: z.enum(["development", "production", "test"]).default(process.env.NODE_ENV === "production" ? "production" : DEV_ENV.NODE_ENV),
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
  const db = drizzle(pool, { schema });

  // Instantiate all adapters
  const clock = new SystemClock();
  const cron = new CronParserAdapter();
  const dispatcher = new HttpDispatcher();
  const jobsRepo = new DrizzleJobsRepo(db, clock.now, config.BETTER_AUTH_SECRET);
  const runsRepo = new DrizzleRunsRepo(db);

  // Configure pino logger
  const pinoLogger = pino({
    level: config.LOG_LEVEL,
    ...(config.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
        }
      : {}),
  });
  const logger = new PinoLoggerAdapter(pinoLogger);

  // Wire up scheduler with dependencies
  const scheduler = new Scheduler({
    clock,
    cron,
    dispatcher,
    jobs: jobsRepo,
    runs: runsRepo,
    logger,
  });

  // State for tick loop and shutdown
  let currentTick: Promise<void> | null = null;
  let isShuttingDown = false;

  logger.info(
    {
      batchSize: config.BATCH_SIZE,
      pollIntervalMs: config.POLL_INTERVAL_MS,
      claimHorizonMs: config.CLAIM_HORIZON_MS,
      cleanupIntervalMs: config.CLEANUP_INTERVAL_MS,
      zombieRunThresholdMs: config.ZOMBIE_RUN_THRESHOLD_MS,
    },
    "Worker started",
  );

  // Main tick loop
  const intervalId = setInterval(async () => {
    if (isShuttingDown)
      return;

    try {
      currentTick = scheduler.tick(config.BATCH_SIZE, config.CLAIM_HORIZON_MS);
      await currentTick;
      currentTick = null;
    }
    catch (err) {
      logger.error(
        {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        "Tick failed",
      );
      // Continue to next tick - don't crash worker
    }
  }, config.POLL_INTERVAL_MS);

  // Zombie run cleanup loop
  const cleanupIntervalId = setInterval(async () => {
    if (isShuttingDown)
      return;

    try {
      const count = await scheduler.cleanupZombieRuns(config.ZOMBIE_RUN_THRESHOLD_MS);
      if (count > 0) {
        logger.info(
          {
            count,
            thresholdMs: config.ZOMBIE_RUN_THRESHOLD_MS,
          },
          "Zombie run cleanup completed",
        );
      }
    }
    catch (err) {
      logger.error(
        {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        "Zombie run cleanup failed",
      );
      // Continue - don't crash worker
    }
  }, config.CLEANUP_INTERVAL_MS);

  // Graceful shutdown handler
  async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received");
    isShuttingDown = true;
    clearInterval(intervalId);
    clearInterval(cleanupIntervalId);

    if (currentTick) {
      logger.info("Waiting for current tick to complete");
      await currentTick;
    }

    await pool.end();
    logger.info("Worker shutdown complete");
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
