import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo } from "../jobs-repo.js";
import { closeTestPool, createTestUser, expect, test as testWithTx } from "../tests/fixtures.js";

describe("endpoint Archiving and Quota Filtering", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  testWithTx("archiveEndpoint should set archivedAt timestamp", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create a job
    const job = await repo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Create an endpoint
    const endpointId = "ep-1";
    await repo.addEndpoint({
      id: endpointId,
      jobId: job.id,
      tenantId: userId,
      name: "Test Endpoint",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Archive the endpoint
    const archived = await repo.archiveEndpoint(endpointId);

    // Verify archivedAt is set
    expect(archived.archivedAt).toEqual(new Date("2025-01-01T00:00:00Z"));
    expect(archived.id).toBe(endpointId);
  });

  testWithTx("countEndpointsByUser excludes archived endpoints and endpoints from archived jobs", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create a job
    const job = await repo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Add 3 endpoints
    await repo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await repo.addEndpoint({
      id: "ep-2",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await repo.addEndpoint({
      id: "ep-3",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 3",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Should count all 3
    let count = await repo.countEndpointsByUser(userId);
    expect(count).toBe(3);

    // Archive one endpoint
    await repo.archiveEndpoint("ep-2");

    // Should now count only 2
    count = await repo.countEndpointsByUser(userId);
    expect(count).toBe(2);
  });

  testWithTx("countEndpointsByUser should exclude endpoints from archived jobs", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create two jobs
    const job1 = await repo.createJob({
      userId,
      name: "Job 1",
      status: "active",
    });

    const job2 = await repo.createJob({
      userId,
      name: "Job 2",
      status: "active",
    });

    // Add endpoints to both jobs
    await repo.addEndpoint({
      id: "ep-1",
      jobId: job1.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await repo.addEndpoint({
      id: "ep-2",
      jobId: job2.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Should count both
    let count = await repo.countEndpointsByUser(userId);
    expect(count).toBe(2);

    // Archive job1
    await repo.archiveJob(job1.id);

    // Should now count only endpoints from active jobs (1)
    count = await repo.countEndpointsByUser(userId);
    expect(count).toBe(1);
  });

  testWithTx("getUsage excludes archived endpoints and endpoints from archived jobs", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create a job
    const job = await repo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Add 2 endpoints
    await repo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await repo.addEndpoint({
      id: "ep-2",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Check usage before archiving
    let usage = await repo.getUsage(userId, new Date("2025-01-01T00:00:00Z"));
    expect(usage.endpointsUsed).toBe(2);

    // Archive one endpoint
    await repo.archiveEndpoint("ep-1");

    // Check usage after archiving
    usage = await repo.getUsage(userId, new Date("2025-01-01T00:00:00Z"));
    expect(usage.endpointsUsed).toBe(1);
  });

  testWithTx("claimDueEndpoints excludes archived endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create a job
    const job = await repo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Add 2 endpoints, both due now
    await repo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2024-12-31T23:00:00Z"), // Past due
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await repo.addEndpoint({
      id: "ep-2",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2024-12-31T23:00:00Z"), // Past due
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Should claim both
    let claimed = await repo.claimDueEndpoints(10, 60000);
    expect(claimed).toContain("ep-1");
    expect(claimed).toContain("ep-2");
    expect(claimed.length).toBe(2);

    // Clear locks
    await repo.clearLock("ep-1");
    await repo.clearLock("ep-2");

    // Archive ep-1
    await repo.archiveEndpoint("ep-1");

    // Should now claim only ep-2
    claimed = await repo.claimDueEndpoints(10, 60000);
    expect(claimed).toEqual(["ep-2"]);
  });

  testWithTx("claimDueEndpoints should exclude endpoints from archived jobs", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const repo = new DrizzleJobsRepo(tx, clock);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create an active job
    const job = await repo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Add endpoint, due now
    await repo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2024-12-31T23:00:00Z"), // Past due
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Should claim it
    let claimed = await repo.claimDueEndpoints(10, 60000);
    expect(claimed).toEqual(["ep-1"]);

    // Clear lock
    await repo.clearLock("ep-1");

    // Archive the job
    await repo.archiveJob(job.id);

    // Should now claim nothing
    claimed = await repo.claimDueEndpoints(10, 60000);
    expect(claimed).toEqual([]);
  });
});
