import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Env } from "../../../lib/config.js";
import type { Database } from "../../../lib/db.js";

import { createApp } from "../../../app.js";
import { createMockAuth, createMockSession, createTestDatabase } from "../../../lib/__tests__/test-helpers.js";

/**
 * API integration tests for job routes.
 *
 * Tests the full HTTP request/response cycle including:
 * - Route validation and OpenAPI schemas
 * - Authentication middleware
 * - Request/response mapping
 * - Error handling
 *
 * Uses real database with transaction-per-test pattern.
 * Auth is mocked via test helpers.
 */

// Helper to safely extract JSON from response
// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

const mockUserId = "test-user-1";
const testConfig: Env = {
  NODE_ENV: "test",
  PORT: 3000,
  DATABASE_URL: "postgres://test",
  API_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000/api/auth",
  GITHUB_CLIENT_ID: "test-id",
  GITHUB_CLIENT_SECRET: "test-secret",
};

describe("jobs API", () => {
  let db: Database;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    db = testDb.db;
    cleanup = testDb.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ==================== Job Lifecycle Routes ====================

  describe("post /api/jobs", () => {
    it("creates job with valid input", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const res = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Job",
          description: "Test description",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(201);
      const data = await getJson(res);

      expect(data).toMatchObject({
        id: expect.any(String),
        userId: mockUserId,
        name: "Test Job",
        status: "active",
      });
    });
  });

  describe("get /api/jobs/:id", () => {
    it("returns job by id", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      // First create a job
      const createRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Get Test Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const created = await getJson(createRes);

      // Then fetch it
      const res = await app.request(`/api/jobs/${created.id}`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data).toMatchObject({
        id: created.id,
        userId: mockUserId,
        name: "Get Test Job",
        status: "active",
      });
    });

    it("returns 404 for non-existent job", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const res = await app.request("/api/jobs/nonexistent-id", {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("get /api/jobs", () => {
    it("lists all jobs for user", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      // Create two jobs
      await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job 1" }),
        headers: { "Content-Type": "application/json" },
      });
      await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job 2" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await app.request("/api/jobs", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.jobs.length).toBeGreaterThanOrEqual(2);
      expect(data.jobs[0]).toHaveProperty("endpointCount");
    });

    it("filters jobs by status", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      // Create and archive a job
      const createRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job to Archive" }),
        headers: { "Content-Type": "application/json" },
      });
      const created = await getJson(createRes);
      await app.request(`/api/jobs/${created.id}`, { method: "DELETE" });

      // Create active job
      await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Active Job" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await app.request("/api/jobs?status=active", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.jobs.length).toBeGreaterThanOrEqual(1);
      // eslint-disable-next-line ts/no-explicit-any
      const activeJob = data.jobs.find((j: any) => j.name === "Active Job");
      expect(activeJob).toBeDefined();
    });
  });

  describe("patch /api/jobs/:id", () => {
    it("updates job name and description", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const createRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Original Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const created = await getJson(createRes);

      const res = await app.request(`/api/jobs/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
          description: "Updated description",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.name).toBe("Updated Name");
    });
  });

  describe("delete /api/jobs/:id", () => {
    it("archives job (soft delete)", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const createRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job to Archive" }),
        headers: { "Content-Type": "application/json" },
      });
      const created = await getJson(createRes);

      const res = await app.request(`/api/jobs/${created.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.status).toBe("archived");
    });
  });

  // ==================== Endpoint Orchestration Routes ====================

  describe("post /api/jobs/:jobId/endpoints", () => {
    it("adds endpoint to job with cron schedule", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job with Endpoint" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const res = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Test Endpoint",
          url: "https://example.com/webhook",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(201);
      const data = await getJson(res);
      expect(data).toMatchObject({
        id: expect.any(String),
        name: "Test Endpoint",
        url: "https://example.com/webhook",
        baselineCron: "0 * * * *",
      });
    });

    it("adds endpoint with interval schedule", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job with Interval" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const res = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Interval Endpoint",
          url: "https://example.com/interval",
          method: "GET",
          baselineIntervalMs: 300000, // 5 minutes
          minIntervalMs: 60000,
          maxIntervalMs: 600000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(201);
      const data = await getJson(res);
      expect(data.baselineIntervalMs).toBe(300000);
      expect(data.minIntervalMs).toBe(60000);
      expect(data.maxIntervalMs).toBe(600000);
    });
  });

  describe("get /api/jobs/:jobId/endpoints", () => {
    it("lists all endpoints for a job", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Multi-Endpoint Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      // Add two endpoints
      await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Endpoint 1",
          url: "https://example.com/1",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Endpoint 2",
          url: "https://example.com/2",
          method: "GET",
          baselineIntervalMs: 300000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.endpoints).toHaveLength(2);
    });
  });

  describe("patch /api/jobs/:jobId/endpoints/:id", () => {
    it("updates endpoint configuration", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job for Update" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Original Endpoint",
          url: "https://example.com/original",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Endpoint",
          baselineCron: "*/30 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.name).toBe("Updated Endpoint");
      expect(data.baselineCron).toBe("*/30 * * * *");
    });
  });

  describe("delete /api/jobs/:jobId/endpoints/:id", () => {
    it("deletes endpoint", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Job for Delete" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Endpoint to Delete",
          url: "https://example.com/delete",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);
    });
  });

  // ==================== Adaptive Scheduling Routes ====================

  describe("post /api/endpoints/:id/hints/interval", () => {
    it("applies interval hint", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Hint Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Hinted Endpoint",
          url: "https://example.com/hint",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/hints/interval`, {
        method: "POST",
        body: JSON.stringify({
          intervalMs: 120000,
          ttlMinutes: 60,
          reason: "Test hint",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(204);
    });
  });

  describe("post /api/endpoints/:id/hints/oneshot", () => {
    it("schedules one-shot run", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "OneShot Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "OneShot Endpoint",
          url: "https://example.com/oneshot",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const futureTime = new Date(Date.now() + 300000).toISOString();
      const res = await app.request(`/api/endpoints/${endpoint.id}/hints/oneshot`, {
        method: "POST",
        body: JSON.stringify({
          nextRunAt: futureTime,
          ttlMinutes: 10,
          reason: "Test one-shot",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(204);
    });
  });

  describe("post /api/endpoints/:id/pause", () => {
    it("pauses endpoint", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Pause Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Pausable Endpoint",
          url: "https://example.com/pause",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const futureTime = new Date(Date.now() + 3600000).toISOString();
      const res = await app.request(`/api/endpoints/${endpoint.id}/pause`, {
        method: "POST",
        body: JSON.stringify({
          pausedUntil: futureTime,
          reason: "Test pause",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(204);
    });

    it("resumes endpoint when untilIso is null", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Resume Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Resumable Endpoint",
          url: "https://example.com/resume",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/pause`, {
        method: "POST",
        body: JSON.stringify({
          pausedUntil: null,
          reason: "Resume",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(204);
    });
  });

  describe("delete /api/endpoints/:id/hints", () => {
    it("clears all hints", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Clear Hints Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Clear Hints Endpoint",
          url: "https://example.com/clear",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/hints`, {
        method: "DELETE",
      });

      expect(res.status).toBe(204);
    });
  });

  describe("post /api/endpoints/:id/reset-failures", () => {
    it("resets failure count", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Reset Failures Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Reset Failures Endpoint",
          url: "https://example.com/reset",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/reset-failures`, {
        method: "POST",
      });

      expect(res.status).toBe(204);
    });
  });

  // ==================== Execution Visibility Routes ====================

  describe("get /api/endpoints/:id/runs", () => {
    it("lists run history", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Runs Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Runs Endpoint",
          url: "https://example.com/runs",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/runs`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data).toHaveProperty("runs");
      expect(Array.isArray(data.runs)).toBe(true);
    });

    it("filters runs by status", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Filter Runs Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Filter Runs Endpoint",
          url: "https://example.com/filter-runs",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/runs?status=success&limit=10`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("get /api/endpoints/:id/health", () => {
    it("returns health summary", async () => {
      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const app = await createApp(db, testConfig, mockAuth);

      const jobRes = await app.request("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ name: "Health Job" }),
        headers: { "Content-Type": "application/json" },
      });
      const job = await getJson(jobRes);

      const epRes = await app.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Health Endpoint",
          url: "https://example.com/health",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const endpoint = await getJson(epRes);

      const res = await app.request(`/api/endpoints/${endpoint.id}/health`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data).toHaveProperty("successCount");
      expect(data).toHaveProperty("failureCount");
    });
  });
});
