# Enterprise Custom Pricing Management

**Date:** 2024-12-18
**Status:** Accepted

## Context

Cronicorn has various enterprise customers who need different rates and monthly pricing plans beyond the standard Pro plan. Currently, we only support three fixed pricing tiers:
- **Free**: $0/month, 10 endpoints, 100k AI tokens/month
- **Pro**: $29/month, 100 endpoints, 1M AI tokens/month
- **Enterprise**: Custom pricing (contact sales), 1000 endpoints, 10M AI tokens/month

### Problem Statement

We lack a systematic way to:
1. **Set custom rates per customer** - Different enterprise customers need different pricing
2. **Track custom pricing plans** - No database storage for negotiated deals
3. **Manage multiple enterprise customers** - Each needs individualized pricing/limits
4. **Audit pricing changes** - No history of who changed what pricing when
5. **Override quota limits** - Can't give customer-specific endpoint/token limits

**Real-world scenario**: Sales team negotiates a deal with Acme Corp for $199/month with 500 endpoints and 5M tokens. Currently, we have no way to:
- Store this custom plan in our system
- Apply custom limits to their account
- Create a Stripe subscription at $199 (only $29 Pro or $99 Enterprise exist)
- Track when/why this pricing was set
- Modify their limits without code changes

### Research: Industry Best Practices

After researching how major SaaS companies (GitHub, Slack, Notion, Stripe itself) handle enterprise custom pricing, the industry-standard approach is:

**Two-System Architecture:**
1. **Application Database** - Stores pricing logic, contract terms, custom limits
2. **Stripe** - Handles billing, payments, invoicing (payment orchestration only)

This "hybrid approach" provides:
- **Flexibility**: Sales can negotiate any pricing/limits without engineering changes
- **Auditability**: All pricing changes tracked in application database
- **Scalability**: Thousands of custom enterprise deals manageable
- **Separation of concerns**: Business logic separate from payment processing

### Key Patterns from Research

**Pattern 1: Database-Backed Custom Pricing**
- Store custom plans in app database (not just Stripe products)
- Use Stripe API to create subscriptions with negotiated pricing
- Reference custom plan ID in Stripe metadata for linkage

**Pattern 2: Flexible Quota/Rate Tables**
- Separate `plans` table with customizable limits per customer
- Support rate overrides (custom pricing) and quota overrides (custom limits)
- Historical tracking with `effective_from` and `effective_to` dates

**Pattern 3: Admin-Controlled Plan Assignment**
- Admin UI/API for sales/ops teams to create and assign custom plans
- No code deploys needed to onboard new enterprise customers
- Audit log of all plan assignments and modifications

**Pattern 4: Stripe as Payment Rails**
- Use generic "Custom Enterprise" Stripe product
- Create per-customer Price objects in Stripe via API
- Store Stripe price ID in app database for reference
- Webhook updates sync both systems

## Decision

We will implement a **database-backed custom pricing system** following industry best practices, with Stripe handling payment orchestration only.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Admin Portal  │────────▶│ CustomPlansRepo  │           │
│  │ (Create Plans) │         │  (CRUD Plans)    │           │
│  └────────────────┘         └──────────────────┘           │
│         │                            │                       │
│         ▼                            ▼                       │
│  ┌─────────────────────────────────────────┐               │
│  │        custom_plans Table               │               │
│  │  - id, name, price_monthly              │               │
│  │  - max_endpoints, max_tokens_monthly    │               │
│  │  - stripe_price_id, effective_from      │               │
│  └─────────────────────────────────────────┘               │
│         │                            │                       │
│         ▼                            ▼                       │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │ SubscriptionsManager      │  QuotaGuard      │           │
│  │ (Checkout)     │         │ (Check Limits)   │           │
│  └────────────────┘         └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                    │                     │
                    ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Stripe Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   stripe.prices.create({ amount: negotiated_price })  │ │
│  │   stripe.subscriptions.create({ price: custom_id })   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**New Table: `custom_plans`**
```sql
CREATE TABLE custom_plans (
  id TEXT PRIMARY KEY,                      -- UUID
  name TEXT NOT NULL,                       -- e.g., "Acme Corp - Custom Plan"
  description TEXT,                         -- Contract notes
  
  -- Pricing
  price_monthly_cents INTEGER NOT NULL,     -- Custom monthly price
  
  -- Quota Limits (override tier defaults)
  max_endpoints INTEGER,                    -- Custom endpoint limit
  max_tokens_monthly BIGINT,                -- Custom AI token limit
  min_interval_ms INTEGER,                  -- Custom min interval
  max_runs_per_month INTEGER,               -- Custom execution limit
  
  -- Stripe Integration
  stripe_price_id TEXT UNIQUE,              -- Stripe Price object ID
  
  -- Lifecycle
  effective_from DATE NOT NULL,             -- When plan becomes active
  effective_to DATE,                        -- When plan expires (null = forever)
  
  -- Audit
  created_by TEXT NOT NULL,                 -- Admin user who created
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Soft Delete
  archived_at TIMESTAMP
);

CREATE INDEX idx_custom_plans_stripe_price ON custom_plans(stripe_price_id);
CREATE INDEX idx_custom_plans_effective ON custom_plans(effective_from, effective_to);
```

