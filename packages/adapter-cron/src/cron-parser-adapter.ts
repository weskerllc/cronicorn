import type { Cron } from "@cronicorn/domain";

import { CronError } from "@cronicorn/domain";
import cronParser from "cron-parser";

const { parseExpression } = cronParser;

/**
 * Production Cron adapter using cron-parser library.
 *
 * Calculates the next run time for cron expressions in UTC timezone.
 * Throws CronError for invalid cron expressions.
 */
export class CronParserAdapter implements Cron {
  /**
   * Calculate the next occurrence of a cron expression after a given date.
   *
   * @param expr - Standard 5-field cron expression (minute hour day month weekday)
   * @param from - Date to calculate next occurrence from
   * @returns Next scheduled date according to the cron expression
   * @throws CronError if the cron expression is invalid
   *
   * @example
   * const cron = new CronParserAdapter();
   * const next = cron.next("0 * * * *", new Date("2025-01-01T00:00:00Z"));
   * // Returns: 2025-01-01T01:00:00.000Z
   */
  next(expr: string, from: Date): Date {
    try {
      // Parse with UTC timezone and use 'from' as current date
      const interval = parseExpression(expr, {
        currentDate: from,
        utc: true,
      });

      // Get next occurrence
      const nextDate = interval.next().toDate();

      return nextDate;
    }
    catch (error) {
      // Convert parser errors to domain CronError
      const message = error instanceof Error ? error.message : String(error);
      throw new CronError(`Invalid cron expression "${expr}": ${message}`);
    }
  }
}
