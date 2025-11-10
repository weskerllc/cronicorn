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

// Flash Sale Timeline (simulate recent data - today's date)
const NOW = new Date(); // Current time
const SALE_END = new Date(NOW.getTime() - 1 * 60 * 60 * 1000); // Sale ended 1 hour ago
const SALE_START = new Date(NOW.getTime() - 20 * 60 * 60 * 1000); // Sale started 20 hours ago (covers most of last 24h)

// Generate 50 jobs for stress testing pagination
function generateJobs() {
  const jobs = [];
  const jobTypes = [
    { prefix: "monitoring", name: "Monitoring", desc: "Real-time monitoring" },
    { prefix: "health", name: "Health Checks", desc: "Infrastructure health" },
    { prefix: "inventory", name: "Inventory Sync", desc: "Stock management" },
    { prefix: "analytics", name: "Analytics", desc: "Data processing" },
    { prefix: "alerts", name: "Alert System", desc: "Notification management" },
  ];

  for (let i = 1; i <= 50; i++) {
    const type = jobTypes[i % jobTypes.length];
    jobs.push({
      id: `job-${type.prefix}-${i}`,
      name: `${type.name} ${i}`,
      description: `${type.desc} - Instance ${i}`,
    });
  }

  return jobs;
}

const JOBS = generateJobs();

// Generate 5 endpoints per job (250 total endpoints)
function generateEndpoints(jobs: ReturnType<typeof generateJobs>) {
  const endpoints = [];
  const patterns = ["adaptive-tight", "adaptive-tight", "adaptive-tight", "oneshot", "steady"];
  const endpointTypes = [
    { name: "API Health", url: "/health", baseline: 2 * 60 * 1000, successRate: 0.98 },
    { name: "Database Check", url: "/db", baseline: 3 * 60 * 1000, successRate: 0.92 },
    { name: "Cache Status", url: "/cache", baseline: 5 * 60 * 1000, successRate: 0.95 },
    { name: "Queue Monitor", url: "/queue", baseline: 1 * 60 * 1000, successRate: 0.88 },
    { name: "Metrics Collect", url: "/metrics", baseline: 10 * 60 * 1000, successRate: 0.99 },
  ];

  jobs.forEach((job, _jobIndex) => {
    endpointTypes.forEach((type, typeIndex) => {
      const pattern = patterns[typeIndex % patterns.length];
      endpoints.push({
        id: `ep-${job.id}-${typeIndex}`,
        jobId: job.id,
        name: `${type.name}`,
        url: `https://api.example.com${type.url}`,
        baselineIntervalMs: type.baseline,
        minIntervalMs: Math.floor(type.baseline / 10), // 10% of baseline
        maxIntervalMs: type.baseline * 3, // 3x baseline
        description: `${type.name} for ${job.name}`,
        pattern,
        successRate: type.successRate,
      });
    });
  });

  return endpoints;
}

const ENDPOINTS = generateEndpoints(JOBS);

/**
 * Generate realistic run data based on endpoint pattern
 */
