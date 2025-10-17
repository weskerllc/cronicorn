import { createRoute, z } from "@hono/zod-openapi";

/**
 * API Route Definitions for Subscription Management
 */

const ErrorSchema = z.object({
  error: z.string(),
});

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
          schema: z.object({
            tier: z.enum(["pro", "enterprise"]).openapi({
              description: "Subscription tier to purchase",
              example: "pro",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Checkout session created successfully",
      content: {
        "application/json": {
          schema: z.object({
            checkoutUrl: z.string().url().openapi({
              description: "Stripe Checkout URL to redirect user to",
              example: "https://checkout.stripe.com/c/pay/cs_test_...",
            }),
          }),
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
          schema: z.object({}), // No body required
        },
      },
    },
  },
  responses: {
    200: {
      description: "Portal session created successfully",
      content: {
        "application/json": {
          schema: z.object({
            portalUrl: z.string().url().openapi({
              description: "Stripe Customer Portal URL to redirect user to",
              example: "https://billing.stripe.com/session/...",
            }),
          }),
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
          schema: z.object({
            tier: z.enum(["free", "pro", "enterprise"]).openapi({
              description: "Current subscription tier",
              example: "pro",
            }),
            status: z.string().nullable().openapi({
              description: "Stripe subscription status (active, past_due, canceled, etc.)",
              example: "active",
            }),
            endsAt: z.string().nullable().openapi({
              description: "Subscription end date (ISO 8601)",
              example: "2025-11-16T00:00:00Z",
            }),
          }),
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
