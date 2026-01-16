#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * E-Commerce Black Friday Demo Data Seeder
 *
 * Creates demo-optimized dataset for product video recording:
 * - 30 days of historical data (Days 1-27: sparse baseline, Day 28: Black Friday, Days 29-30: recovery)
 * - 1 job containing 11 endpoints (all share same job for AI coordination via get_sibling_latest_responses)
 * - 11 endpoints across 4 tiers (Health, Investigation, Recovery, Alert)
 * - Sparse baseline runs (5-10 min intervals) with dramatic spike during Black Friday (20s-1min intervals)
 * - ~50 AI analysis sessions (9 sparse baseline, ~36 intensive Black Friday, 4 post-event)
 *
 * Demonstrates:
 * - DRAMATIC SPIKE: Sparse baseline (every 3 days AI check, 5-10 min endpoint runs) vs intensive Black Friday
 * - Complete adaptation cycle: all-day surge → AI adapts → gradual recovery → hints expire
 * - AI coordination: All endpoints in same job so AI can see sibling responses
 * - Visual timeline: Color-coded source attribution (baseline, AI, one-shot, clamped)
 * - AI transparency: Every decision explained with reasoning
 * - User control: Min/max constraints enforced throughout
 *
 * Run with: pnpm tsx apps/migrator/src/seed.ts
 *
 * Black Friday Timeline (Day 28, 08:00-20:00):
 * - 08:00-10:00: Early Morning Surge (1000 → 5000 visitors/min, AI tightens to 30s)
 * - 10:00-12:00: Mid-Morning Peak (5000 → 6000 visitors/min, AI hits 20s min constraint)
 * - 12:00-14:00: Sustained Peak (5000-5500 visitors/min, AI maintains max monitoring)
 * - 14:00-17:00: Gradual Recovery (5000 → 2000 visitors/min, AI eases intervals)
 * - 17:00-20:00: Evening Wind-Down (2000 → 1000 visitors/min, AI returns to baseline)
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
// Normalize dates so seed produces consistent times regardless of when it's run:
// - THIRTY_DAYS_AGO is set to midnight 30 days ago (start of Day 1)
// - NOW is set to end of today (23:59:59) so all generated data is in the past
// This ensures "Day 1, 8am" = midnight + 8 hours = exactly 8:00am
const TODAY = new Date();
const THIRTY_DAYS_AGO = new Date(TODAY);
THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);
THIRTY_DAYS_AGO.setHours(0, 0, 0, 0); // Midnight, start of Day 1

const NOW = new Date(TODAY);
NOW.setHours(23, 59, 59, 999); // End of today

// Black Friday is on Day 28 (27 days after start, leaving 2 days for recovery)
const BLACK_FRIDAY_START = new Date(THIRTY_DAYS_AGO.getTime() + 27 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000); // Day 28, 08:00
const BLACK_FRIDAY_END = new Date(BLACK_FRIDAY_START.getTime() + 12 * 60 * 60 * 1000); // Day 28, 20:00 (12-hour sale)

// Legacy aliases for backward compatibility
const FLASH_SALE_START = BLACK_FRIDAY_START;
// const FLASH_SALE_END = BLACK_FRIDAY_END;

// Baseline period start (for reference)
// const BASELINE_START = THIRTY_DAYS_AGO;

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
 * Baseline metrics - stable normal operations
 */
const BASELINE_METRICS = {
  visitors: 1000,
  pageLoadMs: 800,
  ordersPerMin: 40,
  processingTimeMs: 180,
  queueDepth: 5,
  failureRate: 0.01,
  inventoryLagMs: 100,
  syncStatus: "healthy",
};

/**
 * Get metrics for a specific hour offset in Black Friday sale
 * Returns interpolated metrics based on phase progression
 */
