#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * E-Commerce Flash Sale Demo Data Seeder
 *
 * Creates demo-optimized dataset for product video recording:
 * - 7 days of historical data (Days 1-5: baseline, Day 6: flash sale, Day 7: recovery)
 * - 1 job containing 11 endpoints (all share same job for AI coordination via get_sibling_latest_responses)
 * - 11 endpoints across 4 tiers (Health, Investigation, Recovery, Alert)
 * - ~18,500 runs showing complete AI adaptation cycle
 * - 6 AI analysis sessions at key moments with transparent reasoning
 *
 * Demonstrates:
 * - Baseline credibility: 5 days of normal operations before flash sale
 * - Complete adaptation cycle: degradation → AI adapts → recovery → hints expire
 * - AI coordination: All endpoints in same job so AI can see sibling responses
 * - Visual timeline: Color-coded source attribution (baseline, AI, one-shot, clamped)
 * - AI transparency: Every decision explained with reasoning
 * - User control: Min/max constraints enforced throughout
 *
 * Run with: pnpm tsx apps/migrator/src/seed.ts
 *
 * Flash Sale Timeline (Day 6, 12:00-13:00):
 * - Minutes 0-4: Baseline (1000 visitors/min, 98% success)
 * - Minutes 5-8: Surge (5000 visitors/min, AI tightens to 30s)
 * - Minutes 9-12: Strain (5500 visitors/min, AI activates diagnostics)
 * - Minutes 13-20: Critical (6000 visitors/min, AI pages oncall)
 * - Minutes 21-39: Recovery (1500 visitors/min, AI confirms recovery)
 * - Hour 13:00+: Hints expire, return to baseline
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

