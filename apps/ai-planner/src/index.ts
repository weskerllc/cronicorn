/**
 * AI Planner Worker
 *
 * Analyzes endpoint execution patterns and writes adaptive scheduling hints.
 * Runs independently from scheduler worker - communicates via database.
 */

import { openai } from "@ai-sdk/openai";
import { createVercelAiClient } from "@cronicorn/adapter-ai";
import { DrizzleJobsRepo, DrizzleRunsRepo, DrizzleSessionsRepo, schema } from "@cronicorn/adapter-drizzle";
import { SystemClock } from "@cronicorn/adapter-system-clock";
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
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"), // Cost-effective for MVP
  AI_ANALYSIS_INTERVAL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000), // 5 minutes
  AI_LOOKBACK_MINUTES: z.coerce.number().int().positive().default(5), // Analyze endpoints with runs in last 5 min
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(500), // Keep responses concise
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
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
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // Instantiate adapters
  const clock = new SystemClock();
  const jobsRepo = new DrizzleJobsRepo(db);
  const runsRepo = new DrizzleRunsRepo(db);
  const sessionsRepo = new DrizzleSessionsRepo(db);

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
    clock,
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
   */
  async function analysisTick() {
    if (isShuttingDown)
      return;

    try {
      const startTime = Date.now();

      // Find endpoints with runs in the lookback window
      const since = new Date(clock.now().getTime() - config.AI_LOOKBACK_MINUTES * 60 * 1000);
      const endpointIds = await runsRepo.getEndpointsWithRecentRuns(since);

      if (endpointIds.length === 0) {
        logger("info", "No endpoints with recent activity - skipping analysis");
        return;
      }

      logger("info", "Starting analysis cycle", {
        endpointCount: endpointIds.length,
        since: since.toISOString(),
      });

      // Analyze each endpoint
      await planner.analyzeEndpoints(endpointIds);

      const duration = Date.now() - startTime;
      logger("info", "Analysis cycle complete", {
        endpointCount: endpointIds.length,
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
      await currentAnalysis;
    }

    await pool.end();
    logger("info", "AI Planner shutdown complete");
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
    message: "AI Planner failed to start",
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));
  process.exit(1);
});
