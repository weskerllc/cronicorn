#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * Flash Sale Demo Data Seeder
 *
 * Creates realistic data for the E-Commerce Flash Sale scenario from docs/public/use-cases.md
 * Showcases all dashboard features:
 * - Job Health Chart: Shows varied success rates across monitoring jobs
 * - Scheduling Intelligence: Mix of baseline, AI-driven, and clamped runs
 * - Execution Timeline: Dense activity during sale hours, sparse otherwise
 * - Filtering: Multiple jobs/endpoints/statuses to filter
 *
 * Run with: pnpm tsx scripts/seed-flash-sale-demo.ts
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

// Job definitions (from use case)
const JOBS = [
    {
        id: "job-monitoring",
        name: "Black Friday Monitoring",
        description: "Real-time monitoring during flash sale",
    },
    {
        id: "job-health",
        name: "System Health Checks",
        description: "Infrastructure and service health",
    },
    {
        id: "job-inventory",
        name: "Inventory Management",
        description: "Stock sync and validation",
    },
];

// Endpoint definitions with realistic behavior patterns
const ENDPOINTS = [
    {
        id: "ep-traffic-monitor",
        jobId: "job-monitoring",
        name: "Traffic Monitor",
        url: "https://api.example.com/monitoring/traffic",
        baselineIntervalMs: 5 * 60 * 1000, // 5 min baseline
        minIntervalMs: 30 * 1000, // 30 sec min (during surge)
        maxIntervalMs: 15 * 60 * 1000, // 15 min max
        description: "Track visitors and page load times",
        // Behavior: Starts at baseline, tightens to 30s during surge (9am-11am), relaxes back
        pattern: "adaptive-tight",
        successRate: 0.98, // Very reliable
    },
    {
        id: "ep-checkout-health",
        jobId: "job-monitoring",
        name: "Order Processor Health",
        url: "https://api.example.com/monitoring/checkout",
        baselineIntervalMs: 3 * 60 * 1000, // 3 min baseline
        minIntervalMs: 30 * 1000, // 30 sec min
        maxIntervalMs: 10 * 60 * 1000, // 10 min max
        description: "Monitor checkout performance and errors",
        pattern: "adaptive-tight",
        successRate: 0.85, // Some degradation during peak
    },
    {
        id: "ep-inventory-sync",
        jobId: "job-inventory",
        name: "Inventory Sync Check",
        url: "https://api.example.com/inventory/sync",
        baselineIntervalMs: 10 * 60 * 1000, // 10 min baseline
        minIntervalMs: 2 * 60 * 1000, // 2 min min
        maxIntervalMs: 30 * 60 * 1000, // 30 min max
        description: "Ensure stock accuracy across systems",
        pattern: "adaptive-tight", // Changed from "steady" to get more AI
        successRate: 0.95, // Generally stable
    },
    {
        id: "ep-cache-warmup",
        jobId: "job-health",
        name: "Cache Warm-up",
        url: "https://api.example.com/ops/cache-warmup",
        baselineIntervalMs: 60 * 60 * 1000, // 1 hour baseline (usually paused)
        minIntervalMs: 5 * 60 * 1000, // 5 min min
        maxIntervalMs: 2 * 60 * 60 * 1000, // 2 hour max
        description: "Warm product page caches during traffic spikes",
        pattern: "oneshot", // Fires as one-shots during surge
        successRate: 1.0, // Always succeeds
    },
    {
        id: "ep-db-health",
        jobId: "job-health",
        name: "Database Health",
        url: "https://api.example.com/health/database",
        baselineIntervalMs: 2 * 60 * 1000, // 2 min baseline
        minIntervalMs: 30 * 1000, // 30 sec min
        maxIntervalMs: 5 * 60 * 1000, // 5 min max
        description: "Check database connections and query performance",
        pattern: "adaptive-tight", // Changed from "steady" to get more AI
        successRate: 0.92, // Occasional slow queries flagged as failures
    },
];

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
 */