type FlashSalePhase = "baseline" | "surge" | "strain" | "critical" | "recovery";

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
const FLASH_SALE_START = new Date(NOW.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago (Day 6, 12:00)
const FLASH_SALE_END = new Date(FLASH_SALE_START.getTime() + 60 * 60 * 1000); // Exactly +1 hour
const SEVEN_DAYS_AGO = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

/* ============================================================================
   FLASH SALE PHASE LOGIC
   ============================================================================ */

/**
 * Get flash sale phase based on minute offset from sale start
 */
function getFlashSalePhase(minuteOffset: number): FlashSalePhase {
  if (minuteOffset <= 4)
    return "baseline";
  if (minuteOffset <= 8)
    return "surge";
  if (minuteOffset <= 12)
    return "strain";
  if (minuteOffset <= 20)
    return "critical";
  return "recovery";
}

/**
 * Get traffic metrics for a specific minute offset in flash sale
 * Based on FLASH_SALE_TIMELINE from scenarios.ts
 */
function getFlashSaleMetrics(minuteOffset: number) {
  const phase = getFlashSalePhase(minuteOffset);

  const metrics = {
    baseline: { traffic: 1000, ordersPerMin: 40, pageLoadMs: 800, inventoryLagMs: 100, dbQueryMs: 120 },
    surge: { traffic: 5000, ordersPerMin: 180, pageLoadMs: 1800, inventoryLagMs: 250, dbQueryMs: 280 },
    strain: { traffic: 5500, ordersPerMin: 160, pageLoadMs: 3200, inventoryLagMs: 450, dbQueryMs: 850 },
    critical: { traffic: 6000, ordersPerMin: 120, pageLoadMs: 4500, inventoryLagMs: 600, dbQueryMs: 1200 },
    recovery: { traffic: 1500, ordersPerMin: 50, pageLoadMs: 1100, inventoryLagMs: 150, dbQueryMs: 180 },
  };

  return metrics[phase];
}

/* ============================================================================
   JOBS DEFINITIONS (1 Job - all endpoints must share same job for AI coordination)
   ============================================================================ */

const JOBS = [
  {
    id: "job-flash-sale-demo",
    name: "E-Commerce Flash Sale Demo",
    description: "AI-coordinated flash sale monitoring with health checks, diagnostics, recovery actions, and alerts. All endpoints share the same job so AI can use get_sibling_latest_responses to coordinate decisions across the system.",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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
    jobId: "job-flash-sale-demo",
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

  while (currentTime < NOW) {
    // Determine if we're in flash sale window
    const isFlashSaleWindow = currentTime >= FLASH_SALE_START && currentTime <= FLASH_SALE_END;
    const minuteOffset = isFlashSaleWindow
      ? Math.floor((currentTime.getTime() - FLASH_SALE_START.getTime()) / 60_000)
      : -1;

    // Non-health endpoints should only run during flash sale window
    if (!isFlashSaleWindow && endpoint.tier !== "health") {
      // Skip to flash sale start or end
      if (currentTime < FLASH_SALE_START) {
        currentTime = new Date(FLASH_SALE_START.getTime());
      }
      else {
        break; // Past flash sale, done
      }
      continue;
    }

    // Get interval based on endpoint tier and flash sale phase
    let interval = endpoint.baselineIntervalMs;
    let source = "baseline-interval";

    if (isFlashSaleWindow && minuteOffset >= 0) {
      const phase = getFlashSalePhase(minuteOffset);
      const metrics = getFlashSaleMetrics(minuteOffset);

      // Tier-specific interval logic during flash sale
      if (endpoint.tier === "health") {
        // Health tier: Tighten during surge/strain/critical
        if (phase === "critical") {
          interval = endpoint.minIntervalMs; // 20-30s
          source = Math.random() < 0.85 ? "ai-interval" : (Math.random() < 0.8 ? "baseline-interval" : "clamped-min");
        }
        else if (phase === "strain") {
          interval = Math.floor(endpoint.baselineIntervalMs / 2); // 30s-90s
          source = Math.random() < 0.80 ? "ai-interval" : (Math.random() < 0.9 ? "baseline-interval" : "clamped-min");
        }
        else if (phase === "surge") {
          interval = Math.floor(endpoint.baselineIntervalMs * 0.6); // Moderately tight
          source = Math.random() < 0.70 ? "ai-interval" : "baseline-interval";
        }
        else if (phase === "recovery") {
          interval = Math.floor(endpoint.baselineIntervalMs * 0.8);
          source = Math.random() < 0.60 ? "ai-interval" : "baseline-interval";
        }
      }
      else if (endpoint.tier === "investigation") {
        // Investigation tier: Activated during strain/critical only
        if (phase === "strain" || phase === "critical") {
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
        // Recovery tier: One-shot actions during critical with cooldowns
        if (phase === "critical" || phase === "strain") {
          const cooldownMs = 10 * 60 * 1000; // 10-minute cooldown
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
        // Alert tier: Escalation during critical with cooldowns
        if (phase === "critical" || (phase === "strain" && metrics.pageLoadMs >= 3000)) {
          const cooldownMs = endpoint.id === "ep-emergency-oncall-page" ? 2 * 60 * 60 * 1000 : 10 * 60 * 1000;
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
      // Outside flash sale: Normal baseline with occasional AI hints (health tier only)
      if (endpoint.tier === "health" && Math.random() < 0.05) {
        source = "ai-interval";
      }
    }

    // Advance time by interval
    currentTime = new Date(currentTime.getTime() + interval);
    if (currentTime > NOW)
      break;

    // Determine success/failure based on phase
    let successRate = 0.97; // Default outside flash sale
    let avgDuration = 200; // ms

    if (isFlashSaleWindow && minuteOffset >= 0) {
      const phase = getFlashSalePhase(minuteOffset);
      const phaseMetrics = {
        baseline: { successRate: 0.98, avgDuration: 200 },
        surge: { successRate: 0.92, avgDuration: 400 },
        strain: { successRate: 0.85, avgDuration: 800 },
        critical: { successRate: 0.60, avgDuration: 1500 },
        recovery: { successRate: 0.95, avgDuration: 300 },
      };
      successRate = phaseMetrics[phase].successRate;
      avgDuration = phaseMetrics[phase].avgDuration;
    }

    const isSuccess = Math.random() < successRate;
    const duration = isSuccess
      ? Math.floor(avgDuration * (0.8 + Math.random() * 0.4)) // ±20% variance
      : Math.floor(avgDuration * (2 + Math.random())); // Failures take 2-3x longer

    // Create response body for health tier with flash sale metrics
    let responseBody: import("@cronicorn/domain").JsonValue | undefined;
    if (endpoint.tier === "health" && isFlashSaleWindow && minuteOffset >= 0) {
      const metrics = getFlashSaleMetrics(minuteOffset);
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
   AI SESSION DEFINITIONS (6 Sessions)
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

  // Session 1: Pre-Sale Analysis (Day 6, 11:45 - 15 min before sale)
  const session1Time = new Date(FLASH_SALE_START.getTime() - 15 * 60_000);
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

  // Session 2: Surge Detection (Day 6, 12:06 - Minute 6 of sale)
  const session2Time = new Date(FLASH_SALE_START.getTime() + 6 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session2Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 5100, pageLoadMs: 1850, ordersPerMin: 185, trends: "spiking" } }),
      tc.getHistory(3, [
        { responseBody: { visitors: 5000, pageLoadMs: 1800, ordersPerMin: 180 }, status: "success" },
        { responseBody: { visitors: 3200, pageLoadMs: 1200, ordersPerMin: 140 }, status: "success" },
        { responseBody: { visitors: 1100, pageLoadMs: 850, ordersPerMin: 45 }, status: "success" },
      ]),
      tc.proposeInterval(30_000, 60, "Traffic surge detected (+400%)—tightening monitoring to 30s"),
      tc.submit("Traffic surge from 1000 to 5100 visitors/min detected. Tightening health check intervals to 30s for proactive monitoring during flash sale peak.", ["propose_interval"], "high"),
    ],
    reasoning: "Traffic surge from 1000 to 5100 visitors/min detected. Tightening health check intervals to 30s for proactive monitoring during flash sale peak.",
    tokenUsage: 1250,
    durationMs: 420,
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 10 * 60_000),
  });

  // Session 3: Critical Escalation (Day 6, 12:15 - Minute 15)
  const session3Time = new Date(FLASH_SALE_START.getTime() + 15 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-slow-page-analyzer",
    analyzedAt: session3Time,
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
    nextAnalysisAt: new Date(FLASH_SALE_START.getTime() + 20 * 60_000),
  });

  // Session 4: Recovery Confirmation (Day 6, 12:28 - Minute 28)
  const session4Time = new Date(FLASH_SALE_START.getTime() + 28 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session4Time,
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
    nextAnalysisAt: new Date(FLASH_SALE_END.getTime() + 5 * 60_000),
  });

  // Session 5: Hint Expiration (Day 6, 13:05 - 5 min after sale)
  const session5Time = new Date(FLASH_SALE_END.getTime() + 5 * 60_000);
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

  // Session 6: Post-Event Analysis (Day 7, 08:00 - Next morning)
  const session6Time = new Date(FLASH_SALE_END.getTime() + 19 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: session6Time,
    toolCalls: [
      tc.getLatest({ responseBody: { visitors: 920, pageLoadMs: 780, ordersPerMin: 38, trends: "stable" } }),
      tc.getHistory(10, [
        { responseBody: { visitors: 920, pageLoadMs: 780 }, status: "success" },
        { responseBody: { visitors: 930, pageLoadMs: 790 }, status: "success" },
        { responseBody: { visitors: 910, pageLoadMs: 770 }, status: "success" },
        { responseBody: { visitors: 950, pageLoadMs: 800 }, status: "success" },
        { responseBody: { visitors: 940, pageLoadMs: 785 }, status: "success" },
        { responseBody: { visitors: 960, pageLoadMs: 795 }, status: "success" },
        { responseBody: { visitors: 930, pageLoadMs: 790 }, status: "success" },
        { responseBody: { visitors: 920, pageLoadMs: 775 }, status: "success" },
        { responseBody: { visitors: 940, pageLoadMs: 805 }, status: "success" },
        { responseBody: { visitors: 950, pageLoadMs: 790 }, status: "success" },
      ]),
      tc.submit("Post-event stability confirmed. All metrics returned to normal baseline ranges. No action needed.", [], "high"),
    ],
    reasoning: "Post-event stability confirmed. All metrics returned to normal baseline ranges. No action needed.",
    tokenUsage: 680,
    durationMs: 250,
    nextAnalysisAt: new Date(session6Time.getTime() + 24 * 60 * 60_000), // +1 day
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
  console.log(`✓ 6 AI analysis sessions created\n`);

  // 7. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ E-Commerce Flash Sale Demo Seed Complete!\n");
  console.log("📊 Timeline Summary:");
  console.log("  • Days 1-5: Normal operations (baseline establishment)");
  console.log("  • Day 6, 12:00-13:00: Flash sale event (complete adaptation cycle)");
  console.log("  • Day 7: Post-event stabilization\n");
  console.log("📦 Data Created:");
  console.log(`  • ${JOBS.length} job (E-Commerce Flash Sale Demo - all endpoints share same job)`);
  console.log(`  • ${ENDPOINTS.length} endpoints (4 tiers: health, investigation, recovery, alert)`);
  console.log(`  • ${allRuns.length} runs (~7 days of execution history)`);
  console.log(`  • ${sessions.length} AI analysis sessions (surge → critical → recovery → expiration)\n`);
  console.log("🎯 Demo Features:");
  console.log("  • Baseline credibility: 5 days of normal ops before flash sale");
  console.log("  • Complete adaptation cycle: degradation → AI adapts → recovery → hints expire");
  console.log("  • Visual timeline: Color-coded source attribution (baseline, AI interval, AI one-shot, clamped)");
  console.log("  • AI transparency: 6 sessions showing reasoning at key moments");
  console.log("  • User control: Min/max constraints enforced throughout\n");
  console.log("🔗 Navigate to /dashboard to see the flash sale timeline!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await pool.end();
}

// Run the seeder
seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