function getBlackFridayMetrics(hourOffset: number) {
  const phase = getBlackFridayPhase(hourOffset);

  // Metrics progression through the day - tells the story of the surge
  const phaseMetrics = {
    "early-surge": {
      visitors: 1500 + Math.floor(hourOffset * 1000), // 1500 → 3500
      pageLoadMs: 900 + Math.floor(hourOffset * 400), // 900 → 1700
      ordersPerMin: 50 + Math.floor(hourOffset * 35), // 50 → 120
      processingTimeMs: 200 + Math.floor(hourOffset * 80),
      queueDepth: 20 + Math.floor(hourOffset * 80),
      failureRate: 0.02 + hourOffset * 0.015,
      inventoryLagMs: 120 + Math.floor(hourOffset * 60),
    },
    "mid-morning-peak": {
      visitors: 3500 + Math.floor((hourOffset - 2) * 1250), // 3500 → 6000
      pageLoadMs: 1800 + Math.floor((hourOffset - 2) * 1350), // 1800 → 4500
      ordersPerMin: 120 + Math.floor((hourOffset - 2) * 40), // 120 → 200
      processingTimeMs: 400 + Math.floor((hourOffset - 2) * 200),
      queueDepth: 200 + Math.floor((hourOffset - 2) * 200),
      failureRate: 0.05 + (hourOffset - 2) * 0.05,
      inventoryLagMs: 250 + Math.floor((hourOffset - 2) * 175),
    },
    "lunch-sustained": {
      visitors: 5500 + Math.floor(Math.random() * 500), // 5500-6000 sustained
      pageLoadMs: 4000 + Math.floor(Math.random() * 500),
      ordersPerMin: 180 + Math.floor(Math.random() * 20),
      processingTimeMs: 600 + Math.floor(Math.random() * 100),
      queueDepth: 500 + Math.floor(Math.random() * 200),
      failureRate: 0.12 + Math.random() * 0.05,
      inventoryLagMs: 550 + Math.floor(Math.random() * 100),
    },
    "afternoon-steady": {
      visitors: 5500 - Math.floor((hourOffset - 6) * 500), // 5500 → 4000
      pageLoadMs: 4000 - Math.floor((hourOffset - 6) * 500), // 4000 → 2500
      ordersPerMin: 180 - Math.floor((hourOffset - 6) * 13), // 180 → 140
      processingTimeMs: 500 - Math.floor((hourOffset - 6) * 60),
      queueDepth: 400 - Math.floor((hourOffset - 6) * 80),
      failureRate: 0.10 - (hourOffset - 6) * 0.02,
      inventoryLagMs: 500 - Math.floor((hourOffset - 6) * 50),
    },
    "evening-winddown": {
      visitors: 4000 - Math.floor((hourOffset - 9) * 933), // 4000 → 1200
      pageLoadMs: 2500 - Math.floor((hourOffset - 9) * 550), // 2500 → 850
      ordersPerMin: 140 - Math.floor((hourOffset - 9) * 32), // 140 → 45
      processingTimeMs: 350 - Math.floor((hourOffset - 9) * 50),
      queueDepth: 150 - Math.floor((hourOffset - 9) * 40),
      failureRate: 0.04 - (hourOffset - 9) * 0.01,
      inventoryLagMs: 300 - Math.floor((hourOffset - 9) * 60),
    },
    "post-event": {
      visitors: 1100 + Math.floor(Math.random() * 100),
      pageLoadMs: 820 + Math.floor(Math.random() * 50),
      ordersPerMin: 42 + Math.floor(Math.random() * 5),
      processingTimeMs: 185 + Math.floor(Math.random() * 20),
      queueDepth: 6 + Math.floor(Math.random() * 4),
      failureRate: 0.01 + Math.random() * 0.005,
      inventoryLagMs: 105 + Math.floor(Math.random() * 20),
    },
  };

  return phaseMetrics[phase];
}

/**
 * Generate endpoint-specific response body based on endpoint type and current metrics
 */
