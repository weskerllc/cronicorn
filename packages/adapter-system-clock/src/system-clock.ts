import type { Clock } from "@cronicorn/domain";

/**
 * Production system clock implementation.
 *
 * Wraps Node.js built-in time functions for production use.
 * For deterministic testing, use FakeClock instead.
 */
export class SystemClock implements Clock {
  /**
   * Returns the current system time.
   */
  now(): Date {
    return new Date();
  }

  /**
   * Sleeps for the specified number of milliseconds.
   * Uses setTimeout under the hood.
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
