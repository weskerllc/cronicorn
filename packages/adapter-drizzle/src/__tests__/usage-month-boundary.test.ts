import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo } from "../jobs-repo.js";
import * as schema from "../schema.js";
import { closeTestPool, expect, test } from "../tests/fixtures.js";

/**
 * Tests for month boundary behavior in usage calculations.
 * 
 * These tests specifically verify that usage from the previous month
 * is NOT counted in the current month's usage, which is critical for
 * monthly quota reset functionality.
 */
describe("usage month boundary", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("getUsage excludes December usage when checked on January 1", async ({ tx }) => {
    // Fixed clock at January 1, 2026 00:00:00 UTC
    const jan1Clock = () => new Date("2026-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, jan1Clock);

    // Create test user
    const testUserId = "user-month-boundary-test";
    await tx.insert(schema.user).values({
      id: testUserId,
      name: "Test User",
      email: "month-boundary@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tier: "free",
    });

    // Create job and endpoint
    const [job] = await tx.insert(schema.jobs).values({
      id: "job-month-boundary",
      userId: testUserId,
      name: "Test Job",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [endpoint] = await tx.insert(schema.jobEndpoints).values({
      id: "endpoint-month-boundary",
      jobId: job.id,
      tenantId: testUserId,
      name: "Test Endpoint",
      url: "https://example.com",
      method: "GET",
      nextRunAt: new Date(),
      baselineIntervalMs: 60_000,
      failureCount: 0,
    }).returning();

    // Add AI analysis session from December 31, 2025 at 11:59 PM UTC
    await tx.insert(schema.aiAnalysisSessions).values({
      id: "session-dec31-late",
      endpointId: endpoint.id,
      analyzedAt: new Date("2025-12-31T23:59:59.999Z"),
      tokenUsage: 50_000,
    });

    // Add AI analysis session from January 1, 2026 at 00:00:01 UTC
    await tx.insert(schema.aiAnalysisSessions).values({
      id: "session-jan1-early",
      endpointId: endpoint.id,
      analyzedAt: new Date("2026-01-01T00:00:01.000Z"),
      tokenUsage: 10_000,
    });

    // Get usage for January (since Jan 1, 2026)
    const startOfJanuary = new Date("2026-01-01T00:00:00Z");
    const usage = await repo.getUsage(testUserId, startOfJanuary);

    // Should only count the 10k from January 1st, NOT the 50k from December 31st
    expect(usage.aiCallsUsed).toBe(10_000);
  });

  test("getUsage excludes December runs when checked on January 1", async ({ tx }) => {
    const jan1Clock = () => new Date("2026-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, jan1Clock);

    // Create test user
    const testUserId = "user-runs-boundary-test";
    await tx.insert(schema.user).values({
      id: testUserId,
      name: "Test User",
      email: "runs-boundary@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tier: "free",
    });

    // Create job and endpoint
    const [job] = await tx.insert(schema.jobs).values({
      id: "job-runs-boundary",
      userId: testUserId,
      name: "Test Job",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [endpoint] = await tx.insert(schema.jobEndpoints).values({
      id: "endpoint-runs-boundary",
      jobId: job.id,
      tenantId: testUserId,
      name: "Test Endpoint",
      url: "https://example.com",
      method: "GET",
      nextRunAt: new Date(),
      baselineIntervalMs: 60_000,
      failureCount: 0,
    }).returning();

    // Add runs from December 31, 2025
    await tx.insert(schema.runs).values([
      {
        id: "run-dec31-1",
        endpointId: endpoint.id,
        status: "success",
        attempt: 1,
        startedAt: new Date("2025-12-31T22:00:00Z"),
        finishedAt: new Date("2025-12-31T22:00:05Z"),
        durationMs: 5000,
      },
      {
        id: "run-dec31-2",
        endpointId: endpoint.id,
        status: "success",
        attempt: 1,
        startedAt: new Date("2025-12-31T23:30:00Z"),
        finishedAt: new Date("2025-12-31T23:30:05Z"),
        durationMs: 5000,
      },
    ]);

    // Add run from January 1, 2026
    await tx.insert(schema.runs).values({
      id: "run-jan1-1",
      endpointId: endpoint.id,
      status: "success",
      attempt: 1,
      startedAt: new Date("2026-01-01T00:30:00Z"),
      finishedAt: new Date("2026-01-01T00:30:05Z"),
      durationMs: 5000,
    });

    // Get usage for January (since Jan 1, 2026)
    const startOfJanuary = new Date("2026-01-01T00:00:00Z");
    const usage = await repo.getUsage(testUserId, startOfJanuary);

    // Should only count 1 run from January, NOT the 2 from December
    expect(usage.totalRuns).toBe(1);
  });

  test("month boundary works correctly across different timezones", async ({ tx }) => {
    // This test ensures that timezone-aware timestamps work correctly
    // even when records are created in different timezones
    
    const jan1Clock = () => new Date("2026-01-01T12:00:00Z");
    const repo = new DrizzleJobsRepo(tx, jan1Clock);

    const testUserId = "user-timezone-boundary-test";
    await tx.insert(schema.user).values({
      id: testUserId,
      name: "Test User",
      email: "timezone-boundary@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tier: "free",
    });

    const [job] = await tx.insert(schema.jobs).values({
      id: "job-timezone-boundary",
      userId: testUserId,
      name: "Test Job",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [endpoint] = await tx.insert(schema.jobEndpoints).values({
      id: "endpoint-timezone-boundary",
      jobId: job.id,
      tenantId: testUserId,
      name: "Test Endpoint",
      url: "https://example.com",
      method: "GET",
      nextRunAt: new Date(),
      baselineIntervalMs: 60_000,
      failureCount: 0,
    }).returning();

    // Record created on Dec 31 11:59 PM in EST (UTC-5)
    // This is Jan 1 04:59 AM UTC, but should still be counted as December in local time
    // However, since we're using UTC timestamps, this SHOULD be counted as January
    const dec31EstLate = new Date("2026-01-01T04:59:00Z"); // Dec 31 11:59 PM EST
    
    // Record created on Jan 1 12:01 AM in EST
    // This is Jan 1 05:01 AM UTC
    const jan1EstEarly = new Date("2026-01-01T05:01:00Z"); // Jan 1 12:01 AM EST

    await tx.insert(schema.aiAnalysisSessions).values([
      {
        id: "session-dec31-est",
        endpointId: endpoint.id,
        analyzedAt: dec31EstLate,
        tokenUsage: 20_000,
      },
      {
        id: "session-jan1-est",
        endpointId: endpoint.id,
        analyzedAt: jan1EstEarly,
        tokenUsage: 30_000,
      },
    ]);

    // Get usage for January (since Jan 1, 2026 00:00:00 UTC)
    const startOfJanuary = new Date("2026-01-01T00:00:00Z");
    const usage = await repo.getUsage(testUserId, startOfJanuary);

    // Both records are in January when measured in UTC, so both should be counted
    expect(usage.aiCallsUsed).toBe(50_000);
  });
});
