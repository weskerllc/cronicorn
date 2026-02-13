/**
 * AI Planner Worker
 *
 * Analyzes endpoint execution patterns and writes adaptive scheduling hints.
 * Runs independently from scheduler worker - communicates via database.
 */

import { openai } from "@ai-sdk/openai";
import { createVercelAiClient } from "@cronicorn/adapter-ai";
import { DrizzleJobsRepo, DrizzleQuotaGuard, DrizzleRunsRepo, DrizzleSessionsRepo, schema } from "@cronicorn/adapter-drizzle";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { DEV_DATABASE } from "@cronicorn/config-defaults";
import { AIPlanner } from "@cronicorn/worker-ai-planner";
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
  DATABASE_URL: z.string().url().default(DEV_DATABASE.URL),
  // Database connection pool configuration
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"), // Cost-effective for MVP
  AI_ANALYSIS_INTERVAL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000), // 5 minutes
  AI_LOOKBACK_MINUTES: z.coerce.number().int().positive().default(5), // Analyze endpoints with runs in last 5 min
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(1500), // Sufficient for comprehensive analysis with response data queries
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000), // 30 seconds
});

type Config = z.infer<typeof configSchema>;

/**
 * Main worker function
 */
async function main() {
  // Parse and validate configuration
  // eslint-disable-next-line node/no-process-env
  const config: Config = configSchema.parse(process.env);

  // Check for OpenAI API key
  if (!config.OPENAI_API_KEY) {
    logger("warn", "OPENAI_API_KEY not set - AI Planner will not run");
    logger("info", "Set OPENAI_API_KEY environment variable to enable AI analysis");
    process.exit(0);
  }

  // Setup database connection
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: config.DB_POOL_MAX,
  });
  const db = drizzle(pool, { schema });

  // Instantiate adapters
  const clock = new SystemClock();
  const jobsRepo = new DrizzleJobsRepo(db);
  const runsRepo = new DrizzleRunsRepo(db);
  const sessionsRepo = new DrizzleSessionsRepo(db);
  const quotaGuard = new DrizzleQuotaGuard(db);

  // Create AI client
  const aiClient = createVercelAiClient({
    model: openai(config.AI_MODEL),
    maxOutputTokens: config.AI_MAX_TOKENS,
    temperature: config.AI_TEMPERATURE,
    logger: {
      // TODO: Use real logger
      // eslint-disable-next-line ts/consistent-type-assertions
      info: (msg: string, meta?: unknown) => logger("info", `[AI] ${msg}`, meta as Record<string, unknown>),
      // eslint-disable-next-line ts/consistent-type-assertions
      warn: (msg: string, meta?: unknown) => logger("warn", `[AI] ${msg}`, meta as Record<string, unknown>),
      // eslint-disable-next-line ts/consistent-type-assertions
      error: (msg: string, meta?: unknown) => logger("error", `[AI] ${msg}`, meta as Record<string, unknown>),
    },
  });

  // Create AI Planner
  const planner = new AIPlanner({
    aiClient,
    jobs: jobsRepo,
    runs: runsRepo,
    sessions: sessionsRepo,
    quota: quotaGuard,
    clock,
    logger: {
      info: (msg: string, meta?: Record<string, unknown>) => logger("info", msg, meta),
      warn: (msg: string, meta?: Record<string, unknown>) => logger("warn", msg, meta),
      error: (msg: string, meta?: Record<string, unknown>) => logger("error", msg, meta),
    },
    maxTokens: config.AI_MAX_TOKENS,
  });

  // State for tick loop and shutdown
  let currentAnalysis: Promise<void> | null = null;
  let isShuttingDown = false;

  logger("info", "AI Planner started", {
    model: config.AI_MODEL,
    analysisIntervalMs: config.AI_ANALYSIS_INTERVAL_MS,
    lookbackMinutes: config.AI_LOOKBACK_MINUTES,
    maxTokens: config.AI_MAX_TOKENS,
  });

  /**
   * Analysis tick - discover and analyze endpoints with recent activity
   *
   * Analysis is due when:
   * 1. First analysis: no previous session exists for the endpoint
   * 2. Scheduled: AI said "check after X" and that time has passed
   * 3. State-change override: new failures since last analysis (don't wait if things broke)
   */
  async function analysisTick() {
    if (isShuttingDown)
      return;

    try {
      const startTime = Date.now();
      const now = clock.now();

      // Find endpoints with runs in the lookback window
      const since = new Date(now.getTime() - config.AI_LOOKBACK_MINUTES * 60 * 1000);
      const endpointIds = await runsRepo.getEndpointsWithRecentRuns(since);

      if (endpointIds.length === 0) {
        logger("info", "No endpoints with recent activity - skipping analysis");
        return;
      }

      // Filter endpoints that need analysis
      const endpointsToAnalyze: string[] = [];

      for (const endpointId of endpointIds) {
        try {
          const lastSession = await sessionsRepo.getLastSession(endpointId);
          const endpoint = await jobsRepo.getEndpoint(endpointId);

          // First analysis: no previous session
          const isFirstAnalysis = !lastSession;

          // Scheduled: AI said "check after X" and that time has passed
          const scheduledTime = lastSession?.nextAnalysisAt;
          const isDue = !scheduledTime || now >= scheduledTime;

          // State-change override: new failures since last analysis (respond to incidents quickly)
          const previousFailureCount = lastSession?.endpointFailureCount ?? 0;
          const hasNewFailures = endpoint.failureCount > previousFailureCount;

          if (isFirstAnalysis || isDue || hasNewFailures) {
            endpointsToAnalyze.push(endpointId);

            if (hasNewFailures && !isDue) {
              logger("info", "State-change override triggered early analysis", {
                endpointId,
                endpointName: endpoint.name,
                previousFailureCount,
                currentFailureCount: endpoint.failureCount,
              });
            }
          }
        }
        catch (err) {
          // Log but continue checking other endpoints
          logger("warn", "Failed to check if endpoint needs analysis", {
            endpointId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (endpointsToAnalyze.length === 0) {
        logger("info", "No endpoints due for analysis", {
          totalWithRecentRuns: endpointIds.length,
        });
        return;
      }

      logger("info", "Starting analysis cycle", {
        endpointCount: endpointsToAnalyze.length,
        totalWithRecentRuns: endpointIds.length,
        since: since.toISOString(),
      });

      // Analyze each endpoint that needs it
      await planner.analyzeEndpoints(endpointsToAnalyze);

      const duration = Date.now() - startTime;
      logger("info", "Analysis cycle complete", {
        analyzedCount: endpointsToAnalyze.length,
        skippedCount: endpointIds.length - endpointsToAnalyze.length,
        durationMs: duration,
      });
    }
    catch (err) {
      logger("error", "Analysis cycle failed", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      // Continue to next cycle - don't crash worker
    }
  }

  // Main analysis loop
  const intervalId = setInterval(async () => {
    if (isShuttingDown)
      return;

    currentAnalysis = analysisTick();
    await currentAnalysis;
    currentAnalysis = null;
  }, config.AI_ANALYSIS_INTERVAL_MS);

  // Run first analysis immediately
  logger("info", "Running initial analysis...");
  await analysisTick();

  // Graceful shutdown handler
  async function shutdown(signal: string) {
    logger("info", "Shutdown signal received", { signal });
    isShuttingDown = true;
    clearInterval(intervalId);

    if (currentAnalysis) {
      logger("info", "Waiting for current analysis to complete");

      const timeoutPromise = new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), config.SHUTDOWN_TIMEOUT_MS);
      });

      const result = await Promise.race([
        currentAnalysis.then(() => "completed" as const),
        timeoutPromise,
      ]);

      if (result === "timeout") {
        logger("warn", "Shutdown timeout reached, forcing exit", {
          timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
        });
      }
    }

    await pool.end();
    logger("info", "AI Planner shutdown complete");
    process.exit(0);
  }

  // Register shutdown handlers
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Uncaught exception handler - log and exit
  process.on("uncaughtException", (error: Error) => {
    logger("fatal", "Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Unhandled promise rejection handler - log and exit
  process.on("unhandledRejection", (reason: unknown) => {
    logger("fatal", "Unhandled rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    process.exit(1);
  });
}

// Top-level error handler for startup failures
main().catch((err) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "fatal",
    message: "AI Planner failed to start",
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));
  process.exit(1);
});
