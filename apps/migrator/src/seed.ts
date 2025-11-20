#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * Performance Testing Data Seeder
 *
 * Creates large dataset to stress-test dashboard pagination and performance optimizations:
 * - 50 jobs (tests searchable job dropdowns)
 * - 250 endpoints (5 per job - tests backend pagination)
 * - Thousands of runs (tests timeline chart limiting to top 10)
 * - AI sessions for 30 endpoints (tests varied data distribution)
 *
 * Showcases all dashboard features:
 * - Job Health Chart: Searchable combobox with 50 jobs
 * - Scheduling Intelligence: Mix of baseline, AI-driven, and clamped runs
 * - Execution Timeline: Limited to top 10 of 250 endpoints by run count
 * - Endpoint Table: Paginated view (20 per page) of all 250 endpoints
 * - Filtering: Multiple jobs/endpoints/statuses to filter
 *
 * Run with: pnpm tsx apps/migrator/src/seed.ts
 */

import { schema } from "@cronicorn/adapter-drizzle";
import { DEV_AUTH, DEV_DATABASE } from "@cronicorn/config-defaults";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import pg from "pg";

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEV_DATABASE.URL,
});

const db = drizzle(pool, { schema });

// Demo user name from env (we'll look up the ID from the database)
const DEMO_USER_NAME = process.env.DEMO_USER_NAME || DEV_AUTH.ADMIN_NAME;

// Configurable seed size (dev-friendly defaults)
const NUM_JOBS = Number.parseInt(process.env.SEED_NUM_JOBS || "5", 10); // Default: 5 jobs (was 50)
const ENDPOINTS_PER_JOB = Number.parseInt(process.env.SEED_ENDPOINTS_PER_JOB || "3", 10); // Default: 3 per job (was 5)

// Flash Sale Timeline (simulate recent data - today's date)
const NOW = new Date(); // Current time
const SALE_END = new Date(NOW.getTime() - 1 * 60 * 60 * 1000); // Sale ended 1 hour ago
const SALE_START = new Date(NOW.getTime() - 20 * 60 * 60 * 1000); // Sale started 20 hours ago (covers most of last 24h)

// Time ranges for dashboard filtering tests
const DAYS_AGO_45 = new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000); // Older than 30 days

// Generate jobs based on configuration
function generateJobs() {
  const jobs: Array<{ id: string; name: string; description: string; status: "active" | "paused" | "archived" }> = [];
  const jobTypes = [
    { prefix: "monitoring", name: "Monitoring", desc: "Real-time monitoring" },
    { prefix: "health", name: "Health Checks", desc: "Infrastructure health" },
    { prefix: "inventory", name: "Inventory Sync", desc: "Stock management" },
    { prefix: "analytics", name: "Analytics", desc: "Data processing" },
    { prefix: "alerts", name: "Alert System", desc: "Notification management" },
  ];

  for (let i = 1; i <= NUM_JOBS; i++) {
    const type = jobTypes[(i - 1) % jobTypes.length];
    // Archive every 5th job to test archived job logic
    const isArchived = i % 5 === 0;
    jobs.push({
      id: `job-${type.prefix}-${i}`,
      name: `${type.name}${NUM_JOBS > 1 ? ` ${i}` : ""}${isArchived ? " (Archived)" : ""}`,
      description: `${type.desc}${NUM_JOBS > 1 ? ` - Instance ${i}` : ""}`,
      status: isArchived ? "archived" : "active",
    });
  }

  return jobs;
}

const JOBS = generateJobs();

