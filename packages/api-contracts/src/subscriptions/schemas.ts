import { z } from "@hono/zod-openapi";

// ==================== Subscription Schemas ====================

export const CreateCheckoutRequestSchema = z.object({
    tier: z.enum(["pro", "enterprise"]).openapi({
        description: "Subscription tier to purchase",
        example: "pro",
    }),
});

export const CreateCheckoutResponseSchema = z.object({
    checkoutUrl: z.string().url().openapi({
        description: "Stripe Checkout URL to redirect user to",
        example: "https://checkout.stripe.com/c/pay/cs_test_...",
    }),
});

export const CreatePortalRequestSchema = z.object({});

export const CreatePortalResponseSchema = z.object({
    portalUrl: z.string().url().openapi({
        description: "Stripe Customer Portal URL to redirect user to",
        example: "https://billing.stripe.com/session/...",
    }),
});

export const SubscriptionStatusResponseSchema = z.object({
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
});

export const UsageResponseSchema = z.object({
    aiCallsUsed: z.number().int().openapi({
        description: "Total AI tokens consumed this month",
        example: 45000,
    }),
    aiCallsLimit: z.number().int().openapi({
        description: "Monthly AI token limit for current tier",
        example: 100000,
    }),
    endpointsUsed: z.number().int().openapi({
        description: "Total number of endpoints created",
        example: 5,
    }),
    endpointsLimit: z.number().int().openapi({
        description: "Maximum endpoints allowed for current tier",
        example: 10,
    }),
});

export const ErrorSchema = z.object({
    error: z.string(),
});
