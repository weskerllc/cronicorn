/**
 * Planning source attribution.
 * Indicates which rule selected the next run time.
 */
export type PlanSource =
  | "paused"
  | "ai-oneshot"
  | "ai-interval"
  | "baseline-cron"
  | "baseline-interval"
  | "clamped-min"
  | "clamped-max";

/**
 * Result of planning the next run.
 */
export type PlanResult = {
  nextRunAt: Date;
  source: PlanSource;
};
