# Stripe Integration Implementation Plan

**Date:** 2025-01-16  
**Status:** Planning  
**Context:** Add Stripe subscription management to enable users to upgrade from free → pro → enterprise tiers

---

## 1. Overview

### Goal
Enable users to subscribe to paid tiers (pro/enterprise) using Stripe, with automatic tier updates based on subscription lifecycle events.

### Architecture Approach
Following hexagonal/clean architecture patterns:
- **Domain**: Pure subscription logic and ports
- **Adapter**: Stripe SDK wrapper (adapter-stripe package)
- **Service**: Business logic for subscription management
- **API**: HTTP endpoints for checkout, portal, webhooks

### Key Design Principles
1. **Webhook-driven state**: Stripe webhooks are source of truth for subscription state
2. **Idempotent operations**: All webhook handlers must be safe to retry
3. **Minimal dependencies**: Reuse existing user table, avoid separate subscriptions table (YAGNI)
4. **Security first**: Webhook signature verification is non-negotiable

---

## 2. Database Schema Changes

### Migration: `0004_add_stripe_fields.sql`

Add Stripe-related fields to existing `user` table:

```sql
ALTER TABLE "user" 
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "subscription_status" TEXT, -- 'active', 'trialing', 'canceled', 'past_due', etc.
  ADD COLUMN "subscription_ends_at" TIMESTAMP;

-- Index for webhook lookups
CREATE INDEX idx_user_stripe_customer ON "user"("stripe_customer_id");
CREATE INDEX idx_user_stripe_subscription ON "user"("stripe_subscription_id");
```

**Rationale:**
- All fields nullable (existing users have no Stripe data)
- `tier` field already exists from ADR 0021
- Denormalized design: One user = one subscription max (MVP simplification)
- `subscription_ends_at` handles grace periods (user cancels but keeps access until billing period ends)

### Drizzle Schema Update

```typescript
// packages/adapter-drizzle/src/schema.ts
export const user = pgTable("user", {
  // ...existing fields...
  tier: text("tier").notNull().default("free"),
  
  // Stripe fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
  subscriptionEndsAt: timestamp("subscription_ends_at", { mode: "date" }),
});
```

---

## 3. Architecture Design

### 3.1 Domain Layer (`packages/domain`)

**New Port: `PaymentProvider`** (`src/ports/external.ts`)

```typescript
export type CheckoutSessionParams = {
  userId: string;
  userEmail: string;
  tier: "pro" | "enterprise";
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSessionResult = {
  sessionId: string;
  checkoutUrl: string;
};

export type PortalSessionParams = {
  customerId: string;
  returnUrl: string;
};

export type PortalSessionResult = {
  sessionId: string;
  portalUrl: string;
};

export type WebhookEvent = {
  id: string;
  type: string;
  data: unknown;
};

export type PaymentProvider = {
  /**
   * Create Stripe Checkout Session for subscription.
   */
  createCheckoutSession: (params: CheckoutSessionParams) => Promise<CheckoutSessionResult>;

  /**
   * Create Customer Portal Session for self-service.
   */
  createPortalSession: (params: PortalSessionParams) => Promise<PortalSessionResult>;

  /**
   * Verify webhook signature and parse event.
   * Throws if signature invalid.
   */
  verifyWebhook: (payload: string, signature: string, secret: string) => Promise<WebhookEvent>;
};
```

**Updated Port: `JobsRepo`** (`src/ports/repos.ts`)

```typescript
// Add to JobsRepo interface
export type JobsRepo = {
  // ...existing methods...
  
  /**
   * Update user's subscription details (called by webhook handler).
   */
  updateUserSubscription: (userId: string, patch: {
    tier?: "free" | "pro" | "enterprise";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date | null;
  }) => Promise<void>;

  /**
   * Get user by Stripe customer ID (for webhook lookups).
   */
  getUserByStripeCustomerId: (customerId: string) => Promise<{ id: string; email: string } | null>;
};
```

---

### 3.2 Adapter Layer

**New Package: `packages/adapter-stripe`**

```
packages/adapter-stripe/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── stripe-client.ts        # Implements PaymentProvider
│   └── __tests__/
│       └── stripe-client.test.ts
```

**`stripe-client.ts`** - Core implementation:

