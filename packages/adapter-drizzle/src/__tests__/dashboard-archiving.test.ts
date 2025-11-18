import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo } from "../jobs-repo.js";
import { DrizzleRunsRepo } from "../runs-repo.js";
import { DrizzleSessionsRepo } from "../sessions-repo.js";
import { closeTestPool, createTestUser, expect, test as testWithTx } from "../tests/fixtures.js";

/**
 * Integration tests verifying that all dashboard queries properly exclude
 * archived jobs and endpoints.
 *
 * Coverage:
 * - Jobs: getJobHealthDistribution
 * - Runs: getFilteredMetrics, getSourceDistribution, getRunTimeSeries, getEndpointTimeSeries, listRuns
 * - Sessions: getAISessionTimeSeries
 * - Endpoints: getEndpointCounts
 */
describe("dashboard Queries - Archived Filtering", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  testWithTx("getJobHealthDistribution should exclude archived jobs", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create two jobs
    const job1 = await jobsRepo.createJob({
      userId,
      name: "Active Job",
      status: "active",
    });

    const job2 = await jobsRepo.createJob({
      userId,
      name: "Archived Job",
      status: "active",
    });

    // Add endpoints to both jobs
    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job1.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await jobsRepo.addEndpoint({
      id: "ep-2",
      jobId: job2.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Create runs for both endpoints
    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1, source: "baseline" });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    const run2 = await runsRepo.create({ endpointId: "ep-2", status: "running", attempt: 1, source: "baseline" });
    await runsRepo.finish(run2, { status: "success", durationMs: 100 });

    // Before archiving - should see both jobs
    let health = await runsRepo.getJobHealthDistribution(userId);
    expect(health).toHaveLength(2);

    // Archive job2
    await jobsRepo.archiveJob(job2.id);

    // After archiving - should only see job1
    health = await runsRepo.getJobHealthDistribution(userId);
    expect(health).toHaveLength(1);
    expect(health[0].jobName).toBe("Active Job");
  });

  testWithTx("getJobHealthDistribution should exclude endpoints that are archived", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    // Create test user
    const user = await createTestUser(tx);
    const userId = user.id;

    // Create a job
    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    // Add two endpoints
    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await jobsRepo.addEndpoint({
      id: "ep-2",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Create runs for both endpoints
    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1, source: "baseline" });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    const run2 = await runsRepo.create({ endpointId: "ep-2", status: "running", attempt: 1, source: "baseline" });
    await runsRepo.finish(run2, { status: "success", durationMs: 100 });

    // Before archiving endpoint - should see 2 successes
    let health = await runsRepo.getJobHealthDistribution(userId);
    expect(health[0].successCount).toBe(2);

    // Archive ep-2
    await jobsRepo.archiveEndpoint("ep-2");

    // After archiving endpoint - should only count runs from ep-1
    health = await runsRepo.getJobHealthDistribution(userId);
    expect(health[0].successCount).toBe(1);
  });

  testWithTx("getFilteredMetrics should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1 });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    // Before archiving
    let metrics = await runsRepo.getFilteredMetrics({ userId });
    expect(metrics.totalRuns).toBe(1);

    // Archive endpoint
    await jobsRepo.archiveEndpoint("ep-1");

    // After archiving - should not count the run
    metrics = await runsRepo.getFilteredMetrics({ userId });
    expect(metrics.totalRuns).toBe(0);
  });

  testWithTx("getSourceDistribution should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1, source: "baseline" });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    // Before archiving
    let dist = await runsRepo.getSourceDistribution({ userId });
    expect(dist).toHaveLength(1);
    expect(dist[0].source).toBe("baseline");

    // Archive job
    await jobsRepo.archiveJob(job.id);

    // After archiving
    dist = await runsRepo.getSourceDistribution({ userId });
    expect(dist).toHaveLength(0);
  });

  testWithTx("getRunTimeSeries should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1 });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    // Before archiving
    let series = await runsRepo.getRunTimeSeries({ userId });
    const totalBefore = series.reduce((sum, point) => sum + point.success + point.failure, 0);
    expect(totalBefore).toBe(1);

    // Archive endpoint
    await jobsRepo.archiveEndpoint("ep-1");

    // After archiving
    series = await runsRepo.getRunTimeSeries({ userId });
    const totalAfter = series.reduce((sum, point) => sum + point.success + point.failure, 0);
    expect(totalAfter).toBe(0);
  });

  testWithTx("getEndpointTimeSeries should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1 });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    // Before archiving
    let series = await runsRepo.getEndpointTimeSeries({ userId });
    expect(series.length).toBeGreaterThan(0);

    // Archive job
    await jobsRepo.archiveJob(job.id);

    // After archiving
    series = await runsRepo.getEndpointTimeSeries({ userId });
    expect(series.length).toBe(0);
  });

  testWithTx("listRuns should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const runsRepo = new DrizzleRunsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    const run1 = await runsRepo.create({ endpointId: "ep-1", status: "running", attempt: 1 });
    await runsRepo.finish(run1, { status: "success", durationMs: 100 });

    // Before archiving
    let { runs, total } = await runsRepo.listRuns({ userId });
    expect(runs).toHaveLength(1);
    expect(total).toBe(1);

    // Archive endpoint
    await jobsRepo.archiveEndpoint("ep-1");

    // After archiving
    ({ runs, total } = await runsRepo.listRuns({ userId }));
    expect(runs).toHaveLength(0);
    expect(total).toBe(0);
  });

  testWithTx("getAISessionTimeSeries should exclude archived jobs and endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);
    const sessionsRepo = new DrizzleSessionsRepo(tx);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await sessionsRepo.create({
      endpointId: "ep-1",
      analyzedAt: new Date("2025-01-01T00:30:00Z"),
      toolCalls: [],
      reasoning: "Test reasoning",
      tokenUsage: 100,
    });

    // Before archiving
    let series = await sessionsRepo.getAISessionTimeSeries({ userId });
    expect(series.length).toBeGreaterThan(0);

    // Archive endpoint
    await jobsRepo.archiveEndpoint("ep-1");

    // After archiving
    series = await sessionsRepo.getAISessionTimeSeries({ userId });
    expect(series.length).toBe(0);
  });

  testWithTx("getEndpointCounts should exclude archived endpoints", async ({ tx }) => {
    const clock = () => new Date("2025-01-01T00:00:00Z");
    const jobsRepo = new DrizzleJobsRepo(tx, clock);

    const user = await createTestUser(tx);
    const userId = user.id;

    const job = await jobsRepo.createJob({
      userId,
      name: "Test Job",
      status: "active",
    });

    await jobsRepo.addEndpoint({
      id: "ep-1",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 1",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    await jobsRepo.addEndpoint({
      id: "ep-2",
      jobId: job.id,
      tenantId: userId,
      name: "Endpoint 2",
      nextRunAt: new Date("2025-01-01T01:00:00Z"),
      failureCount: 0,
      baselineIntervalMs: 60000,
    });

    // Before archiving
    let counts = await jobsRepo.getEndpointCounts(userId, clock());
    expect(counts.total).toBe(2);
    expect(counts.active).toBe(2);

    // Archive one endpoint
    await jobsRepo.archiveEndpoint("ep-1");

    // After archiving
    counts = await jobsRepo.getEndpointCounts(userId, clock());
    expect(counts.total).toBe(1);
    expect(counts.active).toBe(1);
  });
});
