import {
  CreateCheckoutRequestSchema,
  CreateCheckoutResponseSchema,
  CreatePortalRequestSchema,
  CreatePortalResponseSchema,
  ErrorSchema,
  SubscriptionStatusResponseSchema,
  UsageResponseSchema,
} from "@cronicorn/api-contracts/subscriptions";
import { createRoute } from "@hono/zod-openapi";

/**
 * API Route Definitions for Subscription Management
 */

// ==================== POST /subscriptions/checkout ====================

export const createCheckout = createRoute({
  method: "post",
  path: "/subscriptions/checkout",
  tags: ["subscriptions"],
  summary: "Create Stripe Checkout Session",
  description: "Create a Stripe Checkout Session for subscribing to Pro or Enterprise tier",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateCheckoutRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Checkout session created successfully",
      content: {
        "application/json": {
          schema: CreateCheckoutResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
});

// ==================== POST /subscriptions/portal ====================

export const createPortal = createRoute({
  method: "post",
  path: "/subscriptions/portal",
  tags: ["subscriptions"],
  summary: "Create Customer Portal Session",
  description: "Create a Stripe Customer Portal session for managing subscription, payment methods, and invoices",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreatePortalRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Portal session created successfully",
      content: {
        "application/json": {
          schema: CreatePortalResponseSchema,
        },
      },
    },
    400: {
      description: "User has no active subscription",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
});

// ==================== GET /subscriptions/status ====================

export const getStatus = createRoute({
  method: "get",
  path: "/subscriptions/status",
  tags: ["subscriptions"],
  summary: "Get Subscription Status",
  description: "Get current subscription status for authenticated user",
  responses: {
    200: {
      description: "Subscription status retrieved successfully",
      content: {
        "application/json": {
          schema: SubscriptionStatusResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
});

// ==================== GET /subscriptions/usage ====================

export const getUsage = createRoute({
  method: "get",
  path: "/subscriptions/usage",
  tags: ["subscriptions"],
  summary: "Get Usage and Quota",
  description: "Get current usage vs quota limits for AI calls and endpoints",
  responses: {
    200: {
      description: "Usage data retrieved successfully",
      content: {
        "application/json": {
          schema: UsageResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
});