**Update to `user` Table:**
```sql
ALTER TABLE user ADD COLUMN custom_plan_id TEXT REFERENCES custom_plans(id);

-- Migration logic:
-- Keep tier column for standard plans (free/pro/enterprise)
-- Add custom_plan_id for enterprise customers with custom pricing
-- Priority: custom_plan_id > tier (if custom plan exists, use it)
```

**New Table: `plan_audit_log`** (optional but recommended)
```sql
CREATE TABLE plan_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  action TEXT NOT NULL,                     -- 'assigned' | 'removed' | 'modified'
  old_plan_id TEXT,
  new_plan_id TEXT REFERENCES custom_plans(id),
  reason TEXT,                              -- Why was this changed?
  changed_by TEXT NOT NULL,                 -- Admin user ID
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_audit_user ON plan_audit_log(user_id);
CREATE INDEX idx_plan_audit_date ON plan_audit_log(changed_at);
```

### Port & Domain Changes

**New Port: `ICustomPlansRepo`** (`packages/domain/src/ports/repos.ts`)
```typescript
export interface ICustomPlansRepo {
  // CRUD operations
  create(plan: CreateCustomPlanInput): Promise<CustomPlan>;
  getById(id: string): Promise<CustomPlan | null>;
  getByStripePrice(stripePriceId: string): Promise<CustomPlan | null>;
  list(filters: { active?: boolean }): Promise<CustomPlan[]>;
  update(id: string, updates: Partial<CustomPlan>): Promise<CustomPlan>;
  archive(id: string): Promise<void>;
  
  // User assignment
  assignToUser(userId: string, planId: string, reason: string, assignedBy: string): Promise<void>;
  removeFromUser(userId: string, reason: string, removedBy: string): Promise<void>;
  getUserPlan(userId: string): Promise<CustomPlan | null>;
}

export interface CustomPlan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;              // USD cents
  
  // Quota overrides (null = use tier defaults)
  maxEndpoints?: number;
  maxTokensMonthly?: number;
  minIntervalMs?: number;
  maxRunsPerMonth?: number;
  
  stripePriceId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}
```

**Update: `IJobsRepo.getUserTier()`**
```typescript
// Extend to return both tier AND custom plan
getUserTierAndPlan(userId: string): Promise<{
  tier: UserTier;           // Standard tier (fallback)
  customPlan?: CustomPlan;  // Custom plan (priority)
}>;
```

**Update: Quota Functions** (`packages/domain/src/quota/tier-limits.ts`)
```typescript
/**
 * Get execution limits for a user.
 * Priority: customPlan > tier defaults
 */
export function getExecutionLimitsForUser(
  tier: UserTier,
  customPlan?: CustomPlan
): ExecutionLimits {
  const defaults = TIER_EXECUTION_LIMITS[tier];
  
  if (!customPlan) return defaults;
  
  // Custom plan overrides
  return {
    maxEndpoints: customPlan.maxEndpoints ?? defaults.maxEndpoints,
    minIntervalMs: customPlan.minIntervalMs ?? defaults.minIntervalMs,
    maxRunsPerMonth: customPlan.maxRunsPerMonth ?? defaults.maxRunsPerMonth,
  };
}

export function getTokenLimitForUser(
  tier: UserTier,
  customPlan?: CustomPlan
): number {
  if (customPlan?.maxTokensMonthly) {
    return customPlan.maxTokensMonthly;
  }
  return TIER_LIMITS[tier];
}
```

### Service Layer Changes

