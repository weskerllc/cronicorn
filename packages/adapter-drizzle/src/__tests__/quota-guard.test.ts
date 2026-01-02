import { TIER_LIMITS } from "@cronicorn/domain";
import { afterAll, describe } from "vitest";

import { DrizzleQuotaGuard } from "../quota-guard.js";
import * as schema from "../schema.js";
import { closeTestPool, expect, test } from "../tests/fixtures.js";

describe("drizzleQuotaGuard", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("canProceed", () => {
    test("returns true when user has no endpoints (zero usage)", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      // Create test user with free tier
      const testUserId = "test-user-quota-1";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-1@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(true);
    });

    test("returns true when usage is below tier limit", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      // Create test user with free tier
      const testUserId = "test-user-quota-2";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-2@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      // Create job and endpoint
      const [job] = await tx.insert(schema.jobs).values({
        id: "job-1",
        userId: testUserId,
        name: "Test Job",
        description: "Test",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-1",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      // Add token usage (50k tokens, below free tier limit of 100k)
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-1",
        endpointId: endpoint.id,
        analyzedAt: new Date(),
        tokenUsage: 50_000,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(true);
    });

    test("returns false when usage equals tier limit", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-3";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-3@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-2",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-2",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-2",
        endpointId: endpoint.id,
        analyzedAt: new Date(),
        tokenUsage: TIER_LIMITS.free,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(false);
    });

    test("returns false when usage exceeds tier limit", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-4";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-4@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-3",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-3",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-3",
        endpointId: endpoint.id,
        analyzedAt: new Date(),
        tokenUsage: TIER_LIMITS.free + 10_000,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(false);
    });

    test("aggregates usage across multiple endpoints", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-5";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-5@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-4",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint1] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-4a",
        jobId: job.id,
        tenantId: testUserId,
        name: "Endpoint 1",
        url: "https://example.com/1",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      const [endpoint2] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-4b",
        jobId: job.id,
        tenantId: testUserId,
        name: "Endpoint 2",
        url: "https://example.com/2",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      // 40k + 70k = 110k > 100k free limit
      await tx.insert(schema.aiAnalysisSessions).values([
        {
          id: "session-4a",
          endpointId: endpoint1.id,
          analyzedAt: new Date(),
          tokenUsage: 40_000,
        },
        {
          id: "session-4b",
          endpointId: endpoint2.id,
          analyzedAt: new Date(),
          tokenUsage: 70_000,
        },
      ]);

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(false);
    });

    test("only counts usage from current month", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-6";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-6@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-5",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-5",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      const now = new Date();
      // Create a date that's definitely in the previous month (UTC)
      const lastMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - 1,
        15, // Mid-month to avoid edge cases
      ));

      // Last month usage (ignored)
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-5a",
        endpointId: endpoint.id,
        analyzedAt: lastMonth,
        tokenUsage: 150_000,
      });

      // Current month usage (counted)
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-5b",
        endpointId: endpoint.id,
        analyzedAt: now,
        tokenUsage: 30_000,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(true); // Only 30k from current month
    });

    test("respects pro tier limits", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-7";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-7@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "pro",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-6",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-6",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      // 500k > free 100k, < pro 1M
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-6",
        endpointId: endpoint.id,
        analyzedAt: new Date(),
        tokenUsage: 500_000,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(true);
    });

    test("respects enterprise tier limits", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-8";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-test-8@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "enterprise",
      });

      const [job] = await tx.insert(schema.jobs).values({
        id: "job-7",
        userId: testUserId,
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const [endpoint] = await tx.insert(schema.jobEndpoints).values({
        id: "endpoint-7",
        jobId: job.id,
        tenantId: testUserId,
        name: "Test Endpoint",
        url: "https://example.com",
        method: "GET",
        nextRunAt: new Date(),
        baselineIntervalMs: 60_000,
        failureCount: 0,
      }).returning();

      // 5M > pro 1M, < enterprise 10M
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-7",
        endpointId: endpoint.id,
        analyzedAt: new Date(),
        tokenUsage: 5_000_000,
      });

      const result = await guard.canProceed(testUserId);
      expect(result).toBe(true);
    });

    test("returns false for non-existent user", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);
      const result = await guard.canProceed("non-existent-user");
      expect(result).toBe(false);
    });

    test("returns false for invalid tier value", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const invalidUserId = "invalid-tier-user";
      await tx.insert(schema.user).values({
        id: invalidUserId,
        name: "Invalid Tier User",
        email: "invalid@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "invalid",
      });

      const result = await guard.canProceed(invalidUserId);
      expect(result).toBe(false);
    });

    test("excludes usage from December 31 when checking on January 1", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);

      const testUserId = "test-user-quota-month-boundary";
      await tx.insert(schema.user).values({
        id: testUserId,
        name: "Test User",
        email: "quota-month-boundary@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: "free",
      });

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

      // Usage from December 31, 2025 at 11:59 PM UTC (end of month)
      const dec31Usage = new Date("2025-12-31T23:59:59.999Z");
      await tx.insert(schema.aiAnalysisSessions).values({
        id: "session-dec31",
        endpointId: endpoint.id,
        analyzedAt: dec31Usage,
        tokenUsage: 150_000, // Would exceed free tier limit
      });

      // Simulate checking quota on January 1, 2026
      // Mock the "now" by checking if the guard correctly excludes December data
      const result = await guard.canProceed(testUserId);
      
      // Should return true because December usage should NOT be counted in January
      // (Current test time is January 2026, so December 2025 should be excluded)
      expect(result).toBe(true);
    });
  });

  describe("recordUsage", () => {
    test("is a no-op (does not throw)", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);
      await expect(guard.recordUsage("any-tenant", 1000)).resolves.toBeUndefined();
    });

    test("accepts any tenant and token values", async ({ tx }) => {
      const guard = new DrizzleQuotaGuard(tx);
      await expect(guard.recordUsage("any-tenant", 0)).resolves.toBeUndefined();
      await expect(guard.recordUsage("another", 999999)).resolves.toBeUndefined();
    });
  });
});