```typescript
import Stripe from "stripe";
import type { PaymentProvider } from "@cronicorn/domain";

export type StripeConfig = {
  secretKey: string;
  proPriceId: string;
  enterprisePriceId: string;
};

export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;
  private priceMap: Record<"pro" | "enterprise", string>;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2023-10-16", // Pin API version
    });
    this.priceMap = {
      pro: config.proPriceId,
      enterprise: config.enterprisePriceId,
    };
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: this.priceMap[params.tier],
          quantity: 1,
        },
      ],
      customer_email: params.userEmail,
      metadata: {
        userId: params.userId,
        tier: params.tier,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
    };
  }

  async createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return {
      sessionId: session.id,
      portalUrl: session.url,
    };
  }

  async verifyWebhook(payload: string, signature: string, secret: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    
    return {
      id: event.id,
      type: event.type,
      data: event.data.object,
    };
  }

  /**
   * Helper: Map Stripe price ID back to tier (for webhook handlers).
   */
  getTierFromPriceId(priceId: string): "pro" | "enterprise" | null {
    if (priceId === this.priceMap.pro) return "pro";
    if (priceId === this.priceMap.enterprise) return "enterprise";
    return null;
  }
}
```

**`package.json`**:

```json
{
  "name": "@cronicorn/adapter-stripe",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@cronicorn/domain": "workspace:*",
    "stripe": "^14.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.0"
  }
}
```

---

### 3.3 Service Layer

**New Package: `packages/services/src/subscriptions/`**

```
packages/services/src/subscriptions/
├── manager.ts          # Business logic
├── types.ts            # Input/output types
└── __tests__/
    └── manager.test.ts
```

**`manager.ts`**:

```typescript
import type { JobsRepo, PaymentProvider } from "@cronicorn/domain";

export type SubscriptionDeps = {
  jobsRepo: JobsRepo;
  paymentProvider: PaymentProvider;
  baseUrl: string;
};

export type CreateCheckoutInput = {
  userId: string;
  tier: "pro" | "enterprise";
};

export type CreatePortalInput = {
  userId: string;
};

export type SubscriptionStatus = {
  tier: "free" | "pro" | "enterprise";
  status: string | null;
  endsAt: Date | null;
};

export class SubscriptionsManager {
  constructor(private deps: SubscriptionDeps) {}

  /**
   * Create Stripe Checkout Session for user to subscribe.
   */
  async createCheckout(input: CreateCheckoutInput): Promise<{ checkoutUrl: string }> {
    const { userId, tier } = input;

    // Get user details
    const user = await this.getUserOrThrow(userId);

    // Create checkout session
    const result = await this.deps.paymentProvider.createCheckoutSession({
      userId,
      userEmail: user.email,
      tier,
      successUrl: `${this.deps.baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.deps.baseUrl}/pricing`,
    });

    return { checkoutUrl: result.checkoutUrl };
  }

  /**
   * Create Customer Portal Session for self-service.
   */
  async createPortal(input: CreatePortalInput): Promise<{ portalUrl: string }> {
    const { userId } = input;

    // Get user with Stripe customer ID
    const user = await this.getUserOrThrow(userId);
    
    if (!user.stripeCustomerId) {
      throw new Error("User has no active subscription");
    }

    const result = await this.deps.paymentProvider.createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${this.deps.baseUrl}/settings`,
    });

    return { portalUrl: result.portalUrl };
  }

  /**
   * Handle webhook event from Stripe.
   * This is called after signature verification.
   */
  async handleWebhookEvent(event: { type: string; data: any }): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data);
        break;
      
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data);
        break;
      
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data);
        break;
      
      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(event.data);
        break;
      
      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data);
        break;

      default:
        // Ignore unhandled events
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * User completed checkout - create/update subscription.
   */
  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as "pro" | "enterprise";
    
    if (!userId || !tier) {
      throw new Error("Missing userId or tier in checkout session metadata");
    }

    await this.deps.jobsRepo.updateUserSubscription(userId, {
      tier,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStatus: "active",
      subscriptionEndsAt: null, // Will be set by subscription events
    });
  }

  /**
   * Subscription updated (tier change, renewal, etc.)
   */
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(subscription.customer);
    
    if (!user) {
      console.warn(`No user found for Stripe customer: ${subscription.customer}`);
      return;
    }

    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = this.getTierFromPrice(priceId);

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      tier: tier || undefined,
      subscriptionStatus: subscription.status,
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    });
  }

  /**
   * Subscription canceled/deleted.
   */
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(subscription.customer);
    
    if (!user) return;

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      tier: "free",
      subscriptionStatus: "canceled",
      subscriptionEndsAt: null,
    });
  }

  /**
   * Payment succeeded - ensure active status.
   */
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(invoice.customer);
    
    if (!user) return;

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      subscriptionStatus: "active",
    });
  }

  /**
   * Payment failed - mark as past_due.
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(invoice.customer);
    
    if (!user) return;

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      subscriptionStatus: "past_due",
    });
  }

  /**
   * Helper: Get user or throw error.
   */
  private async getUserOrThrow(userId: string): Promise<any> {
    // TODO: Implement getUserById in JobsRepo
    throw new Error("Not implemented: getUserById");
  }

  /**
   * Helper: Map Stripe price ID to tier.
   */
  private getTierFromPrice(priceId: string): "pro" | "enterprise" | null {
    // This requires access to StripePaymentProvider.getTierFromPriceId
    // Could store this in a shared config or pass through adapter
    // For now, placeholder
    return null;
  }
}
```

---

### 3.4 API Layer (`apps/api`)

**New Routes: `src/routes/subscriptions.ts`**

```typescript
import { Hono } from "hono";
import type { SubscriptionsManager } from "@cronicorn/services";