**New Service: `CustomPlansManager`** (`packages/services/src/custom-plans/manager.ts`)
```typescript
export class CustomPlansManager {
  constructor(
    private deps: {
      customPlansRepo: ICustomPlansRepo;
      paymentProvider: IPaymentProvider;
    }
  ) {}
  
  /**
   * Create a new custom plan (admin only).
   * Optionally creates Stripe Price object.
   */
  async createPlan(
    input: CreateCustomPlanInput,
    options: { createStripePrice?: boolean } = {}
  ): Promise<CustomPlan> {
    let stripePriceId: string | undefined;
    
    // Optionally create Stripe Price
    if (options.createStripePrice) {
      const stripePrice = await this.deps.paymentProvider.createCustomPrice({
        name: input.name,
        amountCents: input.priceMonthly,
        interval: 'month',
        metadata: { customPlanId: input.id },
      });
      stripePriceId = stripePrice.id;
    }
    
    // Store in database
    return await this.deps.customPlansRepo.create({
      ...input,
      stripePriceId,
    });
  }
  
  /**
   * Assign custom plan to user (admin only).
   * Creates Stripe subscription with custom price.
   */
  async assignPlanToUser(
    userId: string,
    planId: string,
    assignedBy: string,
    reason: string
  ): Promise<void> {
    const plan = await this.deps.customPlansRepo.getById(planId);
    if (!plan) throw new Error('Plan not found');
    
    // Validate plan is active
    const now = new Date();
    if (plan.effectiveFrom > now) {
      throw new Error('Plan not yet effective');
    }
    if (plan.effectiveTo && plan.effectiveTo < now) {
      throw new Error('Plan expired');
    }
    
    // Assign in database (triggers audit log)
    await this.deps.customPlansRepo.assignToUser(
      userId,
      planId,
      reason,
      assignedBy
    );
    
    // TODO: Create/update Stripe subscription if stripePriceId exists
    // This would be handled by SubscriptionsManager
  }
}
```

**Update: `SubscriptionsManager`**
```typescript
/**
 * Create checkout session - handle custom plans.
 */
async createCheckout(input: CreateCheckoutInput): Promise<{ checkoutUrl: string }> {
  const { userId, tier } = input;
  
  // Check if user has custom plan
  const customPlan = await this.deps.customPlansRepo.getUserPlan(userId);
  
  let priceId: string;
  if (customPlan?.stripePriceId) {
    // Use custom Stripe price
    priceId = customPlan.stripePriceId;
  } else {
    // Use standard tier price
    priceId = this.getPriceIdForTier(tier);
  }
  
  // Rest of checkout logic...
}
```

**Update: `QuotaGuard`** (in `packages/adapter-drizzle/src/quota-guard.ts`)
```typescript
async canProceed(tenantId: string): Promise<boolean> {
  // Get user tier AND custom plan
  const { tier, customPlan } = await this.deps.jobsRepo.getUserTierAndPlan(tenantId);
  
  // Determine token limit (custom plan takes priority)
  const limit = getTokenLimitForUser(tier, customPlan);
  
  // Calculate usage and check against limit
  const usage = await this.getMonthlyUsage(tenantId);
  return usage < limit;
}
```

### Admin API Endpoints

**New Routes** (`apps/api/src/routes/admin/custom-plans.routes.ts`)
```typescript
// POST /api/admin/custom-plans - Create new plan
// GET /api/admin/custom-plans - List all plans
// GET /api/admin/custom-plans/:id - Get plan details
// PATCH /api/admin/custom-plans/:id - Update plan
// DELETE /api/admin/custom-plans/:id - Archive plan

// POST /api/admin/users/:userId/assign-plan - Assign plan to user
// DELETE /api/admin/users/:userId/custom-plan - Remove custom plan
// GET /api/admin/users/:userId/plan-history - Get audit log
```

**Authentication & Authorization:**
- Admin routes require authentication (Better Auth)
- Admin-only middleware checks `user.role === 'admin'` (new field needed)
- All actions logged to `plan_audit_log` table

### Stripe Integration Updates

**New PaymentProvider Method:**
```typescript
interface IPaymentProvider {
  // ... existing methods
  
  /**
   * Create custom Stripe Price for enterprise plan.
   */
  createCustomPrice(params: {
    name: string;
    amountCents: number;
    interval: 'month' | 'year';
    metadata?: Record<string, string>;
  }): Promise<{ id: string }>;
}
```

**Implementation in `StripePaymentProvider`:**
```typescript
async createCustomPrice(params: CustomPriceParams): Promise<{ id: string }> {
  // Create generic "Custom Enterprise" product if not exists
  const product = await this.ensureCustomEnterpriseProduct();
  
  // Create Price attached to product
  const price = await this.stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: params.amountCents,
    recurring: { interval: params.interval },
    metadata: params.metadata,
  });
  
  return { id: price.id };
}
```

### Migration Strategy

**Phase 1: Database Setup** (Week 1)
1. Create `custom_plans` table migration
2. Create `plan_audit_log` table migration
3. Add `custom_plan_id` column to `user` table
4. Add `role` column to `user` table (admin/user)
5. Run migrations in test environment