function generateRuns(endpoint: typeof ENDPOINTS[0]): Array<schema.RunInsert> {
  const runs: Array<schema.RunInsert> = [];
  let currentTime = new Date(SALE_START.getTime() - 24 * 60 * 60 * 1000); // Start 24h before sale

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
 * Generate sessions for first 30 endpoints to have varied data
 */
function generateAISessions(endpoints: ReturnType<typeof generateEndpoints>): Array<typeof schema.aiAnalysisSessions.$inferInsert> {
  const sessions: Array<typeof schema.aiAnalysisSessions.$inferInsert> = [];

  // Use first 30 endpoints for AI sessions
  const endpointsWithAI = endpoints.slice(0, 30);

  // Calculate times relative to SALE_START (which is recent)
  const saleDay = new Date(SALE_START);

  // Generate 2-3 sessions per endpoint at different times
  endpointsWithAI.forEach((endpoint, index) => {
    // Session 1: Near sale start (9am) - Detect surge, tighten monitoring
    const session1Time = new Date(saleDay.getTime() + (5 + index * 2) * 60 * 1000); // Stagger by 2 min
    sessions.push({
      id: `session-${crypto.randomUUID()}`,
      endpointId: endpoint.id,
      analyzedAt: session1Time,
      toolCalls: [
        {
          tool: "propose_interval",
          args: { intervalMs: 30000, ttlMinutes: 120, reason: "Traffic surge detected" },
          result: { success: true },
        },
      ],
      reasoning: "Traffic increased 5× baseline. Tightening monitoring to 30s for next 2 hours.",
      tokenUsage: 1234 + index * 10,
      durationMs: 450,
    });

    // Session 2: Mid-sale - adjustments
    if (index % 2 === 0) {
      const session2Time = new Date(saleDay.getTime() + (90 + index * 3) * 60 * 1000);
      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt: session2Time,
        toolCalls: [
          {
            tool: "propose_interval",
            args: { intervalMs: 60000, ttlMinutes: 60, reason: "Performance adjusting" },
            result: { success: true },
          },
        ],
        reasoning: "System load increasing. Adjusting monitoring frequency.",
        tokenUsage: 980 + index * 15,
        durationMs: 380,
      });
    }

    // Session 3: Recent - back to normal
    if (index % 3 === 0) {
      const session3Time = new Date(NOW.getTime() - (60 + index * 5) * 60 * 1000);
      sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: endpoint.id,
        analyzedAt: session3Time,
        toolCalls: [
          {
            tool: "propose_interval",
            args: { intervalMs: endpoint.baselineIntervalMs, ttlMinutes: 0, reason: "Normalizing" },
            result: { success: true },
          },
        ],
        reasoning: "Traffic normalized. Returning to baseline intervals.",
        tokenUsage: 756 + index * 8,
        durationMs: 310,
      });
    }
  });

  return sessions;
}

async function seed() {
  console.log("🌱 Seeding Flash Sale demo data...\n");

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

  // 2. Create jobs
  console.log("📦 Creating jobs...");
  for (const job of JOBS) {
    await db
      .insert(schema.jobs)
      .values({
        ...job,
        userId: DEMO_USER_ID,
        status: "active",
        createdAt: new Date(SALE_START.getTime() - 7 * 24 * 60 * 60 * 1000), // Created 1 week before
        updatedAt: NOW,
      })
      .onConflictDoNothing();
  }
  console.log(`✓ Created ${JOBS.length} jobs\n`);

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
        lastRunAt: new Date(NOW.getTime() - 60000), // Last run 1 min ago
        nextRunAt: new Date(NOW.getTime() + endpoint.baselineIntervalMs), // Next run scheduled
        failureCount: 0,
      })
      .onConflictDoNothing();
  }
  console.log(`✓ Created ${ENDPOINTS.length} endpoints\n`);

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
  await db.insert(schema.aiAnalysisSessions).values(sessions).onConflictDoNothing();
  console.log(`✓ Created ${sessions.length} AI sessions\n`);

  // 6. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Seed complete!\n");
  console.log("📊 Dashboard Data Summary:");
  console.log(`  • ${JOBS.length} jobs created`);
  console.log(`  • ${ENDPOINTS.length} endpoints created`);
  console.log(`  • ${totalRuns} runs generated (24h+ of data)`);
  console.log(`  • ${sessions.length} AI analysis sessions`);
  console.log("\n🎯 Performance Testing:");
  console.log(`  • ${JOBS.length} jobs test searchable job dropdowns`);
  console.log(`  • ${ENDPOINTS.length} endpoints test backend pagination (default: 20)`);
  console.log("  • Timeline charts limited to top 10 endpoints");
  console.log("  • Endpoint table shows 20 per page with pagination");
  console.log("\n📈 What to expect in the dashboard:");
  console.log("  • Job Health Chart: Searchable combobox with 50 jobs");
  console.log("  • Scheduling Intelligence: Mix of baseline, AI, and clamped runs");
  console.log("  • Execution Timeline: Shows top 10 of 250 endpoints (sorted by run count)");
  console.log("  • Endpoint Table: Paginated view of all 250 endpoints");
  console.log("  • Filters: Job dropdown with search for all 50 jobs");
  console.log("\n🔗 Navigate to /dashboard to see the results!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await pool.end();
}

// Run the seeder
seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
