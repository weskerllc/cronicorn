import type { Context } from "hono";

import { DrizzleWebhookEventsRepo } from "@cronicorn/adapter-drizzle";

import { createSubscriptionsManager } from "../lib/create-subscriptions-manager.js";
import { logger } from "../lib/logger.js";
import { createRouter } from "../types.js";

/**
 * Stripe Webhook Handler
 *
 * SECURITY: This endpoint verifies webhook signatures before processing.
 * Raw body is required for signature verification.
 *
 * RELIABILITY: Uses database transactions and idempotency tracking to ensure:
 * - Atomic processing (all-or-nothing updates)
 * - No duplicate processing (prevents double-charging, duplicate subscriptions, etc.)
 */

const router = createRouter();

router.post("/webhooks/stripe", async (c: Context) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const db = c.get("db");
  const paymentProvider = c.get("paymentProvider");
  const webhookSecret = c.get("webhookSecret");
  const baseUrl = c.get("config").BASE_URL;

  try {
    // Get raw body as text (Hono's req.text() preserves the exact body)
    const body = await c.req.text();

    // Verify webhook signature (throws if invalid)
    const event = await paymentProvider.verifyWebhook(body, signature, webhookSecret);

    // Process webhook event within a transaction for atomicity and idempotency
    // eslint-disable-next-line ts/no-explicit-any
    await db.transaction(async (tx: any) => {
      // Create webhook events repository for idempotency tracking
      const webhookEventsRepo = new DrizzleWebhookEventsRepo(tx);

      // Check if we already processed this event (idempotency check)
      const alreadyProcessed = await webhookEventsRepo.hasBeenProcessed(event.id);

      if (alreadyProcessed) {
        logger.info({ eventId: event.id, eventType: event.type }, "Webhook event already processed (duplicate ignored)");
        return; // Return early - transaction will commit but no changes made
      }

      // Create subscriptions manager with transaction-bound repository
      const subscriptionsManager = createSubscriptionsManager(tx, paymentProvider, baseUrl);

      // Process the webhook event (all DB writes happen in this transaction)
      await subscriptionsManager.handleWebhookEvent(event);

      // Record that we successfully processed this event
      await webhookEventsRepo.recordProcessedEvent(event.id, event.type);

      logger.info({ eventId: event.id, eventType: event.type }, "Webhook event processed successfully");
    });

    // Return 200 OK to Stripe (transaction committed successfully)
    return c.json({ received: true }, 200);
  }
  catch (error) {
    // Signature verification failed or webhook processing error
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error({ error, errorMessage }, "Stripe webhook error");

    // Return 400 for signature verification failures (Stripe won't retry)
    if (error instanceof Error && error.message.includes("signature")) {
      return c.json({ error: "Invalid signature" }, 400);
    }

    // Return 500 for processing errors (Stripe will retry)
    // Transaction was rolled back, so no partial state was persisted
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default router;
