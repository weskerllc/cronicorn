import type { Cron } from "@cronicorn/domain";

/**
 * Fake Cron implementation for deterministic testing.
 *
 * Ignores the cron expression and simply adds a fixed interval
 * to the 'from' date. This provides predictable behavior for tests
 * without needing to understand actual cron syntax.
 *
 * Similar to FakeClock pattern - simple and boring.
 */
export class FakeCron implements Cron {
  /**
   * @param intervalMs - Milliseconds to add to 'from' date (default: 60000 = 1 minute)
   */
  constructor(private readonly intervalMs: number = 60_000) { }

  /**
   * Returns a date that is intervalMs milliseconds after 'from'.
   * The expr parameter is ignored.
   *
   * @param _expr - Ignored (accepts any string)
   * @param from - Base date to add interval to
   * @returns Date that is intervalMs milliseconds after 'from'
   */
  next(_expr: string, from: Date): Date {
    return new Date(from.getTime() + this.intervalMs);
  }
}
