import {
  RefundAlreadyProcessedError,
  RefundConcurrencyError,
  RefundExpiredError,
  RefundNotEligibleError,
} from "@cronicorn/services";
import { HTTPException } from "hono/http-exception";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./subscriptions.routes.js";

import { getAuthContext } from "../../auth/middleware.js";

/**
 * Route Handlers for Subscription Management
 */

// ==================== POST /subscriptions/checkout ====================

export const handleCreateCheckout: AppRouteHandler<typeof routes.createCheckout> = async (c) => {
  const { userId } = getAuthContext(c);
  const body = c.req.valid("json");

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.createCheckout({
      userId,
      tier: body.tier,
    });
    return c.json(result, 200);
  }
  catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Failed to create checkout session",
    });
  }
};

// ==================== POST /subscriptions/portal ====================

export const handleCreatePortal: AppRouteHandler<typeof routes.createPortal> = async (c) => {
  const { userId } = getAuthContext(c);

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.createPortal({ userId });
    return c.json(result, 200);
  }
  catch (error) {
    if (error instanceof Error) {
      // User has no subscription - return 400
      if (error.message.includes("no active subscription")) {
        throw new HTTPException(400, { message: error.message });
      }

      throw new HTTPException(500, { message: error.message });
    }

    throw new HTTPException(500, {
      message: "Failed to create portal session",
    });
  }
};

// ==================== GET /subscriptions/status ====================

export const handleGetStatus: AppRouteHandler<typeof routes.getStatus> = async (c) => {
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
};

// ==================== GET /subscriptions/usage ====================

export const handleGetUsage: AppRouteHandler<typeof routes.getUsage> = async (c) => {
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      // Calculate start of current month (UTC)
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      // Get usage data via JobsRepo
      const usage = await manager.getUsage(userId, startOfMonth);

      return c.json(usage, 200);
    }
    catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, {
        message: error instanceof Error ? error.message : "Failed to get usage data",
      });
    }
  });
};

// ==================== POST /subscriptions/refund ====================

export const handleRequestRefund: AppRouteHandler<typeof routes.requestRefund> = async (c) => {
  const { userId } = getAuthContext(c);
  const body = c.req.valid("json");

  const subscriptionsManager = c.get("subscriptionsManager");

  try {
    const result = await subscriptionsManager.requestRefund({
      userId,
      reason: body.reason,
    });
    return c.json(result, 200);
  }
  catch (error) {
    // Business rule violations - return 400
    if (
      error instanceof RefundNotEligibleError
      || error instanceof RefundExpiredError
      || error instanceof RefundAlreadyProcessedError
      || error instanceof RefundConcurrencyError
    ) {
      throw new HTTPException(400, { message: error.message });
    }

    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Failed to process refund",
    });
  }
};
