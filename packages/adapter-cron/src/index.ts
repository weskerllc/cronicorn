/**
 * @cronicorn/adapter-cron - Cron expression parser adapter
 *
 * Implements the Cron port from @cronicorn/domain using the cron-parser library.
 */

export { CronParserAdapter } from "./cron-parser-adapter.js";
export { FakeCron } from "./fake-cron.js";

// Re-export Cron type for convenience
export type { Cron } from "@cronicorn/domain";