function generateAISessions(): Array<typeof schema.aiAnalysisSessions.$inferInsert> {
    const sessions: Array<typeof schema.aiAnalysisSessions.$inferInsert> = [];

    // Calculate times relative to SALE_START (which is recent)
    const saleDay = new Date(SALE_START);

    // Session 1: Near sale start (9am) - Detect surge, tighten monitoring
    const session1Time = new Date(saleDay.getTime() + 5 * 60 * 1000); // 5 min after sale start
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-traffic-monitor",
        analyzedAt: session1Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 30000, ttlMinutes: 120, reason: "Traffic surge detected" },
                result: { success: true },
            },
        ],
        reasoning: "Traffic increased 5× baseline. Tightening monitoring to 30s for next 2 hours.",
        tokenUsage: 1234,
        durationMs: 450,
    });

    // Session 2: 1 hour into sale - Activate cache warmup
    const session2Time = new Date(saleDay.getTime() + 75 * 60 * 1000); // 1h 15m after sale start
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-checkout-health",
        analyzedAt: session2Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 30000, ttlMinutes: 60, reason: "Checkout degradation detected" },
                result: { success: true },
            },
        ],
        reasoning: "Slow page loads detected. Increasing checkout monitoring and activating cache warm-up.",
        tokenUsage: 1567,
        durationMs: 520,
    });

    // Session 3: Mid-sale - System recovering
    const session3Time = new Date(saleDay.getTime() + 2.5 * 60 * 60 * 1000); // 2.5h after sale start
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-traffic-monitor",
        analyzedAt: session3Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 180000, ttlMinutes: 60, reason: "Performance stabilizing" },
                result: { success: true },
            },
        ],
        reasoning: "System performance stabilizing. Gradually relaxing monitoring intervals.",
        tokenUsage: 980,
        durationMs: 380,
    });

    // Session 4: Near sale end - Back to baseline
    const session4Time = new Date(saleDay.getTime() + 5 * 60 * 60 * 1000); // 5h after sale start
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-traffic-monitor",
        analyzedAt: session4Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 300000, ttlMinutes: 0, reason: "Traffic normalized" },
                result: { success: true },
            },
        ],
        reasoning: "Traffic back to normal levels. Returning to baseline 5-minute intervals.",
        tokenUsage: 756,
        durationMs: 310,
    });

    // Add a few more recent sessions for variety
    const session5Time = new Date(NOW.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-inventory-sync",
        analyzedAt: session5Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 120000, ttlMinutes: 60, reason: "Stock sync delay detected" },
                result: { success: true },
            },
        ],
        reasoning: "Inventory sync lagging. Increasing frequency to maintain accuracy.",
        tokenUsage: 892,
        durationMs: 410,
    });

    const session6Time = new Date(NOW.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
    sessions.push({
        id: `session-${crypto.randomUUID()}`,
        endpointId: "ep-db-health",
        analyzedAt: session6Time,
        toolCalls: [
            {
                tool: "propose_interval",
                args: { intervalMs: 60000, ttlMinutes: 30, reason: "Slow query detected" },
                result: { success: true },
            },
        ],
        reasoning: "Database response time increased. Tightening health check monitoring.",
        tokenUsage: 1123,
        durationMs: 480,
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
    const sessions = generateAISessions();
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
    console.log("\n🎯 What to expect in the dashboard:");
    console.log("  • Job Health Chart: Varied success rates (85%-100%)");
    console.log("  • Scheduling Intelligence: Mix of baseline, AI, and clamped runs");
    console.log("  • Execution Timeline: Dense during sale hours, sparse before/after");
    console.log("  • Recent Runs: Last 50 runs across all endpoints");
    console.log("\n🔗 Navigate to /dashboard-new to see the results!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await pool.end();
}

// Run the seeder
seed().catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
});
