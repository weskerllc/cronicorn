#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * E-Commerce Black Friday Demo Data Seeder
 *
 * Creates demo-optimized dataset for product video recording:
 * - 7 days of historical data (Days 1-3: baseline, Day 4: Black Friday, Days 5-7: recovery)
 * - 1 job containing 11 endpoints (all share same job for AI coordination via get_sibling_latest_responses)
 * - 11 endpoints across 4 tiers (Health, Investigation, Recovery, Alert)
 * - ~40,000 runs showing complete AI adaptation cycle during 12-hour sale
 * - 27 AI analysis sessions (6 baseline, 15 Black Friday, 6 post-event) with transparent reasoning
 *
 * Demonstrates:
 * - Baseline credibility: 3 days of normal operations before Black Friday
 * - Complete adaptation cycle: all-day surge → AI adapts → gradual recovery → hints expire
 * - AI coordination: All endpoints in same job so AI can see sibling responses
 * - Visual timeline: Color-coded source attribution (baseline, AI, one-shot, clamped)
 * - AI transparency: Every decision explained with reasoning
 * - User control: Min/max constraints enforced throughout
 * - Centered peak: Black Friday on Day 4 creates symmetric 7-day visualization
 *
 * Run with: pnpm tsx apps/migrator/src/seed.ts
 *
 * Black Friday Timeline (Day 4, 08:00-20:00):
 * - 08:00-10:00: Early Morning Surge (1000 → 3500 visitors/min, AI tightens to 45s)
 * - 10:00-12:00: Mid-Morning Peak (3500 → 6000 visitors/min, AI hits 20s min constraint)
 * - 12:00-14:00: Lunch Hour Sustained (5500-6000 visitors/min, AI maintains max monitoring)
 * - 14:00-17:00: Afternoon Steady (4000-5000 visitors/min, AI eases slightly)
 * - 17:00-20:00: Evening Wind-Down (5000 → 1200 visitors/min, AI returns to baseline)
 * - 20:00-21:00: Post-Event Recovery (hints expire, baseline fully resumed)
 */

import { schema } from "@cronicorn/adapter-drizzle";
import { DEV_AUTH, DEV_DATABASE } from "@cronicorn/config-defaults";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { ensureAdminUser } from "./ensure-admin-user.js";

const { Pool } = pg;

/**
 * Batch insert helper with concurrency control
 * Splits items into batches and inserts them with limited parallelism
 */
async function batchInsertWithConcurrency<T>(
  items: T[],
  batchSize: number,
  concurrency: number,
  insertFn: (batch: T[]) => Promise<void>,
): Promise<void> {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    await Promise.all(chunk.map(batch => insertFn(batch)));
  }
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEV_DATABASE.URL,
});

const db = drizzle(pool, { schema });

/* ============================================================================
   FLASH SALE TYPES & CONSTANTS
   ============================================================================ */

// type FlashSalePhase = "baseline" | "surge" | "strain" | "critical" | "recovery";

type EndpointTier = "health" | "investigation" | "recovery" | "alert";

type EndpointConfig = {
  id: string;
  jobId: string;
  name: string;
  description: string;
  url: string;
  method: "GET" | "POST";
  baselineIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  tier: EndpointTier;
  pausedUntil?: Date | null;
};

// Timeline constants
const NOW = new Date();
const SEVEN_DAYS_AGO = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
const BLACK_FRIDAY_START = new Date(SEVEN_DAYS_AGO.getTime() + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000); // Day 4, 08:00
const BLACK_FRIDAY_END = new Date(BLACK_FRIDAY_START.getTime() + 12 * 60 * 60 * 1000); // Day 4, 20:00 (12-hour sale)

// Legacy aliases for backward compatibility
const FLASH_SALE_START = BLACK_FRIDAY_START;
const FLASH_SALE_END = BLACK_FRIDAY_END;

/* ============================================================================
   BLACK FRIDAY PHASE LOGIC
   ============================================================================ */

type BlackFridayPhase = "early-surge" | "mid-morning-peak" | "lunch-sustained" | "afternoon-steady" | "evening-winddown" | "post-event";

/**
 * Get Black Friday phase based on hour offset from sale start (8am)
 */
function getBlackFridayPhase(hourOffset: number): BlackFridayPhase {
  if (hourOffset < 2)
    return "early-surge"; // 8-10am
  if (hourOffset < 4)
    return "mid-morning-peak"; // 10am-12pm
  if (hourOffset < 6)
    return "lunch-sustained"; // 12-2pm
  if (hourOffset < 9)
    return "afternoon-steady"; // 2-5pm
  if (hourOffset < 12)
    return "evening-winddown"; // 5-8pm
  return "post-event"; // 8pm+
}

/**
 * Get traffic metrics for a specific hour offset in Black Friday sale
 * Returns interpolated metrics based on phase progression
 */
function getBlackFridayMetrics(hourOffset: number) {
  const phase = getBlackFridayPhase(hourOffset);

  // Base metrics for each phase (we'll interpolate within phases)
  const phaseMetrics = {
    "early-surge": {
      start: { traffic: 1000, ordersPerMin: 40, pageLoadMs: 800, inventoryLagMs: 100, dbQueryMs: 120 },
      end: { traffic: 3500, ordersPerMin: 120, pageLoadMs: 1800, inventoryLagMs: 250, dbQueryMs: 380 },
    },
    "mid-morning-peak": {
      start: { traffic: 3500, ordersPerMin: 120, pageLoadMs: 1800, inventoryLagMs: 250, dbQueryMs: 380 },
      end: { traffic: 6000, ordersPerMin: 200, pageLoadMs: 4500, inventoryLagMs: 600, dbQueryMs: 1200 },
    },
    "lunch-sustained": {
      start: { traffic: 6000, ordersPerMin: 200, pageLoadMs: 4500, inventoryLagMs: 600, dbQueryMs: 1200 },
      end: { traffic: 5500, ordersPerMin: 180, pageLoadMs: 4000, inventoryLagMs: 550, dbQueryMs: 1000 },
    },
    "afternoon-steady": {
      start: { traffic: 5500, ordersPerMin: 180, pageLoadMs: 4000, inventoryLagMs: 550, dbQueryMs: 1000 },
      end: { traffic: 4000, ordersPerMin: 140, pageLoadMs: 2500, inventoryLagMs: 350, dbQueryMs: 600 },
    },
    "evening-winddown": {
      start: { traffic: 4000, ordersPerMin: 140, pageLoadMs: 2500, inventoryLagMs: 350, dbQueryMs: 600 },
      end: { traffic: 1200, ordersPerMin: 45, pageLoadMs: 850, inventoryLagMs: 120, dbQueryMs: 150 },
    },
    "post-event": {
      start: { traffic: 1200, ordersPerMin: 45, pageLoadMs: 850, inventoryLagMs: 120, dbQueryMs: 150 },
      end: { traffic: 1000, ordersPerMin: 40, pageLoadMs: 800, inventoryLagMs: 100, dbQueryMs: 120 },
    },
  };

  const metrics = phaseMetrics[phase];

  // Simple interpolation: return start metrics for simplicity
  // (In production, you'd interpolate based on progress within phase)
  return metrics.start;
}

