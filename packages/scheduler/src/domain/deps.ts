import type { Clock, Cron, Dispatcher, JobsRepo, RunsRepo } from "@cronicorn/domain";

export type SchedulerDeps = {
    clock: Clock;
    cron: Cron;
    dispatcher: Dispatcher;
    jobs: JobsRepo;
    runs: RunsRepo;
};