export function createSubscriptionsRoutes(manager: SubscriptionsManager) {
  const app = new Hono();

  /**
   * POST /subscriptions/checkout
   * Create Stripe Checkout Session
   */
  app.post("/checkout", async (c) => {
    const userId = c.get("userId"); // From auth middleware
    const { tier } = await c.req.json();

    if (!["pro", "enterprise"].includes(tier)) {
      return c.json({ error: "Invalid tier" }, 400);
    }

    const result = await manager.createCheckout({ userId, tier });
    return c.json(result);
  });

  /**
   * POST /subscriptions/portal
   * Create Customer Portal Session
   */
  app.post("/portal", async (c) => {
    const userId = c.get("userId");

    const result = await manager.createPortal({ userId });
    return c.json(result);
  });

  /**
   * GET /subscriptions/status
   * Get current subscription status
   */
  app.get("/status", async (c) => {
    const userId = c.get("userId");

    // TODO: Implement getSubscriptionStatus in manager
    return c.json({ tier: "free", status: null, endsAt: null });
  });

  return app;
}
```

**New Routes: `src/routes/webhooks.ts`**

```typescript
import { Hono } from "hono";
import type { SubscriptionsManager, PaymentProvider } from "@cronicorn/services";

export function createWebhookRoutes(
  manager: SubscriptionsManager,
  paymentProvider: PaymentProvider,
  webhookSecret: string
) {
  const app = new Hono();

  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   */
  app.post("/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");
    const payload = await c.req.text(); // Raw body required for signature verification

    if (!signature) {
      return c.json({ error: "Missing signature" }, 401);
    }

    try {
      // Verify webhook signature
      const event = await paymentProvider.verifyWebhook(payload, signature, webhookSecret);

      // Handle event
      await manager.handleWebhookEvent(event);

      return c.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return c.json({ error: "Webhook verification failed" }, 401);
    }
  });

  return app;
}
```

---

## 4. Environment Variables

**Required Configuration:**

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...          # Test: sk_test_... | Live: sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # From webhook endpoint setup

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_PRO=price_...             # Monthly pro subscription
STRIPE_PRICE_ENTERPRISE=price_...      # Monthly enterprise subscription

# Application URLs
BASE_URL=https://app.example.com       # For checkout success/cancel URLs
```

**Stripe Setup Steps:**
1. Create Products in Stripe Dashboard:
   - "Pro Plan" → Add monthly price → Copy price ID
   - "Enterprise Plan" → Add monthly price → Copy price ID
2. Create Webhook Endpoint:
   - URL: `https://api.example.com/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook signing secret

---

## 5. Testing Strategy

### 5.1 Unit Tests (Mock Stripe SDK)

```typescript
// packages/adapter-stripe/src/__tests__/stripe-client.test.ts
import { describe, it, expect, vi } from "vitest";
import { StripePaymentProvider } from "../stripe-client";

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/...",
        }),
      },
    },
  })),
}));

describe("StripePaymentProvider", () => {
  it("creates checkout session with correct parameters", async () => {
    const provider = new StripePaymentProvider({
      secretKey: "sk_test_123",
      proPriceId: "price_pro",
      enterprisePriceId: "price_ent",
    });

    const result = await provider.createCheckoutSession({
      userId: "user_1",
      userEmail: "test@example.com",
      tier: "pro",
      successUrl: "https://app.com/success",
      cancelUrl: "https://app.com/cancel",
    });

    expect(result.sessionId).toBe("cs_test_123");
    expect(result.checkoutUrl).toContain("checkout.stripe.com");
  });
});
```

### 5.2 Integration Tests (Stripe Test Mode)

```typescript
// packages/services/src/subscriptions/__tests__/manager.test.ts
import { describe, it, expect } from "vitest";
import { SubscriptionsManager } from "../manager";

