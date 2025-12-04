/**
 * Tests for DrizzleSessionsRepo - AI Analysis Session Scheduling
 *
 * These tests verify the new getLastSession method and the extended
 * create method that supports nextAnalysisAt and endpointFailureCount.
 */

import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo } from "../jobs-repo.js";
import * as schema from "../schema.js";
import { DrizzleSessionsRepo } from "../sessions-repo.js";
import { closeTestPool, createTestUser, expect, test, type Tx } from "./fixtures.js";

describe("drizzleSessionsRepo - analysis scheduling", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  async function createTestEndpoint(tx: Tx, userId: string) {
    const jobsRepo = new DrizzleJobsRepo(tx);
    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      description: "Job for testing sessions",
      status: "active",
    });

    const endpointId = `ep_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await tx.insert(schema.jobEndpoints).values({
      id: endpointId,
      jobId: job.id,
      tenantId: userId,
      name: "Test Endpoint",
      baselineIntervalMs: 300000,
      nextRunAt: new Date(),
      failureCount: 0,
    });

    return { jobId: job.id, endpointId };
  }

  describe("create with scheduling fields", () => {
    test("stores nextAnalysisAt and endpointFailureCount", async ({ tx }) => {
      const user = await createTestUser(tx);
      const { endpointId } = await createTestEndpoint(tx, user.id);
      const sessionsRepo = new DrizzleSessionsRepo(tx);

      const nextAnalysisAt = new Date("2025-10-15T14:00:00Z");
      const sessionId = await sessionsRepo.create({
        endpointId,
        analyzedAt: new Date("2025-10-15T12:00:00Z"),
        toolCalls: [{ tool: "submit_analysis", args: {}, result: {} }],
        reasoning: "All good",
        tokenUsage: 100,
        durationMs: 500,
        nextAnalysisAt,
        endpointFailureCount: 3,
      });

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);

      // Verify we can retrieve it
      const lastSession = await sessionsRepo.getLastSession(endpointId);
      expect(lastSession).not.toBeNull();
      expect(lastSession!.nextAnalysisAt).toEqual(nextAnalysisAt);
      expect(lastSession!.endpointFailureCount).toBe(3);
    });

    test("allows null nextAnalysisAt and endpointFailureCount", async ({ tx }) => {
      const user = await createTestUser(tx);
      const { endpointId } = await createTestEndpoint(tx, user.id);
      const sessionsRepo = new DrizzleSessionsRepo(tx);

      // Create session without scheduling fields
      const sessionId = await sessionsRepo.create({
        endpointId,
        analyzedAt: new Date(),
        toolCalls: [],
        reasoning: "Basic analysis",
        tokenUsage: 50,
      });

      expect(sessionId).toBeDefined();

      const lastSession = await sessionsRepo.getLastSession(endpointId);
      expect(lastSession).not.toBeNull();
      expect(lastSession!.nextAnalysisAt).toBeNull();
      expect(lastSession!.endpointFailureCount).toBeNull();
    });
  });

  describe("getLastSession", () => {
    test("returns null when no sessions exist", async ({ tx }) => {
      const user = await createTestUser(tx);
      const { endpointId } = await createTestEndpoint(tx, user.id);
      const sessionsRepo = new DrizzleSessionsRepo(tx);

      const lastSession = await sessionsRepo.getLastSession(endpointId);

      expect(lastSession).toBeNull();
    });

    test("returns most recent session by analyzedAt", async ({ tx }) => {
      const user = await createTestUser(tx);
      const { endpointId } = await createTestEndpoint(tx, user.id);
      const sessionsRepo = new DrizzleSessionsRepo(tx);

      // Create older session
      await sessionsRepo.create({
        endpointId,
        analyzedAt: new Date("2025-10-15T10:00:00Z"),
        toolCalls: [],
        reasoning: "First analysis",
        nextAnalysisAt: new Date("2025-10-15T11:00:00Z"),
        endpointFailureCount: 0,
      });

      // Create newer session
      await sessionsRepo.create({
        endpointId,
        analyzedAt: new Date("2025-10-15T12:00:00Z"),
        toolCalls: [],
        reasoning: "Second analysis",
        nextAnalysisAt: new Date("2025-10-15T14:00:00Z"),
        endpointFailureCount: 2,
      });

      // Create oldest session (to verify ordering)
      await sessionsRepo.create({
        endpointId,
        analyzedAt: new Date("2025-10-15T08:00:00Z"),
        toolCalls: [],
        reasoning: "Oldest analysis",
        nextAnalysisAt: new Date("2025-10-15T09:00:00Z"),
        endpointFailureCount: 5,
      });

      const lastSession = await sessionsRepo.getLastSession(endpointId);

      expect(lastSession).not.toBeNull();
      expect(lastSession!.analyzedAt).toEqual(new Date("2025-10-15T12:00:00Z"));
      expect(lastSession!.nextAnalysisAt).toEqual(new Date("2025-10-15T14:00:00Z"));
      expect(lastSession!.endpointFailureCount).toBe(2);
    });

    test("only returns session for the specified endpoint", async ({ tx }) => {
      const user = await createTestUser(tx);
      const { endpointId: ep1 } = await createTestEndpoint(tx, user.id);
      const { endpointId: ep2 } = await createTestEndpoint(tx, user.id);
      const sessionsRepo = new DrizzleSessionsRepo(tx);

      // Create session for ep1
      await sessionsRepo.create({
        endpointId: ep1,
        analyzedAt: new Date("2025-10-15T12:00:00Z"),
        toolCalls: [],
        reasoning: "EP1 analysis",
        nextAnalysisAt: new Date("2025-10-15T14:00:00Z"),
        endpointFailureCount: 1,
      });

      // Create session for ep2
      await sessionsRepo.create({
        endpointId: ep2,
        analyzedAt: new Date("2025-10-15T13:00:00Z"),
        toolCalls: [],
        reasoning: "EP2 analysis",
        nextAnalysisAt: new Date("2025-10-15T15:00:00Z"),
        endpointFailureCount: 3,
      });

      // Get last session for ep1 - should not get ep2's session
      const lastSession = await sessionsRepo.getLastSession(ep1);

      expect(lastSession).not.toBeNull();
      expect(lastSession!.nextAnalysisAt).toEqual(new Date("2025-10-15T14:00:00Z"));
      expect(lastSession!.endpointFailureCount).toBe(1);
    });
  });
});