// Generate endpoints per job based on configuration
function generateEndpoints(jobs: ReturnType<typeof generateJobs>) {
  type EndpointConfig = {
    id: string;
    jobId: string;
    name: string;
    url: string;
    baselineIntervalMs: number;
    minIntervalMs: number;
    maxIntervalMs: number;
    description: string;
    pattern: string;
    successRate: number;
    archived: boolean;
    jobStatus: "active" | "paused" | "archived";
  };

  const endpoints: EndpointConfig[] = [];
  const patterns = ["adaptive-tight", "adaptive-tight", "adaptive-tight", "oneshot", "steady"];
  const endpointTypes = [
    { name: "API Health", url: "/health", baseline: 2 * 60 * 1000, successRate: 0.98 },
    { name: "Database Check", url: "/db", baseline: 3 * 60 * 1000, successRate: 0.92 },
    { name: "Cache Status", url: "/cache", baseline: 5 * 60 * 1000, successRate: 0.95 },
    { name: "Queue Monitor", url: "/queue", baseline: 1 * 60 * 1000, successRate: 0.88 },
    { name: "Metrics Collect", url: "/metrics", baseline: 10 * 60 * 1000, successRate: 0.99 },
  ];

  jobs.forEach((job, _jobIndex) => {
    // Generate ENDPOINTS_PER_JOB endpoints for each job
    for (let i = 0; i < ENDPOINTS_PER_JOB; i++) {
      const type = endpointTypes[i % endpointTypes.length];
      const pattern = patterns[i % patterns.length];

      // Archive logic:
      // - If job is archived, archive only first endpoint (to test mixed state)
      // - For active jobs, archive every 7th endpoint
      const isEndpointArchived = job.status === "archived"
        ? i === 0 // First endpoint of archived job is also archived
        : i % 7 === 0; // Every 7th endpoint of active jobs is archived

      endpoints.push({
        id: `ep-${job.id}-${i}`,
        jobId: job.id,
        name: `${type.name}${isEndpointArchived ? " (Archived)" : ""}`,
        url: `https://api.example.com${type.url}`,
        baselineIntervalMs: type.baseline,
        minIntervalMs: Math.floor(type.baseline / 10), // 10% of baseline
        maxIntervalMs: type.baseline * 3, // 3x baseline
        description: `${type.name} for ${job.name}`,
        pattern,
        successRate: type.successRate,
        archived: isEndpointArchived,
        jobStatus: job.status,
      });
    }
  });

  return endpoints;
}

const ENDPOINTS = generateEndpoints(JOBS);

/**
 * Generate realistic run data based on endpoint pattern
 * Includes runs across different time ranges for dashboard filtering tests:
 * - Last 24 hours
 * - Last 7 days
 * - Last 30 days
 * - Older than 30 days (45+ days ago)
 */
function generateRuns(endpoint: typeof ENDPOINTS[0]): Array<schema.RunInsert> {
  const runs: Array<schema.RunInsert> = [];

  // Start time: Always start from 45 days ago to ensure we have data in all time ranges
  // This ensures dashboard filters work correctly (24h, 7d, 30d, >30d)
  const startTime = DAYS_AGO_45;

  let currentTime = new Date(startTime.getTime());

  const getInterval = (time: Date): number => {
    const hour = time.getHours();
    const isSaleHour = time >= SALE_START && time <= SALE_END;
    const isPeakSurge = hour >= 9 && hour <= 11 && isSaleHour; // 9am-11am is peak

    if (endpoint.pattern === "adaptive-tight") {
      if (isPeakSurge)
        return endpoint.minIntervalMs; // Tighten to min during surge
      if (isSaleHour)
        return endpoint.minIntervalMs * 3; // Moderately tight during sale
      return endpoint.baselineIntervalMs; // Baseline otherwise
    }

    if (endpoint.pattern === "oneshot") {
      // Fire a few one-shots during peak surge
      if (isPeakSurge && Math.random() < 0.3)
        return 15 * 60 * 1000; // Every 15 min during surge
      return endpoint.baselineIntervalMs * 4; // Very sparse otherwise
    }

    return endpoint.baselineIntervalMs; // Steady pattern
  };

  const getSource = (time: Date): string => {
    const hour = time.getHours();
    const isSaleHour = time >= SALE_START && time <= SALE_END;
    const isPeakSurge = hour >= 9 && hour <= 11 && isSaleHour;

    if (endpoint.pattern === "oneshot" && isPeakSurge) {
      return "ai-oneshot"; // One-shot AI intervention
    }

    if (endpoint.pattern === "adaptive-tight" && isPeakSurge) {
      return Math.random() < 0.9 ? "ai-interval" : "clamped-min"; // Mostly AI (90%), some clamped
    }

    if (endpoint.pattern === "adaptive-tight" && isSaleHour) {
      return Math.random() < 0.7 ? "ai-interval" : "baseline-interval"; // More AI during sale (70%)
    }

    // Add some AI activity even during normal hours for adaptive endpoints
    if (endpoint.pattern === "adaptive-tight" && Math.random() < 0.2) {
      return "ai-interval"; // 20% AI even outside sale hours
    }

    return "baseline-interval"; // Default baseline
  };

  while (currentTime < NOW) {
    const interval = getInterval(currentTime);
    currentTime = new Date(currentTime.getTime() + interval);

    if (currentTime > NOW)
      break;

    const isSuccess = Math.random() < endpoint.successRate;
    const duration = isSuccess
      ? Math.floor(100 + Math.random() * 300) // 100-400ms for success
      : Math.floor(500 + Math.random() * 2000); // 500-2500ms for failures

    runs.push({
      id: `run-${crypto.randomUUID()}`,
      endpointId: endpoint.id,
      status: isSuccess ? "success" : "failure",
      attempt: 1,
      source: getSource(currentTime),
      startedAt: currentTime,
      finishedAt: new Date(currentTime.getTime() + duration),
      durationMs: duration,
      errorMessage: isSuccess ? null : "Connection timeout",
      statusCode: isSuccess ? 200 : 504,
    });
  }

  return runs;
}