describe("SubscriptionsManager - Webhooks", () => {
  it("handles checkout.session.completed event", async () => {
    const mockJobsRepo = {
      updateUserSubscription: vi.fn(),
      getUserByStripeCustomerId: vi.fn(),
    };

    const manager = new SubscriptionsManager({
      jobsRepo: mockJobsRepo,
      paymentProvider: mockPaymentProvider,
      baseUrl: "https://app.com",
    });

    await manager.handleWebhookEvent({
      type: "checkout.session.completed",
      data: {
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { userId: "user_1", tier: "pro" },
      },
    });

    expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_1", {
      tier: "pro",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
      subscriptionEndsAt: null,
    });
  });
});
```

### 5.3 Local Webhook Testing (Stripe CLI)

```bash
# 1. Login to Stripe CLI
stripe login

# 2. Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# 3. Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed

# 4. View webhook logs
stripe logs tail
```

---

## 6. Implementation Checklist

### Phase 1: Database & Schema (1 day)
- [ ] Create migration `0004_add_stripe_fields.sql`
- [ ] Update Drizzle schema with Stripe fields
- [ ] Add `updateUserSubscription()` to JobsRepo port
- [ ] Add `getUserByStripeCustomerId()` to JobsRepo port
- [ ] Implement in DrizzleJobsRepo
- [ ] Run migration on dev database

### Phase 2: Stripe Adapter (1 day)
- [ ] Create `packages/adapter-stripe` package
- [ ] Install `stripe` npm package
- [ ] Implement `StripePaymentProvider` class
- [ ] Write unit tests (mock Stripe SDK)
- [ ] Export from index.ts

### Phase 3: Service Layer (1 day)
- [ ] Create `packages/services/src/subscriptions/`
- [ ] Implement `SubscriptionsManager` class
- [ ] Add `createCheckout()` method
- [ ] Add `createPortal()` method
- [ ] Add `handleWebhookEvent()` method
- [ ] Implement all webhook event handlers
- [ ] Write unit tests with mocked dependencies

### Phase 4: API Routes (1 day)
- [ ] Create `apps/api/src/routes/subscriptions.ts`
- [ ] Implement checkout endpoint (POST /subscriptions/checkout)
- [ ] Implement portal endpoint (POST /subscriptions/portal)
- [ ] Implement status endpoint (GET /subscriptions/status)
- [ ] Create `apps/api/src/routes/webhooks.ts`
- [ ] Implement webhook endpoint (POST /webhooks/stripe)
- [ ] Add routes to main API app
- [ ] Add auth middleware to subscription routes

### Phase 5: Composition Root (0.5 days)
- [ ] Add Stripe env vars to `.env.example`
- [ ] Wire StripePaymentProvider in API composition root
- [ ] Wire SubscriptionsManager in API composition root
- [ ] Test local webhook forwarding with Stripe CLI

### Phase 6: Testing & Validation (1 day)
- [ ] Manual test: Create checkout session
- [ ] Manual test: Complete payment with test card (4242 4242 4242 4242)
- [ ] Manual test: Verify tier updated in database
- [ ] Manual test: Access customer portal
- [ ] Manual test: Cancel subscription via portal
- [ ] Manual test: Verify tier downgraded to free
- [ ] Integration test: Trigger webhook events with Stripe CLI
- [ ] Verify idempotency (send same webhook twice)
- [ ] Test invalid webhook signature rejection

### Phase 7: Documentation (0.5 days)
- [ ] Create ADR documenting Stripe integration decisions
- [ ] Update API documentation with new endpoints
- [ ] Document Stripe Dashboard setup steps
- [ ] Document webhook configuration
- [ ] Add to tech debt log (known limitations)
- [ ] Update README with subscription features

**Total Estimated Time: 5-6 days**

---

## 7. Security Considerations

### Critical Security Requirements

1. **Webhook Signature Verification (MANDATORY)**
   - MUST verify `stripe-signature` header on every webhook
   - Use `stripe.webhooks.constructEvent()` with raw body
   - Reject invalid signatures with 401
   - Without this, attackers can fake tier upgrades

2. **Authentication on API Endpoints**
   - All `/subscriptions/*` routes require authenticated user
   - Get `userId` from session/JWT, never from request body
   - User can only manage their own subscription

3. **Authorization Checks**
   - Verify userId in webhook metadata matches subscription
   - Prevent user A from accessing user B's portal

4. **HTTPS Requirement**
   - Stripe webhooks MUST be delivered over HTTPS in production
   - Use Stripe CLI forward for local dev (it handles HTTPS tunnel)

5. **Rate Limiting**
   - Limit checkout session creation (5/min per user)
   - Webhook endpoint should have higher limit (Stripe retries)

6. **Raw Request Body for Webhooks**
   - Do NOT parse webhook body before signature verification
   - Access raw string body: `await c.req.text()`
   - Parse after verification succeeds

---

## 8. Known Limitations & Future Enhancements

### MVP Limitations (Acceptable)

1. **No annual billing**: Only monthly subscriptions
2. **No coupon codes**: No discount support
3. **No usage-based billing**: Fixed tier pricing
4. **No trial periods**: Immediate payment required
5. **No invoice emails**: User must check portal
6. **No subscription pause**: Cancel = immediate downgrade

### Future Enhancements (Post-MVP)

1. **Annual billing option** - Stripe supports annual subscriptions
2. **Coupon codes** - `promotion_code` in checkout session
3. **Usage-based billing** - Report API calls to Stripe Metering API
4. **Free trials** - `trial_period_days` in subscription
5. **Email notifications** - Send custom emails on tier changes
6. **Subscription pause** - Allow temporary suspension
7. **Prorated upgrades/downgrades** - Automatic credit handling
8. **Team subscriptions** - Multi-user access per subscription
9. **Invoice history API** - Expose via our API (fetch from Stripe)
10. **Admin dashboard** - View all subscriptions, force tier changes

### Tech Debt to Log

1. **No idempotency table**: Relying on idempotent SQL updates (SET tier = X)
   - Risk: Duplicate webhook processing might cause issues
   - Mitigation: Could add `webhook_events` table to track processed events
   
2. **Price ID → Tier mapping hardcoded**: In StripePaymentProvider
   - Risk: Must update code if price IDs change
   - Mitigation: Could move to database config table
   
3. **No getUserById in JobsRepo**: Temporary gap in port
   - Fix: Add method or use auth service

4. **Subscription status enum not enforced**: Just text field
   - Risk: Typos could cause bugs
   - Mitigation: Consider enum type in Postgres

---

## 9. Rollout Plan

### Pre-Deployment

1. Create Stripe products/prices in Dashboard
2. Set environment variables in deployment platform
3. Run database migration
4. Deploy API with new routes
5. Configure webhook endpoint in Stripe Dashboard

### Deployment Sequence

1. **Deploy database migration** (downtime: ~1 second)
2. **Deploy API changes** (zero downtime - backward compatible)
3. **Configure Stripe webhook** (point to new endpoint)
4. **Test in production** with test mode API keys
5. **Switch to live mode** when ready

### Rollback Plan

If issues occur:
1. Disable webhook endpoint in Stripe Dashboard
2. Revert API deployment (old version has no subscription routes)
3. Migration is backward compatible (nullable fields)

### Monitoring

After deployment, monitor:
- Webhook delivery success rate (Stripe Dashboard)
- Failed webhook events (retry queue)
- Tier update latency (webhook → DB update)
- Checkout session completion rate
- Portal session access errors

---

## 10. Acceptance Criteria

Implementation complete when:

✅ User can click "Upgrade to Pro" and complete checkout  
✅ User's tier updates to "pro" after successful payment  
✅ User's execution limits increase based on new tier  
✅ User can access Customer Portal to view invoices  
✅ User can cancel subscription via portal  
✅ User's tier downgrades to "free" after cancellation  
✅ Payment failure updates subscription status to "past_due"  
✅ Invalid webhook signatures are rejected with 401  
✅ All webhook events are idempotent (safe to retry)  
✅ Unit tests pass for adapter and service layers  
✅ Integration tests pass with Stripe test mode  
✅ ADR documents all architectural decisions  
✅ No security vulnerabilities (signature verification, auth checks)

---

## 11. References

- **Stripe Documentation**: https://stripe.com/docs/billing/subscriptions/overview
- **Stripe Node.js SDK**: https://github.com/stripe/stripe-node
- **Webhook Best Practices**: https://stripe.com/docs/webhooks/best-practices
- **ADR 0021**: Tier-Based Quota Enforcement (existing tier system)
- **Architecture Doc**: `docs/ai-scheduler-architecture.md` (hexagonal patterns)
- **Core Principles**: `.github/instructions/core-principles.instructions.md`
