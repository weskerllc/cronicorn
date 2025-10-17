import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { getAuthContext } from "../../auth/middleware.js";

/**
 * Route Handlers for Subscription Management
 * Note: These use regular Hono routes, not OpenAPI routes
 */

// Request validation schemas
const CheckoutSchema = z.object({
  tier: z.enum(["pro", "enterprise"]),
});

// ==================== POST /subscriptions/checkout ====================

export async function handleCreateCheckout(c: Context) {
  const { userId } = getAuthContext(c);

  // Parse and validate request body
  const body = await c.req.json();
  const parsed = CheckoutSchema.safeParse(body);

  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid request body" });
  }

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.createCheckout({
      userId,
      tier: parsed.data.tier,
    });
    return c.json(result, 200);
  }
  catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Failed to create checkout session",
    });
  }
}

// ==================== POST /subscriptions/portal ====================

export async function handleCreatePortal(c: Context) {
  const { userId } = getAuthContext(c);

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.createPortal({ userId });
    return c.json(result, 200);
  }
  catch (error) {
    // User has no subscription - return 400
    if (error instanceof Error && error.message.includes("no active subscription")) {
      throw new HTTPException(400, { message: error.message });
    }

    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Failed to create portal session",
    });
  }
}

// ==================== GET /subscriptions/status ====================

export async function handleGetStatus(c: Context) {
  const { userId } = getAuthContext(c);

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.getSubscriptionStatus(userId);
    return c.json(result, 200);
  }
  catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Failed to get subscription status",
    });
  }
}
