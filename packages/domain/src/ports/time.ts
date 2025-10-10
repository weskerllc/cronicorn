/**
 * Time-related ports for deterministic testing.
 */

export type Clock = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
};

export type Cron = {
  next: (expr: string, from: Date) => Date;
};