function generateResponseBody(
  endpointId: string,
  isBlackFriday: boolean,
  hourOffset: number,
  timestamp: Date,
): Record<string, unknown> {
  const metrics = isBlackFriday ? getBlackFridayMetrics(hourOffset) : BASELINE_METRICS;

  // Add slight variance to baseline metrics
  const variance = (base: number, pct: number = 0.05) =>
    Math.floor(base * (1 - pct + Math.random() * pct * 2));

  switch (endpointId) {
    case "ep-traffic-monitor":
      return {
        visitors: isBlackFriday ? metrics.visitors : variance(BASELINE_METRICS.visitors),
        pageLoadMs: isBlackFriday ? metrics.pageLoadMs : variance(BASELINE_METRICS.pageLoadMs),
        activeUsers: Math.floor((isBlackFriday ? metrics.visitors : BASELINE_METRICS.visitors) * 0.3),
        requestsPerSec: Math.floor((isBlackFriday ? metrics.visitors : BASELINE_METRICS.visitors) / 10),
        errorRate: isBlackFriday ? metrics.failureRate : 0.001,
        trends: isBlackFriday && hourOffset < 6 ? "increasing" : isBlackFriday && hourOffset < 9 ? "peak" : "stable",
        timestamp: timestamp.toISOString(),
      };

    case "ep-order-processor-health":
      return {
        ordersPerMin: isBlackFriday ? metrics.ordersPerMin : variance(BASELINE_METRICS.ordersPerMin),
        processingTimeMs: isBlackFriday ? metrics.processingTimeMs : variance(BASELINE_METRICS.processingTimeMs),
        queueDepth: isBlackFriday ? metrics.queueDepth : variance(BASELINE_METRICS.queueDepth),
        failureRate: isBlackFriday ? metrics.failureRate : BASELINE_METRICS.failureRate,
        pendingOrders: isBlackFriday ? Math.floor(metrics.queueDepth * 1.5) : 8,
        completedLastHour: isBlackFriday ? metrics.ordersPerMin * 60 : 2400,
        status: isBlackFriday && metrics.failureRate > 0.1 ? "degraded" : "healthy",
        timestamp: timestamp.toISOString(),
      };

    case "ep-inventory-sync-check":
      return {
        lagMs: isBlackFriday ? metrics.inventoryLagMs : variance(BASELINE_METRICS.inventoryLagMs),
        queueDepth: isBlackFriday ? Math.floor(metrics.queueDepth * 0.8) : 3,
        syncStatus: isBlackFriday && metrics.inventoryLagMs > 400 ? "strained" : "healthy",
        lastSyncAt: new Date(timestamp.getTime() - (isBlackFriday ? metrics.inventoryLagMs : 100)).toISOString(),
        pendingUpdates: isBlackFriday ? Math.floor(metrics.queueDepth * 0.5) : 2,
        failedSyncs: isBlackFriday && metrics.failureRate > 0.1 ? Math.floor(metrics.failureRate * 50) : 0,
        timestamp: timestamp.toISOString(),
      };

    default:
      return { timestamp: timestamp.toISOString(), status: "ok" };
  }
}

/* ============================================================================
   JOBS DEFINITIONS (1 Job - all endpoints must share same job for AI coordination)
   ============================================================================ */

const JOBS = [
  {
    id: "job-black-friday-demo",
    name: "E-Commerce SAAS",
    description: "AI-coordinated Black Friday monitoring with health checks, diagnostics, recovery actions, and alerts across a 12-hour sale. All endpoints share the same job so AI can use get_sibling_latest_responses to coordinate decisions across the system.",
    status: "active" as const,
  },
];

/* ============================================================================
   ENDPOINT DEFINITIONS (11 Endpoints across 4 Tiers)
   ============================================================================ */

