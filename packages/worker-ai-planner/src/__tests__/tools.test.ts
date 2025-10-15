import type { Clock, JobsRepo } from "@cronicorn/domain";

import { callTool } from "@cronicorn/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createToolsForEndpoint } from "../tools.js";

describe("aiTools", () => {
  let mockJobsRepo: JobsRepo;
  let fakeClock: Clock;
  let now: Date;

  beforeEach(() => {
    now = new Date("2025-10-15T12:00:00Z");
    fakeClock = {
      now: () => now,
      sleep: async () => { },
    };

    mockJobsRepo = {
      writeAIHint: vi.fn(),
      setNextRunAtIfEarlier: vi.fn(),
      setPausedUntil: vi.fn(),
      // Add other required methods as stubs
      createJob: vi.fn(),
      getJob: vi.fn(),
      listJobs: vi.fn(),
      updateJob: vi.fn(),
      archiveJob: vi.fn(),
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      listEndpointsByJob: vi.fn(),
      getEndpoint: vi.fn(),
      deleteEndpoint: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      updateAfterRun: vi.fn(),
    };
  });

  describe("propose_interval", () => {
    it("writes AI hint with interval and expiry", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      const result = await callTool(tools, "propose_interval", {
        intervalMs: 120_000, // 2 minutes
        ttlMinutes: 60,
        reason: "High failure rate - reducing frequency",
      });

      // Verify hint written
      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith("ep-1", {
        intervalMs: 120_000,
        expiresAt: new Date("2025-10-15T13:00:00Z"), // now + 60 minutes
        reason: "High failure rate - reducing frequency",
      });

      // Verify nudge to apply immediately
      expect(mockJobsRepo.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep-1",
        new Date("2025-10-15T12:02:00Z"), // now + 120s
      );

      // Verify return message
      expect(result).toContain("120000ms");
      expect(result).toContain("60 minutes");
      expect(result).toContain("High failure rate");
    });

    it("uses default TTL when not specified", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await callTool(tools, "propose_interval", {
        intervalMs: 30_000,
      });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith("ep-1", {
        intervalMs: 30_000,
        expiresAt: new Date("2025-10-15T13:00:00Z"), // default 60 minutes
        reason: undefined,
      });
    });

    it("omits reason from message when not provided", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      const result = await callTool(tools, "propose_interval", {
        intervalMs: 60_000,
        ttlMinutes: 30,
      });

      expect(result).toContain("60000ms");
      expect(result).toContain("30 minutes");
      expect(result).not.toContain(":");
    });
  });

  describe("propose_next_time", () => {
    it("writes AI hint with one-shot timestamp", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      const nextRunAtIso = "2025-10-15T12:30:00Z";
      const result = await callTool(tools, "propose_next_time", {
        nextRunAtIso,
        ttlMinutes: 30,
        reason: "Immediate investigation needed",
      });

      // Verify hint written
      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith("ep-1", {
        nextRunAt: new Date(nextRunAtIso),
        expiresAt: new Date("2025-10-15T12:30:00Z"), // now + 30 minutes
        reason: "Immediate investigation needed",
      });

      // Verify nudge
      expect(mockJobsRepo.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep-1",
        new Date(nextRunAtIso),
      );

      // Verify return message
      expect(result).toContain("2025-10-15T12:30:00");
      expect(result).toContain("30 minutes");
      expect(result).toContain("Immediate investigation");
    });

    it("uses default TTL when not specified", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await callTool(tools, "propose_next_time", {
        nextRunAtIso: "2025-10-15T14:00:00Z",
      });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith("ep-1", {
        nextRunAt: new Date("2025-10-15T14:00:00Z"),
        expiresAt: new Date("2025-10-15T12:30:00Z"), // default 30 minutes
        reason: undefined,
      });
    });

    it("parses ISO timestamp correctly", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      const timestamp = "2025-10-20T09:00:00.000Z";
      await callTool(tools, "propose_next_time", {
        nextRunAtIso: timestamp,
        ttlMinutes: 60,
      });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith("ep-1", {
        nextRunAt: new Date(timestamp),
        expiresAt: expect.any(Date),
        reason: undefined,
      });

      expect(mockJobsRepo.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep-1",
        new Date(timestamp),
      );
    });
  });

  describe("pause_until", () => {
    it("pauses endpoint until specific timestamp", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      const untilIso = "2025-10-15T18:00:00Z";
      const result = await callTool(tools, "pause_until", {
        untilIso,
        reason: "Maintenance window",
      });

      expect(mockJobsRepo.setPausedUntil).toHaveBeenCalledWith(
        "ep-1",
        new Date(untilIso),
      );

      expect(result).toContain("Paused until");
      expect(result).toContain("2025-10-15T18:00:00");
      expect(result).toContain("Maintenance window");
    });

    it("resumes endpoint when untilIso is null", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      const result = await callTool(tools, "pause_until", {
        untilIso: null,
        reason: "Issue resolved",
      });

      expect(mockJobsRepo.setPausedUntil).toHaveBeenCalledWith("ep-1", null);

      expect(result).toContain("Resumed execution");
      expect(result).toContain("Issue resolved");
    });

    it("omits reason from message when not provided", async () => {
      const tools = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      const result = await callTool(tools, "pause_until", {
        untilIso: "2025-10-16T00:00:00Z",
      });

      expect(result).toContain("Paused until");
      // Don't check for ":" since ISO timestamp contains colons
      expect(result).not.toContain(": ");
    });
  });

  describe("tool binding to endpointId", () => {
    it("creates tools bound to specific endpoint", async () => {
      const toolsEp1 = createToolsForEndpoint("ep-1", mockJobsRepo, fakeClock);
      const toolsEp2 = createToolsForEndpoint("ep-2", mockJobsRepo, fakeClock);

      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      // Execute tool for ep-1
      await callTool(toolsEp1, "propose_interval", { intervalMs: 60_000 });

      // Execute tool for ep-2
      await callTool(toolsEp2, "propose_interval", { intervalMs: 120_000 });

      // Verify each tool called with correct endpoint ID
      expect(mockJobsRepo.writeAIHint).toHaveBeenNthCalledWith(1, "ep-1", expect.any(Object));
      expect(mockJobsRepo.writeAIHint).toHaveBeenNthCalledWith(2, "ep-2", expect.any(Object));
    });
  });
});
