import type { Clock, Cron } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { DrizzleJobsRepo, DrizzleRunsRepo } from "@cronicorn/adapter-drizzle";
import { JobsManager } from "@cronicorn/services/jobs";

/**
 * Composition root: Wires concrete adapters into JobsManager.
 *
 * This factory function is the ONLY place that knows about concrete implementations.
 * The service layer (JobsManager) only depends on ports (interfaces).
 *
 * **Architecture**:
 * - Creates transaction-bound repositories (DrizzleJobsRepo, DrizzleRunsRepo)
 * - Injects stateless singletons (Clock, Cron)
 * - Returns fully-wired JobsManager instance
 *
 * **Usage** (in route handlers):
 * ```typescript
 * return db.transaction(async (tx) => {
 *   const manager = createJobsManager(tx, clock, cron, encryptionSecret);
 *   const job = await manager.createJob(userId, input);
 *   return c.json(job);
 * });
 * ```
 *
 * @param tx - Drizzle transaction context
 * @param clock - Clock implementation (singleton, stateless)
 * @param cron - Cron parser implementation (singleton, stateless)
 * @param encryptionSecret - Secret for encrypting sensitive headers (optional)
 * @returns Fully-wired JobsManager instance
 */
export function createJobsManager(
  // eslint-disable-next-line ts/no-explicit-any
  tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  clock: Clock,
  cron: Cron,
  encryptionSecret?: string,
): JobsManager {
  // Instantiate transaction-bound repositories
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const jobsRepo = new DrizzleJobsRepo(tx, clock.now, encryptionSecret);
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const runsRepo = new DrizzleRunsRepo(tx);

  // Wire everything into the manager (pure DI)
  return new JobsManager(jobsRepo, runsRepo, clock, cron);
}
