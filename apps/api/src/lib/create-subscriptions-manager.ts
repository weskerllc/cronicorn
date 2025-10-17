import type { StripePaymentProvider } from "@cronicorn/adapter-stripe";
import type { PaymentProvider } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { DrizzleJobsRepo } from "@cronicorn/adapter-drizzle";
import { SubscriptionsManager } from "@cronicorn/services";

/**
 * Composition root: Wires concrete adapters into SubscriptionsManager.
 *
 * @param tx - Drizzle transaction context
 * @param paymentProvider - Payment provider implementation (Stripe)
 * @param stripeProvider - StripePaymentProvider for getTierFromPriceId
 * @param baseUrl - Application base URL for redirects
 * @returns Fully-wired SubscriptionsManager instance
 */
export function createSubscriptionsManager(
  // eslint-disable-next-line ts/no-explicit-any
  tx: NodePgDatabase<any> | NodePgTransaction<any, any>,
  paymentProvider: PaymentProvider,
  stripeProvider: StripePaymentProvider,
  baseUrl: string,
): SubscriptionsManager {
  // Instantiate transaction-bound repository
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const jobsRepo = new DrizzleJobsRepo(tx);

  // Wire everything into the manager
  return new SubscriptionsManager(
    {
      jobsRepo,
      paymentProvider,
      baseUrl,
    },
    stripeProvider,
  );
}