/**
 * Generate AI analysis sessions (sparse - only during key moments)
 * Generate sessions for first half of endpoints to have varied data
 */
function generateAISessions(endpoints: ReturnType<typeof generateEndpoints>): Array<typeof schema.aiAnalysisSessions.$inferInsert> {
  const sessions: Array<typeof schema.aiAnalysisSessions.$inferInsert> = [];

  // Prefer adaptive endpoints for heavy AI activity; others get light coverage
  const adaptive = endpoints.filter(e => e.pattern === "adaptive-tight" && !e.archived);
  const oneshot = endpoints.filter(e => e.pattern === "oneshot" && !e.archived);
  const steady = endpoints.filter(e => e.pattern === "steady" && !e.archived);

  // Pick subsets for different session intensities:
  // - Ultra-heavy: 80-150 sessions (1-2 endpoints max)
  // - Heavy: 30-60 sessions
  // - Medium: 10-20 sessions
  // - Light: 2-5 sessions
  const ultraHeavyAdaptive = adaptive.slice(0, Math.min(2, adaptive.length));
  const heavyAdaptive = adaptive.slice(ultraHeavyAdaptive.length, ultraHeavyAdaptive.length + Math.max(2, Math.floor(adaptive.length * 0.3)));
  const mediumAdaptive = adaptive.slice(ultraHeavyAdaptive.length + heavyAdaptive.length, ultraHeavyAdaptive.length + heavyAdaptive.length + Math.floor(adaptive.length * 0.3));
  const lightAdaptive = adaptive.filter(e => !ultraHeavyAdaptive.includes(e) && !heavyAdaptive.includes(e) && !mediumAdaptive.includes(e));

  // Helper: build realistic tool call entries using tool names and schemas in packages/worker-ai-planner/src/tools.ts
  const tc = {
    getLatest: () => ({ tool: "get_latest_response", args: {}, result: { found: true, responseBody: { ok: true, errors: 0 }, timestamp: new Date().toISOString(), status: "success" } }),
    getHistory: (limit: number, offset: number) => ({
      tool: "get_response_history",
      args: { limit, offset },
      result: {
        count: Math.max(0, limit - (offset % 2)),
        pagination: {
          offset,
          limit,
          nextOffset: offset + limit,
        },
        hasMore: true,
        responses: Array.from({ length: limit }).map((_, i) => ({
          responseBody: { ok: true, errors: i + offset },
          timestamp: new Date(Date.now() - (i + offset + 1) * 300000).toISOString(),
          status: "success",
          durationMs: 200 + (i * 15),
        })),
        tokenSavingNote: "Response bodies truncated at 1000 chars to prevent token overflow",
      },
    }),
    siblings: () => ({
      tool: "get_sibling_latest_responses",
      args: {},
      result: {
        count: 2,
        siblings: [
          {
            endpointId: "sib-1",
            endpointName: "DB",
            responseBody: { ok: true },
            timestamp: new Date().toISOString(),
            status: "success",
          },
          {
            endpointId: "sib-2",
            endpointName: "Cache",
            responseBody: { ok: true },
            timestamp: new Date().toISOString(),
            status: "success",
          },
        ],
      },
    }),
    proposeInterval: (intervalMs: number, ttlMinutes: number, reason?: string) => ({ tool: "propose_interval", args: { intervalMs, ttlMinutes, reason }, result: `Adjusted interval to ${intervalMs}ms (expires in ${ttlMinutes} minutes)${reason ? `: ${reason}` : ""}` }),
    proposeNext: (date: Date, ttlMinutes: number, reason?: string) => ({ tool: "propose_next_time", args: { nextRunAtIso: date.toISOString(), ttlMinutes, reason }, result: `Scheduled one-shot execution at ${date.toISOString()} (expires in ${ttlMinutes} minutes)${reason ? `: ${reason}` : ""}` }),
    pauseUntil: (until: Date | null, reason?: string) => ({ tool: "pause_until", args: { untilIso: until ? until.toISOString() : null, reason }, result: until ? `Paused until ${until.toISOString()}${reason ? `: ${reason}` : ""}` : `Resumed execution${reason ? `: ${reason}` : ""}` }),
    submit: (reasoning: string, actions: string[], confidence: "high" | "medium" | "low" = "high") => ({ tool: "submit_analysis", args: { reasoning, actions_taken: actions, confidence }, result: { status: "analysis_complete", reasoning, actions_taken: actions, confidence } }),
  } as const;

  // Utility to clamp a time into the sale window vicinity (kept for consistency)
  // const aroundSale = (minutesOffset: number) => new Date(SALE_START.getTime() + minutesOffset * 60 * 1000);

  // Ultra-heavy sessions: 80-150 per endpoint (simulates highly monitored critical endpoints)
  ultraHeavyAdaptive.forEach((endpoint, idx) => {
    const count = 80 + (idx * 35); // 80, 115, 150 etc
    for (let i = 0; i < count; i++) {
      // Distribute across all time ranges for realistic coverage
      const daysAgo = Math.floor((i / count) * 45); // Spread across 45 days
      const baseTime = new Date(DAYS_AGO_45.getTime() + daysAgo * 24 * 60 * 60 * 1000);
      const minuteOffset = (i % 60) * 15 + (idx * 7); // Varied times throughout each day
      const analyzedAt = new Date(baseTime.getTime() + minuteOffset * 60 * 1000);

      const actions: string[] = [];
      const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [];

      // Query patterns vary by position in sequence
      toolCalls.push(tc.getLatest());
      if (i % 3 === 0)
        toolCalls.push(tc.getHistory(2, 0));
      if (i % 5 === 0)
        toolCalls.push(tc.getHistory(2, 2));
      if (i % 7 === 0)
        toolCalls.push(tc.siblings());

      // Action logic based on position and time
      const isRecentHour = analyzedAt >= new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
      const isDuringSale = analyzedAt >= SALE_START && analyzedAt <= SALE_END;
      const isPeakTime = analyzedAt.getHours() >= 9 && analyzedAt.getHours() <= 11;

      if (isDuringSale && isPeakTime && i % 4 === 0) {
        toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs / 5)), 90, "Peak surge - aggressive monitoring"));
        actions.push("propose_interval");
      }
      else if (isDuringSale && i % 6 === 0) {
        toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs / 2)), 60, "Sale traffic sustained"));
        actions.push("propose_interval");
      }
      else if (isRecentHour && i % 8 === 0) {
        toolCalls.push(tc.proposeInterval(endpoint.baselineIntervalMs, 30, "Normalizing post-event"));
        actions.push("propose_interval");
      }
      else if (i % 15 === 0) {
        const soon = new Date(analyzedAt.getTime() + 10 * 60 * 1000);
        toolCalls.push(tc.proposeNext(soon, 25, "Spot check"));
        actions.push("propose_next_time");
      }

      // Occasional pause for maintenance
      if (i % 50 === 0 && i > 0) {
        const until = new Date(analyzedAt.getTime() + 15 * 60 * 1000);
        toolCalls.push(tc.pauseUntil(until, "Scheduled maintenance"));
        actions.push("pause_until");
      }

      const reasoning = actions.length > 0
        ? `Active monitoring with ${actions.join(", ")} adjustment${actions.length > 1 ? "s" : ""}.`
        : "Routine health check - metrics within expected range.";

      toolCalls.push(tc.submit(reasoning, actions, actions.length ? "high" : "medium"));

      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt,
        toolCalls,
        reasoning,
        tokenUsage: 850 + (i % 30) * 15 + idx * 20,
        durationMs: 230 + (i % 10) * 25,
      });
    }
  });

  // Heavy sessions for selected adaptive endpoints (30-60 per endpoint)
  heavyAdaptive.forEach((endpoint, idx) => {
    const count = 30 + (idx % 31); // 30..60
    for (let i = 0; i < count; i++) {
      // Distribute more evenly across time ranges
      const daysAgo = Math.floor((i / count) * 40); // Spread across 40 days
      const baseTime = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const minuteOffset = (i % 48) * 20 + (idx * 5); // Throughout day
      const analyzedAt = new Date(baseTime.getTime() - minuteOffset * 60 * 1000);

      const phase = i % 5;

      const actions: string[] = [];
      const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [];

      // Query patterns
      toolCalls.push(tc.getLatest());
      if (i % 2 === 0)
        toolCalls.push(tc.getHistory(2, 0));
      if (i % 4 === 0)
        toolCalls.push(tc.getHistory(2, 2));
      if (i % 5 === 0)
        toolCalls.push(tc.siblings());

      // Actions based on phase and conditions
      const isDuringSale = analyzedAt >= SALE_START && analyzedAt <= SALE_END;
      const hour = analyzedAt.getHours();
      const isPeakHours = hour >= 8 && hour <= 18;

      if (phase === 1 || (isDuringSale && isPeakHours && i % 3 === 0)) {
        toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs / 3)), 90, "High activity period"));
        actions.push("propose_interval");
      }
      else if (phase === 2 && i % 3 === 0) {
        toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs / 2)), 60, "Moderate adjustment"));
        actions.push("propose_interval");
      }
      else if (phase === 3 && i % 4 === 0) {
        toolCalls.push(tc.proposeInterval(endpoint.baselineIntervalMs, 40, "Returning to baseline"));
        actions.push("propose_interval");
      }
      else if (i % 10 === 0) {
        const soon = new Date(analyzedAt.getTime() + 8 * 60 * 1000);
        toolCalls.push(tc.proposeNext(soon, 25, "Scheduled check"));
        actions.push("propose_next_time");
      }

      if (i % 25 === 0 && i > 0) {
        const until = new Date(analyzedAt.getTime() + 12 * 60 * 1000);
        toolCalls.push(tc.pauseUntil(until, "Maintenance window"));
        actions.push("pause_until");
      }

      const reasoning = actions.length > 0
        ? `Adjusted scheduling based on traffic analysis (${actions.join(", ")}).`
        : "Monitoring - no adjustments needed at this time.";
      toolCalls.push(tc.submit(reasoning, actions, actions.length ? "high" : "medium"));

      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt,
        toolCalls,
        reasoning,
        tokenUsage: 900 + (idx * 17) + i * 25,
        durationMs: 250 + (i % 5) * 60,
      });
    }
  });

  // Medium sessions for adaptive endpoints (10-20 per)
  mediumAdaptive.forEach((endpoint, idx) => {
    const count = 10 + (idx % 11); // 10..20
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor((i / count) * 30);
      const baseTime = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const analyzedAt = new Date(baseTime.getTime() - (i * 90 + idx * 7) * 60 * 1000);

      const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [tc.getLatest()];
      if (i % 2 === 0)
        toolCalls.push(tc.getHistory(2, 0));
      if (i % 4 === 0)
        toolCalls.push(tc.siblings());

      const actions: string[] = [];
      if (i % 3 === 0) {
        toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs * 0.7)), 50, "Load adjustment"));
        actions.push("propose_interval");
      }

      const reasoning = actions.length ? "Regular optimization cycle." : "Metrics stable.";
      toolCalls.push(tc.submit(reasoning, actions, "medium"));

      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt,
        toolCalls,
        reasoning,
        tokenUsage: 650 + idx * 12,
        durationMs: 210 + i * 15,
      });
    }
  });

  // Light sessions for remaining adaptive endpoints (2-5 per)
  lightAdaptive.forEach((endpoint, idx) => {
    const count = 2 + (idx % 4);
    for (let i = 0; i < count; i++) {
      const analyzedAt = new Date(NOW.getTime() - (90 + i * 45 + idx * 5) * 60 * 1000);
      const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [tc.getLatest(), tc.getHistory(2, 0)];
      const reasoning = "Stable with occasional AI interval tuning.";
      toolCalls.push(tc.proposeInterval(Math.max(endpoint.minIntervalMs, Math.floor(endpoint.baselineIntervalMs * 0.75)), 45, "Slight increase in load"));
      toolCalls.push(tc.submit(reasoning, ["propose_interval"], "medium"));
      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt,
        toolCalls,
        reasoning,
        tokenUsage: 600 + idx * 10,
        durationMs: 220 + i * 40,
      });
    }
  });

  // Oneshoot-focused sessions: prefer propose_next_time during peaks (5-12 per endpoint)
  oneshot.slice(0, Math.max(2, Math.floor(oneshot.length * 0.5))).forEach((endpoint, idx) => {
    const count = 5 + (idx % 8); // 5..12
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor((i / count) * 20);
      const baseTime = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const analyzedAt = new Date(baseTime.getTime() - (i * 180 + idx * 13) * 60 * 1000);
      const soon = new Date(analyzedAt.getTime() + 10 * 60 * 1000);
      const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [
        tc.getLatest(),
        tc.getHistory(2, 0),
        tc.proposeNext(soon, 30, "Investigate spike via one-shot"),
        tc.submit("One-shot scheduled to inspect spike.", ["propose_next_time"], "medium"),
      ];
      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt,
        toolCalls,
        reasoning: "One-shot scheduled to inspect spike.",
        tokenUsage: 500 + idx * 12,
        durationMs: 200 + i * 30,
      });
    }
  });

  // Steady endpoints: rare actions, mostly observation
  steady.slice(0, Math.min(5, steady.length)).forEach((endpoint, idx) => {
    const analyzedAt = new Date(NOW.getTime() - (idx * 6 + 2) * 60 * 60 * 1000);
    const toolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [tc.getLatest(), tc.getHistory(2, 0), tc.submit("No action needed; metrics steady.", [], "high")];
    sessions.push({
      id: `session-${crypto.randomUUID()}`,
      endpointId: endpoint.id,
      analyzedAt,
      toolCalls,
      reasoning: "No action needed; metrics steady.",
      tokenUsage: 350 + idx * 8,
      durationMs: 180 + idx * 20,
    });
  });

  return sessions;
}