const ENDPOINTS: EndpointConfig[] = [
  // Health Tier (3 endpoints - continuous monitoring)
  // Baseline intervals are intentionally long (5-10 min) so Black Friday spike is dramatic
  {
    id: "ep-traffic-monitor",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Traffic Monitor",
    description: "Real-time visitor traffic monitoring",
    url: "https://api.ecommerce.example.com/metrics/traffic",
    method: "GET",
    baselineIntervalMs: 5 * 60_000, // 5 minutes baseline (sparse)
    minIntervalMs: 20_000, // 20 seconds during crisis
    maxIntervalMs: 10 * 60_000, // 10 minutes max
  },
  {
    id: "ep-order-processor-health",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Order Processor Health",
    description: "Order processing pipeline health check",
    url: "https://api.ecommerce.example.com/metrics/orders",
    method: "GET",
    baselineIntervalMs: 8 * 60_000, // 8 minutes baseline (sparse)
    minIntervalMs: 60_000, // 1 minute during crisis
    maxIntervalMs: 15 * 60_000, // 15 minutes max
  },
  {
    id: "ep-inventory-sync-check",
    jobId: "job-black-friday-demo",
    tier: "health",
    name: "Inventory Sync Check",
    description: "Stock synchronization lag monitoring",
    url: "https://api.ecommerce.example.com/metrics/inventory",
    method: "GET",
    baselineIntervalMs: 10 * 60_000, // 10 minutes baseline (sparse)
    minIntervalMs: 30_000, // 30 seconds during crisis
    maxIntervalMs: 20 * 60_000, // 20 minutes max
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
  let currentTime = new Date(THIRTY_DAYS_AGO.getTime());

  // Track last execution for recovery/alert tiers (cooldown logic)
  let lastRecoveryExecution: Date | null = null;
  let lastAlertExecution: Date | null = null;

  // ========== ADD INITIAL SETUP/TESTING RUNS FOR NON-HEALTH ENDPOINTS ==========
  // Day 1 (9am-12pm): Show these endpoints were configured/tested, then went dormant
  if (endpoint.tier !== "health") {
    const setupStartTime = new Date(THIRTY_DAYS_AGO.getTime() + 9 * 60 * 60_000); // Day 1, 9am
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

    // Create response body for health tier endpoints (always, to tell the story)
    let responseBody: import("@cronicorn/domain").JsonValue | undefined;
    if (endpoint.tier === "health" && isSuccess) {
      // @ts-expect-error Ignore JsonValue type complexity for demo
      responseBody = generateResponseBody(
        endpoint.id,
        isBlackFridayWindow,
        hourOffset >= 0 ? hourOffset : 0,
        currentTime,
      );
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
   AI SESSION DEFINITIONS (~50 Sessions: ~10 baseline + ~35 Black Friday + 4 post-event)
   Baseline is sparse (every 3 days), Black Friday is intense (every 20 min for 12 hours)
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

  // ========== BASELINE AI SESSIONS (Days 1-27: ~9 sessions, every 3 days) ==========
  // Sparse monitoring during normal operations - AI only checks in periodically
  const baselineDays = [1, 4, 7, 10, 13, 16, 19, 22, 25]; // 9 sessions spread across 27 days

  // Endpoint-specific baseline response bodies and messages
  const baselineConfigs: Array<{
    endpointId: string;
    getResponseBody: () => Record<string, unknown>;
    message: string;
  }> = [
      {
        endpointId: "ep-traffic-monitor",
        getResponseBody: () => ({
          visitors: 980 + Math.floor(Math.random() * 80),
          pageLoadMs: 780 + Math.floor(Math.random() * 40),
          activeUsers: 290 + Math.floor(Math.random() * 30),
          requestsPerSec: 95 + Math.floor(Math.random() * 15),
          errorRate: 0.001,
          trends: "stable",
        }),
        message: "Traffic patterns stable. All metrics within normal ranges.",
      },
      {
        endpointId: "ep-order-processor-health",
        getResponseBody: () => ({
          ordersPerMin: 38 + Math.floor(Math.random() * 8),
          processingTimeMs: 175 + Math.floor(Math.random() * 20),
          queueDepth: 4 + Math.floor(Math.random() * 4),
          failureRate: 0.01,
          pendingOrders: 6 + Math.floor(Math.random() * 4),
          completedLastHour: 2300 + Math.floor(Math.random() * 200),
          status: "healthy",
        }),
        message: "Order processing healthy. Queue depth normal.",
      },
      {
        endpointId: "ep-inventory-sync-check",
        getResponseBody: () => ({
          lagMs: 95 + Math.floor(Math.random() * 20),
          queueDepth: 2 + Math.floor(Math.random() * 3),
          syncStatus: "healthy",
          pendingUpdates: 1 + Math.floor(Math.random() * 3),
          failedSyncs: 0,
        }),
        message: "Inventory sync performing within tolerances. No action needed.",
      },
    ];

  for (let i = 0; i < baselineDays.length; i++) {
    const day = baselineDays[i] - 1; // Convert to 0-indexed
    const dayOffset = day * 24 * 60 * 60_000;
    const sessionTime = new Date(THIRTY_DAYS_AGO.getTime() + dayOffset + 8 * 60 * 60_000);
    const config = baselineConfigs[i % baselineConfigs.length];

    sessions.push({
      id: `session-${crypto.randomUUID()}`,
      endpointId: config.endpointId,
      analyzedAt: sessionTime,
      toolCalls: [
        tc.getLatest({ responseBody: config.getResponseBody() }),
        tc.submit(config.message, [], "high"),
      ],
      reasoning: config.message,
      tokenUsage: 380 + Math.floor(Math.random() * 80),
      durationMs: 150 + Math.floor(Math.random() * 50),
      nextAnalysisAt: new Date(sessionTime.getTime() + 3 * 24 * 60 * 60_000),
    });
  }

  // ========== BLACK FRIDAY AI SESSIONS (Day 28: ~36 sessions across 12 hours) ==========
  // Intense monitoring every 20 minutes during the crisis, creating a dramatic spike

  // Helper to generate endpoint-specific response body for AI sessions
  const getAISessionResponseBody = (endpointId: string, minuteOffset: number): Record<string, unknown> => {
    const hourOffset = minuteOffset / 60;
    const metrics = minuteOffset < 0 ? BASELINE_METRICS : getBlackFridayMetrics(hourOffset);

    switch (endpointId) {
      case "ep-traffic-monitor":
        return {
          visitors: metrics.visitors,
          pageLoadMs: metrics.pageLoadMs,
          activeUsers: Math.floor(metrics.visitors * 0.3),
          requestsPerSec: Math.floor(metrics.visitors / 10),
          errorRate: metrics.failureRate,
          trends: hourOffset < 2 ? "increasing" : hourOffset < 4 ? "peak" : hourOffset < 8 ? "declining" : "stable",
        };
      case "ep-order-processor-health":
        return {
          ordersPerMin: metrics.ordersPerMin,
          processingTimeMs: metrics.processingTimeMs,
          queueDepth: metrics.queueDepth,
          failureRate: metrics.failureRate,
          pendingOrders: Math.floor(metrics.queueDepth * 1.5),
          status: metrics.failureRate > 0.1 ? "degraded" : metrics.failureRate > 0.05 ? "strained" : "healthy",
        };
      case "ep-inventory-sync-check":
        return {
          lagMs: metrics.inventoryLagMs,
          queueDepth: Math.floor(metrics.queueDepth * 0.8),
          syncStatus: metrics.inventoryLagMs > 400 ? "strained" : "healthy",
          pendingUpdates: Math.floor(metrics.queueDepth * 0.5),
          failedSyncs: metrics.failureRate > 0.1 ? Math.floor(metrics.failureRate * 50) : 0,
        };
      case "ep-slow-page-analyzer":
        return {
          avgPageLoadMs: metrics.pageLoadMs,
          p95Ms: Math.floor(metrics.pageLoadMs * 1.4),
          bottleneck: metrics.pageLoadMs > 3000 ? "database" : metrics.pageLoadMs > 2000 ? "network" : "none",
        };
      default:
        return { status: "ok" };
    }
  };

  // Helper to generate Black Friday session with consistent data
  const generateBFSession = (
    minuteOffset: number,
    endpointId: string,
    reasoning: string,
    actions: string[] = [],
    extraToolCalls: Array<Record<string, unknown>> = [],
  ) => {
    const sessionTime = new Date(BLACK_FRIDAY_START.getTime() + minuteOffset * 60_000);
    const responseBody = getAISessionResponseBody(endpointId, minuteOffset);

    sessions.push({
      id: `session-${crypto.randomUUID()}`,
      endpointId,
      analyzedAt: sessionTime,
      toolCalls: [
        tc.getLatest({ responseBody }),
        // @ts-expect-error Ignore JsonValue type complexity for demo
        ...extraToolCalls,
        // @ts-expect-error Ignore JsonValue type complexity for demo
        tc.submit(reasoning, actions, "high"),
      ],
      reasoning,
      tokenUsage: 800 + Math.floor(Math.random() * 500),
      durationMs: 250 + Math.floor(Math.random() * 200),
      nextAnalysisAt: new Date(sessionTime.getTime() + 20 * 60_000),
    });
  };

  // Pre-sale check (-15 min) - baseline metrics
  generateBFSession(-15, "ep-traffic-monitor", "Pre-sale check: All systems nominal. Ready for Black Friday.");

  // Hour 1: 08:00-09:00 - Early surge (sessions every 15 min = 4 sessions)
  generateBFSession(0, "ep-traffic-monitor", "Sale started. Traffic beginning to climb.");
  generateBFSession(15, "ep-traffic-monitor", "Traffic surging. Page load increasing. Monitoring closely.", [], [tc.proposeInterval(45_000, 60, "Traffic surge detected—tightening to 45s")]);
  generateBFSession(30, "ep-order-processor-health", "Orders up 2.5x. Queue building. Still within tolerances.");
  generateBFSession(45, "ep-traffic-monitor", "Traffic climbing rapidly (+320% from baseline). Tightening monitoring.", [], [tc.proposeInterval(30_000, 60, "High traffic—tightening to 30s")]);

  // Hour 2: 09:00-10:00 - Peak building (4 sessions)
  generateBFSession(60, "ep-traffic-monitor", "ALERT: Traffic spiking. Page load degrading.", [], [tc.proposeInterval(25_000, 60, "Critical traffic—max monitoring")]);
  generateBFSession(75, "ep-order-processor-health", "Order queue building. Failure rate rising.");
  generateBFSession(90, "ep-inventory-sync-check", "Inventory sync lagging. Queue depth critical.");
  generateBFSession(105, "ep-traffic-monitor", "PEAK TRAFFIC. Page load strained. All systems under load.", [], [tc.proposeInterval(20_000, 60, "Peak load—minimum interval")]);

  // Hour 3: 10:00-11:00 - Critical phase (4 sessions)
  generateBFSession(120, "ep-slow-page-analyzer", "CRITICAL: p95 latency extremely high. Database is bottleneck.", ["propose_interval"], [tc.pauseUntil(null, "Activating recovery endpoints"), tc.proposeNext(5_000, 5, "Trigger cache warmup")]);
  generateBFSession(135, "ep-order-processor-health", "Order failure rate critical. Queue depth high. Recovery actions triggered.");
  generateBFSession(150, "ep-inventory-sync-check", "Inventory lag critical. Failed syncs detected. Critical but stable.");
  generateBFSession(165, "ep-traffic-monitor", "Sustained peak traffic. Systems holding under load.");

  // Hour 4: 11:00-12:00 - Sustained load (3 sessions)
  generateBFSession(180, "ep-traffic-monitor", "Traffic holding at sustained peak. Recovery actions taking effect.");
  generateBFSession(200, "ep-order-processor-health", "Order metrics improving. Failure rate declining.");
  generateBFSession(220, "ep-inventory-sync-check", "Inventory sync improving. Lag decreasing.");

  // Hour 5: 12:00-13:00 - Gradual improvement (3 sessions)
  generateBFSession(240, "ep-traffic-monitor", "Traffic easing. Page load improving.");
  generateBFSession(260, "ep-order-processor-health", "Order queue draining. Failure rate normalizing.");
  generateBFSession(280, "ep-traffic-monitor", "Traffic continuing to decline. Systems recovering.", [], [tc.proposeInterval(30_000, 45, "Traffic easing—relaxing to 30s")]);

  // Hour 6: 13:00-14:00 - Recovery phase (3 sessions)
  generateBFSession(300, "ep-traffic-monitor", "Recovery progressing. Traffic declining toward baseline.");
  generateBFSession(320, "ep-inventory-sync-check", "Inventory sync recovered. Lag at normal levels, queue draining.");
  generateBFSession(340, "ep-traffic-monitor", "Traffic declining. Approaching normal levels.", [], [tc.proposeInterval(45_000, 30, "Returning toward baseline intervals")]);

  // Hour 7-8: 14:00-16:00 - Stabilization (4 sessions)
  generateBFSession(360, "ep-traffic-monitor", "Traffic stabilizing. Page load near baseline.");
  generateBFSession(400, "ep-order-processor-health", "Order processing normalized. Queue depth healthy.");
  generateBFSession(440, "ep-traffic-monitor", "Traffic approaching baseline. Page load normal.", [], [tc.proposeInterval(60_000, 30, "Near baseline—returning to 1-min checks")]);
  generateBFSession(480, "ep-inventory-sync-check", "Inventory sync fully recovered. All metrics nominal.");

  // Hour 9-10: 16:00-18:00 - Return to baseline (4 sessions)
  generateBFSession(510, "ep-traffic-monitor", "Traffic at baseline levels. Systems fully recovered.");
  generateBFSession(540, "ep-order-processor-health", "Order processing at baseline. Peak successfully handled.");
  generateBFSession(580, "ep-traffic-monitor", "Evening traffic stable. All systems nominal.");
  generateBFSession(620, "ep-traffic-monitor", "Late evening check: Traffic stable.");

  // Hour 11-12: 18:00-20:00 - Final hours (4 sessions)
  generateBFSession(650, "ep-inventory-sync-check", "Inventory sync optimal. Black Friday winding down.");
  generateBFSession(680, "ep-traffic-monitor", "Traffic at baseline. Preparing for sale end.");
  generateBFSession(700, "ep-order-processor-health", "Order processing stable. Final pre-close check complete.");
  generateBFSession(720, "ep-traffic-monitor", "Black Friday sale ended. All metrics at baseline. Event handled successfully with AI-driven adaptation.");

  // ========== POST-BLACK FRIDAY AI SESSIONS (Days 29-30: 4 sessions) ==========
  // These show AI continues monitoring after the event, confirming recovery
  // Use consistent endpoint-specific response bodies

  // Day 29 Morning - Immediate Post-Event Check (08:00)
  const day29Morning = new Date(BLACK_FRIDAY_END.getTime() + 12 * 60 * 60_000); // Day 29, 08:00
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day29Morning,
    toolCalls: [
      tc.getLatest({
        responseBody: {
          visitors: 980,
          pageLoadMs: 790,
          activeUsers: 294,
          requestsPerSec: 98,
          errorRate: 0.001,
          trends: "stable",
        },
      }),
      tc.getHistory(5, [
        { responseBody: { visitors: 980, pageLoadMs: 790, trends: "stable" }, status: "success" },
        { responseBody: { visitors: 990, pageLoadMs: 785, trends: "stable" }, status: "success" },
        { responseBody: { visitors: 975, pageLoadMs: 795, trends: "stable" }, status: "success" },
        { responseBody: { visitors: 1005, pageLoadMs: 780, trends: "stable" }, status: "success" },
        { responseBody: { visitors: 995, pageLoadMs: 788, trends: "stable" }, status: "success" },
      ]),
      tc.submit("Post-Black Friday analysis: All metrics returned to baseline. Event handled successfully with zero manual intervention.", [], "high"),
    ],
    reasoning: "Post-Black Friday analysis: All metrics returned to baseline. Event handled successfully with zero manual intervention.",
    tokenUsage: 680,
    durationMs: 250,
    nextAnalysisAt: new Date(day29Morning.getTime() + 12 * 60 * 60_000),
  });

  // Day 29 Evening - Sustained Recovery (20:00)
  const day29Evening = new Date(day29Morning.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-order-processor-health",
    analyzedAt: day29Evening,
    toolCalls: [
      tc.getLatest({
        responseBody: {
          ordersPerMin: 41,
          processingTimeMs: 178,
          queueDepth: 4,
          failureRate: 0.01,
          pendingOrders: 6,
          completedLastHour: 2460,
          status: "healthy",
        },
      }),
      tc.submit("Sustained recovery confirmed. Order processing fully stabilized. Baseline monitoring cadence appropriate.", [], "high"),
    ],
    reasoning: "Sustained recovery confirmed. Order processing fully stabilized. Baseline monitoring cadence appropriate.",
    tokenUsage: 520,
    durationMs: 210,
    nextAnalysisAt: new Date(day29Evening.getTime() + 12 * 60 * 60_000),
  });

  // Day 30 Morning - Final Verification (08:00)
  const day30Morning = new Date(day29Evening.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-traffic-monitor",
    analyzedAt: day30Morning,
    toolCalls: [
      tc.getLatest({
        responseBody: {
          visitors: 1010,
          pageLoadMs: 792,
          activeUsers: 303,
          requestsPerSec: 101,
          errorRate: 0.001,
          trends: "stable",
        },
      }),
      tc.submit("Final post-event verification complete. System performance consistent with pre-event baseline. Monitoring continues normally.", [], "high"),
    ],
    reasoning: "Final post-event verification complete. System performance consistent with pre-event baseline. Monitoring continues normally.",
    tokenUsage: 510,
    durationMs: 200,
    nextAnalysisAt: new Date(day30Morning.getTime() + 12 * 60 * 60_000),
  });

  // Day 30 Evening - Routine Check (20:00)
  const day30Evening = new Date(day30Morning.getTime() + 12 * 60 * 60_000);
  sessions.push({
    id: `session-${crypto.randomUUID()}`,
    endpointId: "ep-inventory-sync-check",
    analyzedAt: day30Evening,
    toolCalls: [
      tc.getLatest({
        responseBody: {
          lagMs: 98,
          queueDepth: 3,
          syncStatus: "healthy",
          pendingUpdates: 2,
          failedSyncs: 0,
        },
      }),
      tc.submit("Inventory sync operating optimally. No intervention required. Standard baseline monitoring continues.", [], "high"),
    ],
    reasoning: "Inventory sync operating optimally. No intervention required. Standard baseline monitoring continues.",
    tokenUsage: 465,
    durationMs: 175,
    nextAnalysisAt: new Date(day30Evening.getTime() + 24 * 60 * 60_000),
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
    createdAt: THIRTY_DAYS_AGO,
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
  console.log("⚡ Generating runs for 30-day timeline...");
  const allRuns: schema.RunInsert[] = [];

  for (const endpoint of ENDPOINTS) {
    const runs = generateRunsForEndpoint(endpoint);
    allRuns.push(...runs);
    console.log(`  → ${endpoint.name}: ${runs.length} runs`);
  }
  console.log(`✓ Generated ${allRuns.length} runs\n`);

  // 5. Batch insert runs
  const batchSize = 500;
  const batchCount = Math.ceil(allRuns.length / batchSize);
  console.log(`⏳ Batch inserting runs (concurrency: 5, batch size: ${batchSize})...`);
  await batchInsertWithConcurrency(
    allRuns,
    batchSize,
    5, // concurrency
    async (batch) => {
      await db.insert(schema.runs).values(batch).onConflictDoNothing();
    },
  );
  console.log(`✓ Inserted ${allRuns.length} runs in ${batchCount} batches\n`);

  // 6. Create AI sessions
  console.log("🤖 Creating AI analysis sessions...");
  const sessions = generateAISessions();
  await db.insert(schema.aiAnalysisSessions).values(sessions).onConflictDoNothing();
  console.log(`✓ ${sessions.length} AI analysis sessions created (~9 baseline + ~36 Black Friday + 4 post-event)\n`);

  // 7. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ E-Commerce Black Friday Demo Seed Complete!\n");
  console.log("📊 Timeline Summary:");
  console.log("  • Days 1-27: Sparse baseline (5-10 min endpoint intervals, AI checks every 3 days)");
  console.log("  • Day 28, 08:00-20:00: Black Friday SPIKE (20s-1min intervals, AI every 20min)");
  console.log("  • Days 29-30: Post-event stabilization\n");
  console.log("📦 Data Created:");
  console.log(`  • ${JOBS.length} job (E-Commerce Black Friday Demo - all endpoints share same job)`);
  console.log(`  • ${ENDPOINTS.length} endpoints (4 tiers: health, investigation, recovery, alert)`);
  console.log(`  • ${allRuns.length} runs (~30 days of execution history)`);
  console.log(`  • ${sessions.length} AI analysis sessions (~9 baseline + ~36 Black Friday + 4 post-event)\n`);
  console.log("🎯 Demo Features:");
  console.log("  • DRAMATIC SPIKE: Sparse baseline vs intensive Black Friday monitoring");
  console.log("  • Complete adaptation cycle: all-day surge → AI adapts → recovery → hints expire");
  console.log("  • Visual timeline: Color-coded source attribution (baseline, AI interval, AI one-shot, clamped)");
  console.log(`  • AI transparency: ${sessions.length} sessions showing progressive adaptation`);
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
