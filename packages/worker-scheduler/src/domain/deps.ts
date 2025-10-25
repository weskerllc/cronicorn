import type { Clock, Cron, Dispatcher, JobsRepo, Logger, RunsRepo } from "@cronicorn/domain";

export type SchedulerDeps = {
  clock: Clock;
  cron: Cron;
  dispatcher: Dispatcher;
  jobs: JobsRepo;
  logger: Logger;
  runs: RunsRepo;
};