async function seed() {
  console.log("🌱 Seeding demo data...\n");
  console.log("📊 Configuration:");
  console.log(`  • Jobs: ${NUM_JOBS}`);
  console.log(`  • Endpoints per job: ${ENDPOINTS_PER_JOB}`);
  console.log(`  • Total endpoints: ${NUM_JOBS * ENDPOINTS_PER_JOB}`);
  console.log(`  • Historical data: 45+ days of runs`);
  console.log("");

  // 1. Find demo user by name
  console.log(`📝 Looking up user: ${DEMO_USER_NAME}...`);
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.name, DEMO_USER_NAME))
    .limit(1);

  if (existingUser.length === 0) {
    console.error(`❌ User "${DEMO_USER_NAME}" not found in database.`);
    console.error("Please ensure you're logged in or set DEMO_USER_NAME to an existing user.");
    await pool.end();
    process.exit(1);
  }

  const demoUser = existingUser[0];
  const DEMO_USER_ID = demoUser.id;
  console.log(`✓ Found user: ${demoUser.email} (ID: ${DEMO_USER_ID})\n`);

  // Calculate summary stats once
  const archivedJobsCount = JOBS.filter(j => j.status === "archived").length;
  const archivedEndpointsCount = ENDPOINTS.filter(e => e.archived).length;
  const archivedJobEndpointsCount = ENDPOINTS.filter(e => e.jobStatus === "archived").length;
  const archivedJobNonArchivedEndpointsCount = ENDPOINTS.filter(e => e.jobStatus === "archived" && !e.archived).length;

  // 2. Create jobs
  console.log("📦 Creating jobs...");
  for (const job of JOBS) {
    await db
      .insert(schema.jobs)
      .values({
        ...job,
        userId: DEMO_USER_ID,
        status: job.status,
        createdAt: new Date(SALE_START.getTime() - 7 * 24 * 60 * 60 * 1000), // Created 1 week before
        updatedAt: NOW,
        archivedAt: job.status === "archived" ? new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000) : null, // Archived 3 days ago
      })
      .onConflictDoNothing();
  }
  console.log(`✓ Created ${JOBS.length} jobs (${archivedJobsCount} archived)\n`);

  // 3. Create endpoints
  console.log("🎯 Creating endpoints...");
  for (const endpoint of ENDPOINTS) {
    await db
      .insert(schema.jobEndpoints)
      .values({
        id: endpoint.id,
        jobId: endpoint.jobId,
        tenantId: DEMO_USER_ID,
        name: endpoint.name,
        description: endpoint.description,
        url: endpoint.url,
        method: "GET",
        baselineIntervalMs: endpoint.baselineIntervalMs,
        minIntervalMs: endpoint.minIntervalMs,
        maxIntervalMs: endpoint.maxIntervalMs,
        timeoutMs: 5000,
        lastRunAt: endpoint.archived ? new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000) : new Date(NOW.getTime() - 60000), // Last run 5 days ago if archived, 1 min ago otherwise
        nextRunAt: new Date(NOW.getTime() + endpoint.baselineIntervalMs), // Next run scheduled
        failureCount: 0,
        archivedAt: endpoint.archived ? new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000) : null, // Archived 2 days ago
      })
      .onConflictDoNothing();
  }
  console.log(`✓ Created ${ENDPOINTS.length} endpoints (${archivedEndpointsCount} archived)`);
  console.log(`  • ${archivedJobEndpointsCount} endpoints in archived jobs`);
  console.log(`  • ${archivedJobNonArchivedEndpointsCount} non-archived endpoints in archived jobs (for testing)\n`);

  // 4. Generate and insert runs
  console.log("⚡ Generating runs (this may take a moment)...");
  let totalRuns = 0;

  for (const endpoint of ENDPOINTS) {
    const runs = generateRuns(endpoint);
    totalRuns += runs.length;

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < runs.length; i += batchSize) {
      const batch = runs.slice(i, i + batchSize);
      await db.insert(schema.runs).values(batch).onConflictDoNothing();
    }

    console.log(`  ✓ ${endpoint.name}: ${runs.length} runs`);
  }
  console.log(`\n✓ Generated ${totalRuns} total runs\n`);

  // 5. Create AI analysis sessions
  console.log("🤖 Creating AI analysis sessions...");
  const sessions = generateAISessions(ENDPOINTS);
  if (sessions.length > 0) {
    await db.insert(schema.aiAnalysisSessions).values(sessions).onConflictDoNothing();
  }
  console.log(`✓ Created ${sessions.length} AI sessions\n`);

  // 6. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Seed complete!\n");
  console.log("📊 Dashboard Data Summary:");
  console.log(`  • ${JOBS.length} jobs created (${archivedJobsCount} archived)`);
  console.log(`  • ${ENDPOINTS.length} endpoints created (${archivedEndpointsCount} archived)`);
  console.log(`  • ${archivedJobNonArchivedEndpointsCount} non-archived endpoints in archived jobs (testing logic)`);
  console.log(`  • ${totalRuns} runs generated (45+ days of data)`);
  console.log(`  • ${sessions.length} AI analysis sessions`);

  console.log("\n🎯 Dashboard Features:");
  console.log(`  • ${JOBS.length} jobs test searchable job dropdowns`);
  console.log(`  • ${ENDPOINTS.length} endpoints test backend pagination`);
  console.log("  • Timeline charts limited to top 10 endpoints");
  console.log("  • Endpoint table shows 20 per page with pagination");
  console.log("  • Runs distributed across all time ranges:");
  console.log("    - Last 24 hours (for real-time monitoring)");
  console.log("    - Last 7 days (for weekly trends)");
  console.log("    - Last 30 days (for monthly analysis)");
  console.log("    - 30-45 days ago (for historical comparison)");
  console.log("  • AI sessions range from 2-150 per endpoint:");
  console.log("    - Ultra-heavy: 80-150 sessions (1-2 critical endpoints)");
  console.log("    - Heavy: 30-60 sessions (selected adaptive endpoints)");
  console.log("    - Medium: 10-20 sessions (many adaptive endpoints)");
  console.log("    - Light: 2-12 sessions (steady/oneshot endpoints)");

  console.log("\n📈 Environment Variables:");
  console.log("  • SEED_NUM_JOBS - Number of jobs to create (default: 5)");
  console.log("  • SEED_ENDPOINTS_PER_JOB - Endpoints per job (default: 3)");
  console.log("\n💡 Example for performance testing:");
  console.log("  SEED_NUM_JOBS=50 SEED_ENDPOINTS_PER_JOB=5 pnpm seed");
  console.log("\n🔗 Navigate to /dashboard to see the results!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await pool.end();
}

// Run the seeder
seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
