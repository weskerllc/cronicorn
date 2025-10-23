import type { Clock } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { DrizzleJobsRepo, DrizzleRunsRepo } from "@cronicorn/adapter-drizzle";
import { DashboardManager } from "@cronicorn/services";

/**
 * Composition root: Wires concrete adapters into DashboardManager.
 *
 * This factory function is the ONLY place that knows about concrete implementations.
 * The service layer (DashboardManager) only depends on ports (interfaces).
 *
 * **Architecture**:
 * - Creates transaction-bound repositories (DrizzleJobsRepo, DrizzleRunsRepo)
 * - Injects stateless Clock singleton
 * - Returns fully-wired DashboardManager instance
 *
 * **Usage** (in route handlers):
 * ```typescript
 * return db.transaction(async (tx) => {
 *   const manager = createDashboardManager(tx, clock);
 *   const stats = await manager.getDashboardStats(userId, { days: 7 });
 *   return c.json(mapDashboardStatsToResponse(stats));
 * });
 * ```
 *
 * @param tx - Drizzle transaction context
 * @param clock - Clock implementation (singleton, stateless)
 * @returns Fully-wired DashboardManager instance
 */
export function createDashboardManager(
  // eslint-disable-next-line ts/no-explicit-any
  tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  clock: Clock,
): DashboardManager {
  // Instantiate transaction-bound repositories
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const jobsRepo = new DrizzleJobsRepo(tx);
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const runsRepo = new DrizzleRunsRepo(tx);

  // Wire everything into the manager (pure DI)
  return new DashboardManager(jobsRepo, runsRepo, clock);
}
