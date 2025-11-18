import type { PaymentProvider } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { DrizzleJobsRepo, DrizzleWebhookEventsRepo } from "@cronicorn/adapter-drizzle";
import { SubscriptionsManager } from "@cronicorn/services";

/**
 * Composition root: Wires concrete adapters into SubscriptionsManager.
 *
 * @param tx - Drizzle transaction context
 * @param paymentProvider - Payment provider implementation (e.g., Stripe)
 * @param baseUrl - Application base URL for redirects
 * @returns Fully-wired SubscriptionsManager instance
 */
export function createSubscriptionsManager(
  // eslint-disable-next-line ts/no-explicit-any
  tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  paymentProvider: PaymentProvider,
  baseUrl: string,
): SubscriptionsManager {
  // Instantiate transaction-bound repositories
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const jobsRepo = new DrizzleJobsRepo(tx);
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const webhookEventsRepo = new DrizzleWebhookEventsRepo(tx);

  // Wire everything into the manager (pure DI - no adapter-specific dependencies)
  return new SubscriptionsManager({
    jobsRepo,
    paymentProvider,
    webhookEventsRepo,
    baseUrl,
  });
}
