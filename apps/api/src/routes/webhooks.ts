import type { Context } from "hono";

import { logger } from "../lib/logger.js";
import { createRouter } from "../types.js";

/**
 * Stripe Webhook Handler
 *
 * SECURITY: This endpoint verifies webhook signatures before processing.
 * Raw body is required for signature verification.
 */

const router = createRouter();

router.post("/webhooks/stripe", async (c: Context) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const subscriptionsManager = c.get("subscriptionsManager");
  const paymentProvider = c.get("paymentProvider");
  const webhookSecret = c.get("webhookSecret");

  try {
    // Get raw body as text (Hono's req.text() preserves the exact body)
    const body = await c.req.text();

    // Verify webhook signature (throws if invalid)
    const event = await paymentProvider.verifyWebhook(body, signature, webhookSecret);

    // Process webhook event
    await subscriptionsManager.handleWebhookEvent(event);

    return c.json({ received: true }, 200);
  }
  catch (error) {
    // Signature verification failed or webhook processing error
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error({ error, errorMessage }, "Stripe webhook error");

    // Return 400 for signature verification failures (so Stripe retries)
    if (error instanceof Error && error.message.includes("signature")) {
      return c.json({ error: "Invalid signature" }, 400);
    }

    // Return 500 for processing errors (so Stripe retries)
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default router;
