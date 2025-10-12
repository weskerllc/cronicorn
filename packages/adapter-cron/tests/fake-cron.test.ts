import { describe, expect, it } from "vitest";

import { FakeCron } from "../src/fake-cron.js";

describe("fakeCron", () => {
  describe("default behavior", () => {
    it("adds 60 seconds by default", () => {
      const fakeCron = new FakeCron();
      const from = new Date("2025-01-01T00:00:00Z");

      const next = fakeCron.next("* * * * *", from);

      expect(next.toISOString()).toBe("2025-01-01T00:01:00.000Z");
    });

    it("ignores cron expression", () => {
      const fakeCron = new FakeCron();
      const from = new Date("2025-01-01T00:00:00Z");

      // Should return same result regardless of expression
      const next1 = fakeCron.next("* * * * *", from);
      const next2 = fakeCron.next("0 0 * * *", from);
      const next3 = fakeCron.next("invalid expression", from);

      expect(next1.toISOString()).toBe("2025-01-01T00:01:00.000Z");
      expect(next2.toISOString()).toBe("2025-01-01T00:01:00.000Z");
      expect(next3.toISOString()).toBe("2025-01-01T00:01:00.000Z");
    });
  });

  describe("custom interval", () => {
    it("uses configured interval", () => {
      const fakeCron = new FakeCron(300_000); // 5 minutes
      const from = new Date("2025-01-01T00:00:00Z");

      const next = fakeCron.next("* * * * *", from);

      expect(next.toISOString()).toBe("2025-01-01T00:05:00.000Z");
    });

    it("works with different intervals", () => {
      const cron1sec = new FakeCron(1_000);
      const cron10min = new FakeCron(600_000);
      const cron1hour = new FakeCron(3_600_000);

      const from = new Date("2025-01-01T00:00:00Z");

      expect(cron1sec.next("", from).toISOString()).toBe("2025-01-01T00:00:01.000Z");
      expect(cron10min.next("", from).toISOString()).toBe("2025-01-01T00:10:00.000Z");
      expect(cron1hour.next("", from).toISOString()).toBe("2025-01-01T01:00:00.000Z");
    });
  });

  describe("deterministic behavior", () => {
    it("returns consistent results for same inputs", () => {
      const fakeCron = new FakeCron(120_000); // 2 minutes
      const from = new Date("2025-06-15T14:30:00Z");

      const next1 = fakeCron.next("* * * * *", from);
      const next2 = fakeCron.next("* * * * *", from);

      expect(next1.toISOString()).toBe(next2.toISOString());
      expect(next1.toISOString()).toBe("2025-06-15T14:32:00.000Z");
    });

    it("can be used for predictable test scenarios", () => {
      const fakeCron = new FakeCron(60_000);
      let current = new Date("2025-01-01T00:00:00Z");

      // Simulate multiple "ticks"
      current = fakeCron.next("", current);
      expect(current.toISOString()).toBe("2025-01-01T00:01:00.000Z");

      current = fakeCron.next("", current);
      expect(current.toISOString()).toBe("2025-01-01T00:02:00.000Z");

      current = fakeCron.next("", current);
      expect(current.toISOString()).toBe("2025-01-01T00:03:00.000Z");
    });
  });
});