/* ============================================================================
   JOBS DEFINITIONS (1 Job - all endpoints must share same job for AI coordination)
   ============================================================================ */

const JOBS = [
  {
    id: "job-black-friday-demo",
    name: "E-Commerce Black Friday Demo",
    description: "AI-coordinated Black Friday monitoring with health checks, diagnostics, recovery actions, and alerts across a 12-hour sale. All endpoints share the same job so AI can use get_sibling_latest_responses to coordinate decisions across the system.",
    status: "active" as const,
  },
];

/* ============================================================================
   ENDPOINT DEFINITIONS (11 Endpoints across 4 Tiers)
   ============================================================================ */

const ENDPOINTS: EndpointConfig[] = [
  // Health Tier (3 endpoints - continuous monitoring)
  {
    id: "ep-traffic-monitor",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Traffic Monitor",
    description: "Real-time visitor traffic monitoring",
    url: "https://api.ecommerce.example.com/metrics/traffic",
    method: "GET",
    baselineIntervalMs: 60_000, // 1 minute
    minIntervalMs: 20_000, // 20 seconds
    maxIntervalMs: 5 * 60_000, // 5 minutes
  },
  {
    id: "ep-order-processor-health",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Order Processor Health",
    description: "Order processing pipeline health check",
    url: "https://api.ecommerce.example.com/metrics/orders",
    method: "GET",
    baselineIntervalMs: 2 * 60_000, // 2 minutes
    minIntervalMs: 60_000, // 1 minute
    maxIntervalMs: 5 * 60_000, // 5 minutes
  },
  {
    id: "ep-inventory-sync-check",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Inventory Sync Check",
    description: "Stock synchronization lag monitoring",
    url: "https://api.ecommerce.example.com/metrics/inventory",
    method: "GET",
    baselineIntervalMs: 3 * 60_000, // 3 minutes
    minIntervalMs: 30_000, // 30 seconds
    maxIntervalMs: 10 * 60_000, // 10 minutes
  },

  // Investigation Tier (2 endpoints - conditionally activated)
  {
    id: "ep-slow-page-analyzer",
    jobId: "job-black-friday-demo",
    tier: "investigation",
    name: "Slow Page Analyzer",
    description: "Deep page performance analysis (activated during degradation)",
    url: "https://api.ecommerce.example.com/diagnostics/page-performance",
    method: "POST",
    baselineIntervalMs: 90_000, // 90 seconds when active
    minIntervalMs: 60_000,
    maxIntervalMs: 5 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
  {
    id: "ep-database-query-trace",
    jobId: "job-black-friday-demo",
    tier: "investigation",
    name: "Database Query Trace",
    description: "Query performance tracing (activated when DB slows)",
    url: "https://api.ecommerce.example.com/diagnostics/db-queries",
    method: "POST",
    baselineIntervalMs: 2 * 60_000, // 2 minutes when active
    minIntervalMs: 60_000,
    maxIntervalMs: 5 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },

  // Recovery Tier (2 endpoints - one-shot actions with cooldowns)
  {
    id: "ep-cache-warmup",
    jobId: "job-black-friday-demo",
    tier: "recovery",
    name: "Cache Warm Up",
    description: "Preload product cache to reduce database load",
    url: "https://api.ecommerce.example.com/recovery/cache-warmup",
    method: "POST",
    baselineIntervalMs: 60_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 10 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
  {
    id: "ep-scale-checkout-workers",
    jobId: "job-black-friday-demo",
    tier: "recovery",
    name: "Scale Checkout Workers",
    description: "Horizontally scale checkout worker pool",
    url: "https://api.ecommerce.example.com/recovery/scale-workers",
    method: "POST",
    baselineIntervalMs: 60_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 15 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },

  // Alert Tier (4 endpoints - escalation alerts with cooldowns)
  {
    id: "ep-slack-operations",
    jobId: "job-black-friday-demo",
    tier: "alert",
    name: "Slack Operations Alert",
    description: "Alert operations team of performance degradation",
    url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX",
    method: "POST",
    baselineIntervalMs: 60_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 10 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
  {
    id: "ep-slack-customer-support",
    jobId: "job-black-friday-demo",
    tier: "alert",
    name: "Slack Customer Support Alert",
    description: "Escalate to customer support team for high-impact issues",
    url: "https://hooks.slack.com/services/T00000000/B00000001/XXXXXXXXXXXXXXXXXXXX",
    method: "POST",
    baselineIntervalMs: 60_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 15 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
  {
    id: "ep-emergency-oncall-page",
    jobId: "job-black-friday-demo",
    tier: "alert",
    name: "Emergency Oncall Page",
    description: "Page oncall engineer for critical system failure",
    url: "https://api.pagerduty.com/incidents",
    method: "POST",
    baselineIntervalMs: 60_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 2 * 60 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
  {
    id: "ep-performance-webhook",
    jobId: "job-black-friday-demo",
    tier: "alert",
    name: "Performance Degradation Webhook",
    description: "Generic webhook for third-party monitoring integrations",
    url: "https://api.example.com/webhooks/performance",
    method: "POST",
    baselineIntervalMs: 5 * 60_000, // 5 minutes
    minIntervalMs: 60_000,
    maxIntervalMs: 15 * 60_000,
    pausedUntil: new Date("2099-01-01T00:00:00Z"), // Start paused
  },
];

/* ============================================================================
   RUN GENERATION LOGIC
   ============================================================================ */

/**
 * Generate runs for a single endpoint across 7-day timeline
 */
function generateRunsForEndpoint(endpoint: EndpointConfig): schema.RunInsert[] {
  const runs: schema.RunInsert[] = [];
  let currentTime = new Date(SEVEN_DAYS_AGO.getTime());

  // Track last execution for recovery/alert tiers (cooldown logic)
  let lastRecoveryExecution: Date | null = null;
  let lastAlertExecution: Date | null = null;

  // ========== ADD INITIAL SETUP/TESTING RUNS FOR NON-HEALTH ENDPOINTS ==========
  // Day 1 (9am-12pm): Show these endpoints were configured/tested, then went dormant
  if (endpoint.tier !== "health") {
    const setupStartTime = new Date(SEVEN_DAYS_AGO.getTime() + 9 * 60 * 60_000); // Day 1, 9am
    const numSetupRuns = 3; // 3 test runs to show initial configuration

    for (let i = 0; i < numSetupRuns; i++) {
      const setupTime = new Date(setupStartTime.getTime() + i * 30 * 60_000); // 30 minutes apart
      const setupSuccess = i < 2; // First 2 succeed, last one might fail (testing)
      const setupDuration = setupSuccess ? 150 + Math.floor(Math.random() * 100) : 450;

      runs.push({
        id: `run-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        status: setupSuccess ? "success" : "success", // All succeed for cleaner demo
        attempt: 1,
        source: "baseline-interval",
        startedAt: setupTime,
        finishedAt: new Date(setupTime.getTime() + setupDuration),
        durationMs: setupDuration,
        errorMessage: null,
        statusCode: 200,
        responseBody: undefined,
      });
    }

    // After setup runs, jump to flash sale window (these endpoints are dormant Days 2-5)
    currentTime = new Date(FLASH_SALE_START.getTime());
  }

  while (currentTime < NOW) {
    // Determine if we're in Black Friday window
    const isBlackFridayWindow = currentTime >= BLACK_FRIDAY_START && currentTime <= BLACK_FRIDAY_END;
    const hourOffset = isBlackFridayWindow
      ? (currentTime.getTime() - BLACK_FRIDAY_START.getTime()) / (60 * 60 * 1000) // Hours elapsed
      : -1;

    // Non-health endpoints should only run during Black Friday window
    if (!isBlackFridayWindow && endpoint.tier !== "health") {
      // Skip to Black Friday start or end
      if (currentTime < BLACK_FRIDAY_START) {
        currentTime = new Date(BLACK_FRIDAY_START.getTime());
      }
      else {
        break; // Past Black Friday, done
      }
      continue;
    }

    // Get interval based on endpoint tier and Black Friday phase
    let interval = endpoint.baselineIntervalMs;
    let source = "baseline-interval";

    if (isBlackFridayWindow && hourOffset >= 0) {
      const phase = getBlackFridayPhase(hourOffset);
      const metrics = getBlackFridayMetrics(hourOffset);

      // Tier-specific interval logic during Black Friday
      if (endpoint.tier === "health") {
        // Health tier: Tighten progressively through the day
        if (phase === "mid-morning-peak" || phase === "lunch-sustained") {
          // Peak hours: hit min constraint
          interval = endpoint.minIntervalMs; // 20-30s
          source = Math.random() < 0.85 ? "clamped-min" : (Math.random() < 0.9 ? "ai-interval" : "baseline-interval");
        }
        else if (phase === "early-surge" || phase === "afternoon-steady") {
          // Moderate load: tighten to ~half baseline
          interval = Math.floor(endpoint.baselineIntervalMs / 2); // 30s-90s
          source = Math.random() < 0.80 ? "ai-interval" : "baseline-interval";
        }
        else if (phase === "evening-winddown") {
          // Winding down: gradually ease back
          interval = Math.floor(endpoint.baselineIntervalMs * 0.7); // Still slightly tight
          source = Math.random() < 0.60 ? "ai-interval" : "baseline-interval";
        }
        else if (phase === "post-event") {
          // Back to baseline
          interval = endpoint.baselineIntervalMs;
          source = Math.random() < 0.30 ? "ai-interval" : "baseline-interval";
        }
      }
      else if (endpoint.tier === "investigation") {
        // Investigation tier: Activated during peak/sustained hours only
        if (phase === "mid-morning-peak" || phase === "lunch-sustained" || phase === "afternoon-steady") {
          interval = endpoint.baselineIntervalMs; // Active
          source = "ai-interval";
        }
        else {
          // Not active during this phase, skip this iteration
          currentTime = new Date(currentTime.getTime() + endpoint.baselineIntervalMs);
          continue;
        }
      }
      else if (endpoint.tier === "recovery") {
        // Recovery tier: One-shot actions during peak hours with cooldowns
        if (phase === "mid-morning-peak" || phase === "lunch-sustained") {
          const cooldownMs = 30 * 60 * 1000; // 30-minute cooldown (longer for all-day event)
          if (!lastRecoveryExecution || currentTime.getTime() - lastRecoveryExecution.getTime() >= cooldownMs) {
            interval = 60_000; // Fire once, then cooldown
            source = "ai-oneshot";
            lastRecoveryExecution = currentTime;
          }
          else {
            // On cooldown, skip
            currentTime = new Date(currentTime.getTime() + cooldownMs / 2);
            continue;
          }
        }
        else {
          // Not active during this phase, skip this iteration
          currentTime = new Date(currentTime.getTime() + endpoint.baselineIntervalMs);
          continue;
        }
      }
      else if (endpoint.tier === "alert") {
        // Alert tier: Escalation during peak hours with cooldowns
        if (phase === "mid-morning-peak" || phase === "lunch-sustained" || (phase === "afternoon-steady" && metrics.pageLoadMs >= 3000)) {
          const cooldownMs = endpoint.id === "ep-emergency-oncall-page" ? 3 * 60 * 60 * 1000 : 30 * 60 * 1000; // 3 hours for oncall, 30 min for others
          if (!lastAlertExecution || currentTime.getTime() - lastAlertExecution.getTime() >= cooldownMs) {
            interval = 60_000; // Fire once, then cooldown
            source = "ai-oneshot";
            lastAlertExecution = currentTime;
          }
          else {
            // On cooldown, skip this iteration
            currentTime = new Date(currentTime.getTime() + 60_000);
            continue;
          }
        }
        else {
          // Not active during this phase, skip this iteration
          currentTime = new Date(currentTime.getTime() + endpoint.baselineIntervalMs);
          continue;
        }
      }
    }
    else {
      // Outside Black Friday: Normal baseline with occasional AI hints (health tier only)
      if (endpoint.tier === "health" && Math.random() < 0.05) {
        source = "ai-interval";
      }
    }

    // Advance time by interval
    currentTime = new Date(currentTime.getTime() + interval);
    if (currentTime > NOW)
      break;

    // Determine success/failure based on phase
    let successRate = 0.97; // Default outside Black Friday
    let avgDuration = 200; // ms

    if (isBlackFridayWindow && hourOffset >= 0) {
      const phase = getBlackFridayPhase(hourOffset);
      const phaseMetrics = {
        "early-surge": { successRate: 0.94, avgDuration: 350 },
        "mid-morning-peak": { successRate: 0.75, avgDuration: 1200 },
        "lunch-sustained": { successRate: 0.70, avgDuration: 1400 },
        "afternoon-steady": { successRate: 0.85, avgDuration: 800 },
        "evening-winddown": { successRate: 0.92, avgDuration: 400 },
        "post-event": { successRate: 0.96, avgDuration: 250 },
      };
      successRate = phaseMetrics[phase].successRate;
      avgDuration = phaseMetrics[phase].avgDuration;
    }

    const isSuccess = Math.random() < successRate;
    const duration = isSuccess
      ? Math.floor(avgDuration * (0.8 + Math.random() * 0.4)) // ±20% variance
      : Math.floor(avgDuration * (2 + Math.random())); // Failures take 2-3x longer

    // Create response body for health tier with Black Friday metrics
    let responseBody: import("@cronicorn/domain").JsonValue | undefined;
    if (endpoint.tier === "health" && isBlackFridayWindow && hourOffset >= 0) {
      const metrics = getBlackFridayMetrics(hourOffset);
      responseBody = {
        traffic: metrics.traffic,
        ordersPerMin: metrics.ordersPerMin,
        pageLoadMs: metrics.pageLoadMs,
        inventoryLagMs: metrics.inventoryLagMs,
        dbQueryMs: metrics.dbQueryMs,
        timestamp: currentTime.toISOString(),
      };
    }

    runs.push({
      id: `run-${crypto.randomUUID()}`,
      endpointId: endpoint.id,
      status: isSuccess ? "success" : "failed",
      attempt: 1,
      source,
      startedAt: currentTime,
      finishedAt: new Date(currentTime.getTime() + duration),
      durationMs: duration,
      errorMessage: isSuccess ? null : "Connection timeout",
      statusCode: isSuccess ? 200 : 504,
      responseBody,
    });
  }

  return runs;
}

/* ============================================================================
   AI SESSION DEFINITIONS (22+ Sessions: 6 baseline + 15 Black Friday + 1 post-event)
   ============================================================================ */

function generateAISessions(): Array<typeof schema.aiAnalysisSessions.$inferInsert> {
  const sessions: Array<typeof schema.aiAnalysisSessions.$inferInsert> = [];

  // Helper for tool call objects
  const tc = {
    getLatest: (result: Record<string, unknown>) => ({
      tool: "get_latest_response",
      args: {},
      result: { found: true, ...result, timestamp: new Date().toISOString(), status: "success" },
    }),
    getHistory: (limit: number, responses: Array<Record<string, unknown>>) => ({
      tool: "get_response_history",
      args: { limit, offset: 0 },
      result: { count: responses.length, responses, hasMore: false },
    }),
    siblings: (siblings: Array<{ endpointId: string; endpointName: string; responseBody: Record<string, unknown> }>) => ({
      tool: "get_sibling_latest_responses",
      args: {},
      result: { count: siblings.length, siblings },
    }),
    proposeInterval: (intervalMs: number, ttlMinutes: number, reason: string) => ({
      tool: "propose_interval",
      args: { intervalMs, ttlMinutes, reason },
      result: `Adjusted interval to ${intervalMs}ms (expires in ${ttlMinutes} minutes): ${reason}`,
    }),
    proposeNext: (nextRunInMs: number, ttlMinutes: number, reason: string) => ({
      tool: "propose_next_time",
      args: { nextRunInMs, ttlMinutes, reason },
      result: `Scheduled one-shot execution in ${nextRunInMs}ms (expires in ${ttlMinutes} minutes): ${reason}`,
    }),
    pauseUntil: (untilIso: string | null, reason: string) => ({
      tool: "pause_until",
      args: { untilIso, reason },
      result: untilIso ? `Paused until ${untilIso}: ${reason}` : `Resumed execution: ${reason}`,
    }),
    submit: (reasoning: string, actions: string[], confidence: "high" | "medium") => ({
      tool: "submit_analysis",
      args: { reasoning, actions_taken: actions, confidence },
      result: { status: "analysis_complete" },
    }),
  };

  // ========== BASELINE AI SESSIONS (Days 1-3: 6 sessions) ==========
  // These show AI was monitoring before Black Friday, just confirming baseline operations

  // Day 1 Morning (8am)
  const day1Morning = new Date(SEVEN_DAYS_AGO.getTime() + 8 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day1Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1020, pageLoadMs: 790, trends: "stable" } }),
      tc.submit("Initial monitoring baseline established. All metrics within expected ranges.", [], "high"),
    ],
    reasoning: "Initial monitoring baseline established. All metrics within expected ranges.",
    tokenUsage: 420,
    durationMs: 180,
    nextAnalysisAt: new Date(day1Morning.getTime() + 12 * 60 * 60_000),
  });

  // Day 1 Evening (8pm)
  const day1Evening = new Date(SEVEN_DAYS_AGO.getTime() + 20 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day1Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 980, pageLoadMs: 800, trends: "stable" } }),
      tc.submit("Traffic patterns consistent throughout day. No adjustments needed.", [], "high"),
    ],
    reasoning: "Traffic patterns consistent throughout day. No adjustments needed.",
    tokenUsage: 380,
    durationMs: 160,
    nextAnalysisAt: new Date(day1Evening.getTime() + 12 * 60 * 60_000),
  });

  // Day 2 Morning (8am)
  const day2Morning = new Date(SEVEN_DAYS_AGO.getTime() + 32 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-order-processor-health",
    analyzedAt: day2Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { ordersPerMin: 42, processingTime: 180, queueDepth: 5 } }),
      tc.submit("Order processing healthy. Baseline schedules performing optimally.", [], "high"),
    ],
    reasoning: "Order processing healthy. Baseline schedules performing optimally.",
    tokenUsage: 410,
    durationMs: 170,
    nextAnalysisAt: new Date(day2Morning.getTime() + 12 * 60 * 60_000),
  });

  // Day 2 Evening (8pm)
  const day2Evening = new Date(SEVEN_DAYS_AGO.getTime() + 44 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day2Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1010, pageLoadMs: 785, trends: "stable" } }),
      tc.submit("All systems nominal. No intervention required.", [], "high"),
    ],
    reasoning: "All systems nominal. No intervention required.",
    tokenUsage: 390,
    durationMs: 155,
    nextAnalysisAt: new Date(day2Evening.getTime() + 12 * 60 * 60_000),
  });

  // Day 3 Morning (8am)
  const day3Morning = new Date(SEVEN_DAYS_AGO.getTime() + 56 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-inventory-sync-check",
    analyzedAt: day3Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { lagMs: 95, syncStatus: "healthy", queueDepth: 2 } }),
      tc.submit("Inventory synchronization performing within tolerances. No action needed.", [], "high"),
    ],
    reasoning: "Inventory synchronization performing within tolerances. No action needed.",
    tokenUsage: 400,
    durationMs: 165,
    nextAnalysisAt: new Date(day3Morning.getTime() + 12 * 60 * 60_000),
  });

  // Day 3 Evening (8pm)
  const day3Evening = new Date(SEVEN_DAYS_AGO.getTime() + 68 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day3Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 990, pageLoadMs: 795, trends: "stable" } }),
      tc.submit("Steady state operations continue. Baseline schedules appropriate.", [], "high"),
    ],
    reasoning: "Steady state operations continue. Baseline schedules appropriate.",
    tokenUsage: 385,
    durationMs: 150,
    nextAnalysisAt: new Date(day3Evening.getTime() + 12 * 60 * 60_000),
  });

  // ========== BLACK FRIDAY AI SESSIONS (Day 4: 15+ sessions) ==========
  // These sessions create a dramatic spike in AI activity during the 12-hour Black Friday sale

  // Session 1: Pre-Sale Analysis (Day 4, 07:45 - 15 min before sale)
  const session1Time = new Date(BLACK_FRIDAY_START.getTime() - 15 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session1Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 980, pageLoadMs: 780, trends: "stable" } }),
      tc.getHistory(5, [
        { responseBody: { visitors: 970, pageLoadMs: 790 }, status: "success" },
        { responseBody: { visitors: 990, pageLoadMs: 770 }, status: "success" },
        { responseBody: { visitors: 1010, pageLoadMs: 800 }, status: "success" },
        { responseBody: { visitors: 980, pageLoadMs: 785 }, status: "success" },
        { responseBody: { visitors: 1000, pageLoadMs: 795 }, status: "success" },
      ]),
      tc.submit("Normal traffic patterns detected. No action needed pre-flash-sale.", [], "high"),
    ],
    reasoning: "Normal traffic patterns detected. No action needed pre-flash-sale.",
    tokenUsage: 650,
    durationMs: 280,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 5 * 60_000),
  });

  // Session 2: Early Surge Detection (Day 6, 12:03 - Minute 3 of sale)
  const session2Time = new Date(FLASH_SALE_START.getTime() + 3 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session2Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 2800, pageLoadMs: 1150, ordersPerMin: 95, trends: "increasing" } }),
      tc.getHistory(3, [
        { responseBody: { visitors: 2200, pageLoadMs: 1050 }, status: "success" },
        { responseBody: { visitors: 1500, pageLoadMs: 920 }, status: "success" },
        { responseBody: { visitors: 1100, pageLoadMs: 850 }, status: "success" },
      ]),
      tc.submit("Traffic trending upward (1000 → 2800 visitors/min). Monitoring closely for continued surge.", [], "high"),
    ],
    reasoning: "Traffic trending upward (1000 → 2800 visitors/min). Monitoring closely for continued surge.",
    tokenUsage: 890,
    durationMs: 320,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 6 * 60_000),
  });

  // Session 3: Surge Confirmed (Day 6, 12:06 - Minute 6 of sale)
  const session3Time = new Date(FLASH_SALE_START.getTime() + 6 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session3Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 5100, pageLoadMs: 1850, ordersPerMin: 185, trends: "spiking" } }),
      tc.getHistory(3, [
        { responseBody: { visitors: 5000, pageLoadMs: 1800, ordersPerMin: 180 }, status: "success" },
        { responseBody: { visitors: 3200, pageLoadMs: 1200, ordersPerMin: 140 }, status: "success" },
        { responseBody: { visitors: 2800, pageLoadMs: 1150, ordersPerMin: 95 }, status: "success" },
      ]),
      tc.proposeInterval(30_000, 60, "Traffic surge detected (+400%)—tightening monitoring to 30s"),
      tc.submit("Traffic surge from 1000 to 5100 visitors/min detected. Tightening health check intervals to 30s for proactive monitoring during flash sale peak.", ["propose_interval"], "high"),
    ],
    reasoning: "Traffic surge from 1000 to 5100 visitors/min detected. Tightening health check intervals to 30s for proactive monitoring during flash sale peak.",
    tokenUsage: 1250,
    durationMs: 420,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 9 * 60_000),
  });

  // Session 4: Surge Intensifying (Day 6, 12:09 - Minute 9)
  const session4Time = new Date(FLASH_SALE_START.getTime() + 9 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session4Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 5600, pageLoadMs: 2400, ordersPerMin: 160, trends: "intensifying" } }),
      tc.proposeInterval(25_000, 60, "Surge intensifying—tightening further to 25s"),
      tc.submit("Traffic continuing to climb (5100 → 5600). Page load degrading (1850ms → 2400ms). Tightening monitoring to 25s.", ["propose_interval"], "high"),
    ],
    reasoning: "Traffic continuing to climb (5100 → 5600). Page load degrading (1850ms → 2400ms). Tightening monitoring to 25s.",
    tokenUsage: 980,
    durationMs: 350,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 12 * 60_000),
  });

  // Session 5: Strain Phase (Day 6, 12:12 - Minute 12)
  const session5Time = new Date(FLASH_SALE_START.getTime() + 12 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-order-processor-health",
    analyzedAt: session5Time,
    toolCalls: [
      tc.getLatest({ responseBody: { ordersPerMin: 135, failureRate: 0.08, queueDepth: 420 } }),
      tc.proposeInterval(20_000, 60, "System strain detected—hitting min constraint at 20s"),
      tc.submit("Order processor showing strain (8% failure rate, queue depth 420). Maxing out monitoring frequency at 20s (min constraint).", ["propose_interval"], "high"),
    ],
    reasoning: "Order processor showing strain (8% failure rate, queue depth 420). Maxing out monitoring frequency at 20s (min constraint).",
    tokenUsage: 1050,
    durationMs: 380,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 15 * 60_000),
  });

  // Session 6: Critical Escalation (Day 6, 12:15 - Minute 15)
  const session6Time = new Date(FLASH_SALE_START.getTime() + 15 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-slow-page-analyzer",
    analyzedAt: session6Time,
    toolCalls: [
      tc.getLatest({ responseBody: { avgPageLoadMs: 4600, p95Ms: 6200, bottleneck: "database" } }),
      tc.siblings([
        {
          endpointId: "ep-order-processor-health",
          endpointName: "Order Processor Health",
          responseBody: { ordersPerMin: 118, failureRate: 0.15 },
        },
        {
          endpointId: "ep-inventory-sync-check",
          endpointName: "Inventory Sync Check",
          responseBody: { lagMs: 620, queueDepth: 850 },
        },
      ]),
      tc.pauseUntil(null, "Activating cache warmup recovery action"),
      tc.proposeNext(5_000, 5, "Execute cache warmup immediately to reduce database load"),
      tc.submit("CRITICAL: Page load times at 4600ms (p95: 6200ms). Orders degraded to 118/min. Activating emergency recovery: cache warmup, oncall escalation.", ["pause_until", "propose_next_time"], "high"),
    ],
    reasoning: "CRITICAL: Page load times at 4600ms (p95: 6200ms). Orders degraded to 118/min. Activating emergency recovery: cache warmup, oncall escalation.",
    tokenUsage: 1850,
    durationMs: 520,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 18 * 60_000),
  });

  // Session 7: Critical Sustained (Day 6, 12:18 - Minute 18)
  const session7Time = new Date(FLASH_SALE_START.getTime() + 18 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-inventory-sync-check",
    analyzedAt: session7Time,
    toolCalls: [
      tc.getLatest({ responseBody: { lagMs: 750, queueDepth: 920, failedSyncs: 12 } }),
      tc.submit("Critical conditions sustained. Inventory lag at 750ms, queue depth 920. Recovery actions in progress. Continuing max monitoring frequency.", [], "high"),
    ],
    reasoning: "Critical conditions sustained. Inventory lag at 750ms, queue depth 920. Recovery actions in progress. Continuing max monitoring frequency.",
    tokenUsage: 920,
    durationMs: 340,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 21 * 60_000),
  });

  // Session 8: Early Recovery Signs (Day 6, 12:21 - Minute 21)
  const session8Time = new Date(FLASH_SALE_START.getTime() + 21 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session8Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 4200, pageLoadMs: 2800, ordersPerMin: 135, trends: "stabilizing" } }),
      tc.submit("Early recovery signs detected. Traffic declining from peak (6000 → 4200). Page load improving (4500ms → 2800ms). Monitoring for sustained recovery.", [], "high"),
    ],
    reasoning: "Early recovery signs detected. Traffic declining from peak (6000 → 4200). Page load improving (4500ms → 2800ms). Monitoring for sustained recovery.",
    tokenUsage: 1050,
    durationMs: 370,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 24 * 60_000),
  });

  // Session 9: Recovery Progressing (Day 6, 12:24 - Minute 24)
  const session9Time = new Date(FLASH_SALE_START.getTime() + 24 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session9Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 2400, pageLoadMs: 1650, ordersPerMin: 80, trends: "declining" } }),
      tc.submit("Recovery progressing. Traffic continues to decline (4200 → 2400). Page load improving (2800ms → 1650ms). Preparing to ease monitoring intervals.", [], "high"),
    ],
    reasoning: "Recovery progressing. Traffic continues to decline (4200 → 2400). Page load improving (2800ms → 1650ms). Preparing to ease monitoring intervals.",
    tokenUsage: 980,
    durationMs: 350,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 28 * 60_000),
  });

  // Session 10: Recovery Confirmed (Day 6, 12:28 - Minute 28)
  const session10Time = new Date(FLASH_SALE_START.getTime() + 28 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session10Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1400, pageLoadMs: 1050, ordersPerMin: 55, trends: "declining" } }),
      tc.getHistory(5, [
        { responseBody: { visitors: 1400, pageLoadMs: 1050 }, status: "success" },
        { responseBody: { visitors: 1450, pageLoadMs: 1100 }, status: "success" },
        { responseBody: { visitors: 1500, pageLoadMs: 1150 }, status: "success" },
        { responseBody: { visitors: 1800, pageLoadMs: 1400 }, status: "success" },
        { responseBody: { visitors: 2200, pageLoadMs: 1800 }, status: "success" },
      ]),
      tc.proposeInterval(60_000, 30, "Traffic normalized to 1400 visitors/min—returning to baseline 1-minute checks"),
      tc.submit("Recovery confirmed. Traffic declining to 1400/min, page load improved to 1050ms. Returning health checks to baseline 1-minute intervals.", ["propose_interval"], "high"),
    ],
    reasoning: "Recovery confirmed. Traffic declining to 1400/min, page load improved to 1050ms. Returning health checks to baseline 1-minute intervals.",
    tokenUsage: 1100,
    durationMs: 380,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 32 * 60_000),
  });

  // Session 11: Stability Monitoring (Day 6, 12:32 - Minute 32)
  const session11Time = new Date(FLASH_SALE_START.getTime() + 32 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session11Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1250, pageLoadMs: 950, ordersPerMin: 48, trends: "stable" } }),
      tc.submit("Traffic stabilizing at near-baseline levels (1250/min). Page load normalized (950ms). Monitoring for sustained stability.", [], "high"),
    ],
    reasoning: "Traffic stabilizing at near-baseline levels (1250/min). Page load normalized (950ms). Monitoring for sustained stability.",
    tokenUsage: 850,
    durationMs: 310,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 38 * 60_000),
  });

  // Session 12: Continued Stability (Day 6, 12:38 - Minute 38)
  const session12Time = new Date(FLASH_SALE_START.getTime() + 38 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-order-processor-health",
    analyzedAt: session12Time,
    toolCalls: [
      tc.getLatest({ responseBody: { ordersPerMin: 44, failureRate: 0.01, queueDepth: 12 } }),
      tc.submit("Order processing fully stabilized. Failure rate back to baseline (0.01). Queue depth normal (12). Continued stability confirmed.", [], "high"),
    ],
    reasoning: "Order processing fully stabilized. Failure rate back to baseline (0.01). Queue depth normal (12). Continued stability confirmed.",
    tokenUsage: 820,
    durationMs: 290,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 45 * 60_000),
  });

  // Session 13: Post-Event Monitoring (Day 6, 12:45 - Minute 45)
  const session13Time = new Date(FLASH_SALE_START.getTime() + 45 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session13Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1100, pageLoadMs: 850, ordersPerMin: 42, trends: "stable" } }),
      tc.submit("Post-event monitoring confirms full recovery. Traffic (1100/min), page load (850ms), orders (42/min) all within baseline ranges.", [], "high"),
    ],
    reasoning: "Post-event monitoring confirms full recovery. Traffic (1100/min), page load (850ms), orders (42/min) all within baseline ranges.",
    tokenUsage: 780,
    durationMs: 270,
    nextAnalysisAt: new Date(FLASH_SALE_END.getTime()),
  });

  // Session 14: Normal Patterns Resuming (Day 6, 13:00 - Flash sale end time)
  const session14Time = new Date(FLASH_SALE_END.getTime());
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session14Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1080, pageLoadMs: 830, ordersPerMin: 41, trends: "stable" } }),
      tc.submit("Flash sale window closed. Normal traffic patterns fully resumed. All metrics baseline. AI hints will expire in 5 minutes (60-min TTL from initial surge).", [], "high"),
    ],
    reasoning: "Flash sale window closed. Normal traffic patterns fully resumed. All metrics baseline. AI hints will expire in 5 minutes (60-min TTL from initial surge).",
    tokenUsage: 800,
    durationMs: 280,
    nextAnalysisAt: new Date(FLASH_SALE_END.getTime() + 5 * 60_000),
  });

  // Session 15: Hint Expiration (Day 6, 13:05 - 5 min after sale)
  const _session15Time = new Date(FLASH_SALE_END.getTime() + 5 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session5Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1050, pageLoadMs: 820, ordersPerMin: 42, trends: "stable" } }),
      tc.submit("Flash sale event concluded. All AI hints expired (60-min TTL). Traffic returned to baseline levels (1050/min). Baseline schedules fully resumed.", [], "high"),
    ],
    reasoning: "Flash sale event concluded. All AI hints expired (60-min TTL). Traffic returned to baseline levels (1050/min). Baseline schedules fully resumed.",
    tokenUsage: 750,
    durationMs: 290,
    nextAnalysisAt: new Date(FLASH_SALE_END.getTime() + 19 * 60 * 60_000), // Next day, 8am
  });

  // ========== POST-BLACK FRIDAY AI SESSIONS (Days 5-7: 6 sessions) ==========
  // These show AI continues monitoring after the event, confirming recovery

  // Session 16: Day 5 Morning - Immediate Post-Event Check (08:00)
  const day5Morning = new Date(BLACK_FRIDAY_END.getTime() + 12 * 60 * 60_000); // Day 5, 08:00
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day5Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 920, pageLoadMs: 780, ordersPerMin: 38, trends: "stable" } }),
      tc.getHistory(5, [
        { responseBody: { visitors: 920, pageLoadMs: 780 }, status: "success" },
        { responseBody: { visitors: 930, pageLoadMs: 790 }, status: "success" },
        { responseBody: { visitors: 910, pageLoadMs: 770 }, status: "success" },
        { responseBody: { visitors: 950, pageLoadMs: 800 }, status: "success" },
        { responseBody: { visitors: 940, pageLoadMs: 785 }, status: "success" },
      ]),
      tc.submit("Post-Black Friday analysis: All metrics returned to baseline. Event handled successfully with zero manual intervention.", [], "high"),
    ],
    reasoning: "Post-Black Friday analysis: All metrics returned to baseline. Event handled successfully with zero manual intervention.",
    tokenUsage: 680,
    durationMs: 250,
    nextAnalysisAt: new Date(day5Morning.getTime() + 12 * 60 * 60_000),
  });

  // Session 17: Day 5 Evening - Sustained Recovery (20:00)
  const day5Evening = new Date(day5Morning.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day5Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1005, pageLoadMs: 795, ordersPerMin: 40, trends: "stable" } }),
      tc.submit("Sustained recovery confirmed. Traffic, page load, and order rates all within normal ranges throughout the day.", [], "high"),
    ],
    reasoning: "Sustained recovery confirmed. Traffic, page load, and order rates all within normal ranges throughout the day.",
    tokenUsage: 520,
    durationMs: 210,
    nextAnalysisAt: new Date(day5Evening.getTime() + 12 * 60 * 60_000),
  });

  // Session 18: Day 6 Morning - Baseline Resumption (08:00)
  const day6Morning = new Date(day5Evening.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-order-processor-health",
    analyzedAt: day6Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { ordersPerMin: 41, processingTime: 178, queueDepth: 4 } }),
      tc.submit("Order processing fully stabilized. Baseline monitoring cadence appropriate. No adjustments needed.", [], "high"),
    ],
    reasoning: "Order processing fully stabilized. Baseline monitoring cadence appropriate. No adjustments needed.",
    tokenUsage: 490,
    durationMs: 195,
    nextAnalysisAt: new Date(day6Morning.getTime() + 12 * 60 * 60_000),
  });

  // Session 19: Day 6 Evening - Normal Operations (20:00)
  const day6Evening = new Date(day6Morning.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day6Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 990, pageLoadMs: 788, ordersPerMin: 39, trends: "stable" } }),
      tc.submit("Normal operations fully resumed. All systems operating within expected parameters.", [], "high"),
    ],
    reasoning: "Normal operations fully resumed. All systems operating within expected parameters.",
    tokenUsage: 475,
    durationMs: 185,
    nextAnalysisAt: new Date(day6Evening.getTime() + 12 * 60 * 60_000),
  });

  // Session 20: Day 7 Morning - Final Verification (08:00)
  const day7Morning = new Date(day6Evening.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day7Morning,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 1010, pageLoadMs: 792, ordersPerMin: 40, trends: "stable" } }),
      tc.submit("Final post-event verification complete. System performance consistent with pre-event baseline. Monitoring continues normally.", [], "high"),
    ],
    reasoning: "Final post-event verification complete. System performance consistent with pre-event baseline. Monitoring continues normally.",
    tokenUsage: 510,
    durationMs: 200,
    nextAnalysisAt: new Date(day7Morning.getTime() + 24 * 60 * 60_000),
  });

  // Session 21: Day 7 Evening - Routine Check (20:00)
  const day7Evening = new Date(day7Morning.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-inventory-sync-check",
    analyzedAt: day7Evening,
    toolCalls: [
      tc.getLatest({ responseBody: { lagMs: 98, queueDepth: 3, syncRate: 0.99 } }),
      tc.submit("Inventory sync operating optimally. No intervention required. Standard baseline monitoring continues.", [], "high"),
    ],
    reasoning: "Inventory sync operating optimally. No intervention required. Standard baseline monitoring continues.",
    tokenUsage: 465,
    durationMs: 175,
    nextAnalysisAt: new Date(day7Evening.getTime() + 24 * 60 * 60_000),
  });

  return sessions;
}

/* ============================================================================
   MAIN SEED FUNCTION
   ============================================================================ */

async function seed() {
  console.log("🌱 Seeding e-commerce flash sale demo data...\n");

  // 1. Ensure admin user exists
  const adminEmail = process.env.ADMIN_USER_EMAIL || DEV_AUTH.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_USER_PASSWORD || DEV_AUTH.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_USER_NAME || DEV_AUTH.ADMIN_NAME;

  console.log(`📝 Ensuring admin user exists: ${adminEmail}...`);
  const DEMO_USER_ID = await ensureAdminUser(db, {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
  });
  console.log(`✓ Admin user ensured: ${adminEmail}\n`);

  // 2. Create jobs
  console.log("📦 Creating jobs...");
  const jobsToInsert = JOBS.map(job => ({
    ...job,
    userId: DEMO_USER_ID,
    createdAt: SEVEN_DAYS_AGO,
    updatedAt: NOW,
    archivedAt: null,
  }));
  await db.insert(schema.jobs).values(jobsToInsert).onConflictDoNothing();
  console.log(`✓ 1 job created (all endpoints share same job for AI coordination)\n`);

  // 3. Create endpoints
  console.log("🎯 Creating endpoints...");
  const endpointsToInsert = ENDPOINTS.map(endpoint => ({
    id: endpoint.id,
    jobId: endpoint.jobId,
    tenantId: DEMO_USER_ID,
    name: endpoint.name,
    description: endpoint.description,
    url: endpoint.url,
    method: endpoint.method,
    baselineIntervalMs: endpoint.baselineIntervalMs,
    minIntervalMs: endpoint.minIntervalMs,
    maxIntervalMs: endpoint.maxIntervalMs,
    timeoutMs: 5000,
    lastRunAt: new Date(NOW.getTime() - 60000),
    nextRunAt: new Date(NOW.getTime() + endpoint.baselineIntervalMs),
    failureCount: 0,
    pausedUntil: endpoint.pausedUntil || null,
    archivedAt: null,
  }));
  await db.insert(schema.jobEndpoints).values(endpointsToInsert).onConflictDoNothing();
  console.log(`✓ 11 endpoints created\n`);

  // 4. Generate runs
  console.log("⚡ Generating runs for 7-day timeline...");
  const allRuns: schema.RunInsert[] = [];

  for (const endpoint of ENDPOINTS) {
    const runs = generateRunsForEndpoint(endpoint);
    allRuns.push(...runs);
    console.log(`  → ${endpoint.name}: ${runs.length} runs`);
  }
  console.log(`✓ Generated ${allRuns.length} runs\n`);

  // 5. Batch insert runs
  console.log("⏳ Batch inserting runs (concurrency: 5, batch size: 500)...");
  await batchInsertWithConcurrency(
    allRuns,
    500, // batch size
    5, // concurrency
    async (batch) => {
      await db.insert(schema.runs).values(batch).onConflictDoNothing();
    },
  );
  console.log(`✓ Inserted ${allRuns.length} runs in 45 batches\n`);

  // 6. Create AI sessions
  console.log("🤖 Creating AI analysis sessions...");
  const sessions = generateAISessions();
  await db.insert(schema.aiAnalysisSessions).values(sessions).onConflictDoNothing();
  console.log(`✓ ${sessions.length} AI analysis sessions created (6 baseline + 15 Black Friday + 6 post-event)\n`);

  // 7. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ E-Commerce Black Friday Demo Seed Complete!\n");
  console.log("📊 Timeline Summary:");
  console.log("  • Days 1-3: Normal operations (baseline establishment)");
  console.log("  • Day 4, 08:00-20:00: Black Friday sale (12-hour adaptation cycle)");
  console.log("  • Days 5-7: Post-event stabilization\n");
  console.log("📦 Data Created:");
  console.log(`  • ${JOBS.length} job (E-Commerce Black Friday Demo - all endpoints share same job)`);
  console.log(`  • ${ENDPOINTS.length} endpoints (4 tiers: health, investigation, recovery, alert)`);
  console.log(`  • ${allRuns.length} runs (~7 days of execution history)`);
  console.log(`  • ${sessions.length} AI analysis sessions (baseline monitoring + Black Friday adaptations)\n`);
  console.log("🎯 Demo Features:");
  console.log("  • Baseline credibility: 3 days of normal ops before Black Friday (centered peak)");
  console.log("  • Complete adaptation cycle: all-day surge → AI adapts → recovery → hints expire");
  console.log("  • Visual timeline: Color-coded source attribution (baseline, AI interval, AI one-shot, clamped)");
  console.log(`  • AI transparency: ${sessions.length} sessions showing progressive adaptation throughout the day`);
  console.log("  • User control: Min/max constraints enforced throughout\n");
  console.log("🔗 Navigate to /dashboard to see the Black Friday timeline!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await pool.end();
}

// Run the seeder
seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