**Phase 2: Domain & Services** (Week 2)
1. Implement `ICustomPlansRepo` port
2. Implement Drizzle adapter for custom plans
3. Create `CustomPlansManager` service
4. Update `SubscriptionsManager` for custom plans
5. Update `QuotaGuard` to check custom plans
6. Unit tests for all new logic

**Phase 3: Admin API** (Week 3)
1. Create admin endpoints for plan CRUD
2. Create admin endpoints for plan assignment
3. Add admin authentication middleware
4. Integration tests for admin endpoints

**Phase 4: Stripe Integration** (Week 4)
1. Implement `createCustomPrice` in Stripe adapter
2. Test custom price creation in Stripe test mode
3. Update webhook handlers for custom prices
4. End-to-end checkout test with custom plan

**Phase 5: Admin UI** (Week 5)
1. Create admin portal route structure
2. Build plan creation/editing forms
3. Build user plan assignment interface
4. Display plan audit logs
5. Test admin workflows

**Phase 6: Production Rollout** (Week 6)
1. Deploy to production (migrations first)
2. Create first custom plan in admin UI
3. Assign to test enterprise customer
4. Verify billing/quotas work correctly
5. Document admin workflows for sales team

## Consequences

### Positive ✅

**Flexibility**: Sales team can create custom plans for any enterprise customer without engineering
**Scalability**: Can handle hundreds of custom enterprise plans without code changes
**Auditability**: Complete history of pricing changes and plan assignments
**Separation**: Business logic separate from payment processing (Stripe is just billing)
**Maintainability**: Standard tiers remain unchanged, custom plans are additive
**Industry-Standard**: Follows patterns used by GitHub, Slack, Notion, and other major SaaS

### Tradeoffs ⚠️

**Complexity**: Adds ~3 new database tables, new service layer, admin UI
**Migration**: Requires careful rollout to avoid breaking existing subscriptions
**Admin UI Required**: Sales/ops need admin interface to manage plans (can't use Stripe dashboard alone)
**Testing Overhead**: More scenarios to test (standard tiers + custom plans)
**Dual State**: Must keep app database and Stripe in sync (webhook critical)

### Limitations & Future Work

**Current Scope (MVP):**
- Monthly billing only (no annual custom plans)
- USD currency only (no multi-currency)
- No graduated pricing (flat monthly fee)
- No usage-based billing (flat quotas)
- No contract length enforcement (month-to-month)
- Manual plan creation (no self-serve custom quotes)

**Future Enhancements:**
- Annual custom plans with discounts
- Multi-currency support
- Per-seat pricing for custom plans
- Usage-based/metered billing
- Contract term enforcement (1-year minimum)
- Self-serve enterprise quote calculator
- Stripe Tax integration for custom plans
- Automated plan renewal reminders
- Plan comparison/migration tools
- Revenue recognition for custom plans

### Security Considerations

**Admin Access Control:**
- Admin endpoints require `role='admin'` check
- Admin role assignment must be manual (no self-service)
- All admin actions logged with user ID and reason
- Consider 2FA requirement for admin users

**Custom Plan Validation:**
- Enforce minimum pricing (e.g., $50/month minimum)
- Validate quota limits are within reasonable ranges
- Prevent overlapping effective date ranges
- Validate Stripe price exists before assignment

**Audit Trail:**
- All plan assignments logged with reason
- All plan modifications logged with before/after values
- Retain audit logs indefinitely (compliance)
- Export audit logs for reporting

## References

### Research Sources
- [How SaaS Companies Handle Custom Enterprise Pricing with Stripe](https://schematichq.com/use-cases/unified-pricing-model-stripe)
- [Enterprise Pricing Best Practices](https://www.withorb.com/blog/enterprise-pricing)
- [Multi-Tenant Database Design Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Stripe Subscription API Documentation](https://docs.stripe.com/api/subscriptions)

### Related ADRs
- ADR-0021: Tier-Based Quota Enforcement (establishes quota system)
- ADR-0022: Stripe Subscription Integration (establishes payment architecture)

### Code References
- `packages/domain/src/quota/tier-limits.ts` - Tier limit constants
- `packages/adapter-stripe/src/stripe-client.ts` - Stripe integration
- `packages/services/src/subscriptions/manager.ts` - Subscription logic
- `packages/adapter-drizzle/src/schema.ts` - Database schema
- `packages/adapter-drizzle/src/quota-guard.ts` - Quota enforcement

### External Examples
- GitHub Enterprise Cloud - Custom pricing and seat management
- Slack Enterprise Grid - Negotiated pricing with custom features
- Notion Enterprise - Custom plans with SSO and compliance
- Stripe itself - Multiple custom pricing tiers and add-ons
