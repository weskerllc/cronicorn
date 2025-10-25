import { CronError } from "@cronicorn/domain";
import { describe, expect, it } from "vitest";

import { CronParserAdapter } from "../cron-parser-adapter.js";

describe("cronParserAdapter", () => {
  const cron = new CronParserAdapter();

  describe("common cron patterns", () => {
    it("every minute (* * * * *)", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const next = cron.next("* * * * *", from);

      expect(next.toISOString()).toBe("2025-01-01T00:01:00.000Z");
    });

    it("every hour (0 * * * *)", () => {
      const from = new Date("2025-01-01T00:30:00Z");
      const next = cron.next("0 * * * *", from);

      expect(next.toISOString()).toBe("2025-01-01T01:00:00.000Z");
    });

    it("daily at midnight (0 0 * * *)", () => {
      const from = new Date("2025-01-01T12:00:00Z");
      const next = cron.next("0 0 * * *", from);

      expect(next.toISOString()).toBe("2025-01-02T00:00:00.000Z");
    });

    it("weekly on Sunday (0 0 * * 0)", () => {
      // 2025-01-01 is a Wednesday
      const from = new Date("2025-01-01T12:00:00Z");
      const next = cron.next("0 0 * * 0", from);

      // Next Sunday is 2025-01-05
      expect(next.toISOString()).toBe("2025-01-05T00:00:00.000Z");
    });

    it("every 15 minutes (*/15 * * * *)", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const next = cron.next("*/15 * * * *", from);

      expect(next.toISOString()).toBe("2025-01-01T00:15:00.000Z");
    });
  });

  describe("different starting dates", () => {
    it("calculates next run from mid-day", () => {
      const from = new Date("2025-06-15T14:32:18Z");
      const next = cron.next("0 * * * *", from);

      expect(next.toISOString()).toBe("2025-06-15T15:00:00.000Z");
    });

    it("calculates next run across month boundary", () => {
      const from = new Date("2025-01-31T23:00:00Z");
      const next = cron.next("0 0 * * *", from);

      expect(next.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    });

    it("calculates next run across year boundary", () => {
      const from = new Date("2025-12-31T23:00:00Z");
      const next = cron.next("0 0 * * *", from);

      expect(next.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("when from is exactly on scheduled time, returns next occurrence", () => {
      // Starting exactly at midnight
      const from = new Date("2025-01-01T00:00:00Z");
      const next = cron.next("0 0 * * *", from);

      // Should return next day, not the same time
      expect(next.toISOString()).toBe("2025-01-02T00:00:00.000Z");
    });

    it("handles complex expression with specific day and time", () => {
      // Every Monday at 9 AM
      const from = new Date("2025-01-01T00:00:00Z"); // Wednesday
      const next = cron.next("0 9 * * 1", from);

      // Next Monday is 2025-01-06
      expect(next.toISOString()).toBe("2025-01-06T09:00:00.000Z");
    });
  });

  describe("error handling", () => {
    it("throws CronError for invalid expression", () => {
      const from = new Date("2025-01-01T00:00:00Z");

      expect(() => {
        cron.next("invalid", from);
      }).toThrow(CronError);
    });

    it("throws CronError for malformed expression", () => {
      const from = new Date("2025-01-01T00:00:00Z");

      expect(() => {
        cron.next("99 * * * *", from); // Invalid minute (> 59)
      }).toThrow(CronError);
    });

    it("error message includes the invalid expression", () => {
      const from = new Date("2025-01-01T00:00:00Z");

      try {
        cron.next("not a cron", from);
        expect.fail("Should have thrown CronError");
      }
      catch (error) {
        expect(error).toBeInstanceOf(CronError);
        if (error instanceof CronError) {
          expect(error.message).toContain("not a cron");
        }
      }
    });
  });
});
