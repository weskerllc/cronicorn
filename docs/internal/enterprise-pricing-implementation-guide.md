# Enterprise Custom Pricing - Implementation Guide

**Status**: Design Phase  
**Owner**: Engineering Team  
**Last Updated**: 2024-12-18

## Overview

This guide provides a detailed implementation plan for adding enterprise custom pricing management to Cronicorn. It supports the design documented in [ADR-0054](../../.adr/0054-enterprise-custom-pricing-management.md).

## Problem Summary

**What we have now:**
- 3 fixed pricing tiers: Free ($0), Pro ($29), Enterprise ($99)
- No way to set customer-specific pricing or limits
- Sales team must contact engineering for each custom deal
- No audit trail of pricing changes

**What we need:**
- Database-backed custom pricing plans
- Admin UI for sales/ops to create and assign plans
- Custom quota limits per customer
- Stripe integration for custom billing
- Full audit trail of all pricing changes

## Architecture Decision

After researching industry best practices (GitHub, Slack, Notion), we chose the **database-backed custom pricing** approach:

1. **Store pricing logic in our database** (not just Stripe)
2. **Use Stripe only for payment orchestration** (billing/invoicing)
3. **Admin-controlled plan assignment** (no code deploys needed)
4. **Custom quotas per customer** (override tier defaults)

This is the industry-standard approach for SaaS products with enterprise customers.

## Database Schema Design

### New Tables

#### 1. `custom_plans` - Core Plan Definitions

```sql
CREATE TABLE custom_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                       -- "Acme Corp - Enterprise Plus"
  description TEXT,                         -- Contract notes/special terms
  
  -- Pricing
  price_monthly_cents INTEGER NOT NULL,     -- $199.00 = 19900
  
  -- Quota Overrides (null = use tier defaults)
  max_endpoints INTEGER,                    -- Custom endpoint limit
  max_tokens_monthly BIGINT,                -- Custom AI token limit  
  min_interval_ms INTEGER,                  -- Custom min interval
  max_runs_per_month INTEGER,               -- Custom execution limit
  
  -- Stripe Integration
  stripe_price_id TEXT UNIQUE,              -- Links to Stripe Price object
  
  -- Lifecycle Management
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,                        -- null = no expiration
  
  -- Audit Fields
  created_by TEXT NOT NULL,                 -- Admin user ID
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP                     -- Soft delete
);

-- Indexes
CREATE INDEX idx_custom_plans_stripe_price ON custom_plans(stripe_price_id);
CREATE INDEX idx_custom_plans_effective ON custom_plans(effective_from, effective_to);
CREATE INDEX idx_custom_plans_archived ON custom_plans(archived_at) WHERE archived_at IS NULL;
```

**Design Notes:**
- `price_monthly_cents`: Store in cents to avoid floating-point issues
- Quota fields nullable: NULL means "use tier defaults"
- `effective_from/to`: Support future-dated plans and expirations
- `stripe_price_id`: Optional - can create plan before Stripe integration
- Soft delete with `archived_at` preserves history

#### 2. `plan_audit_log` - Change History

```sql
CREATE TABLE plan_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id),
  action TEXT NOT NULL,                     -- 'assigned' | 'removed' | 'modified'
  old_plan_id TEXT,                         -- Previous plan (for modifications)
  new_plan_id TEXT REFERENCES custom_plans(id),
  old_values JSONB,                         -- Snapshot of old plan
  new_values JSONB,                         -- Snapshot of new plan
  reason TEXT,                              -- Why was this changed?
  changed_by TEXT NOT NULL,                 -- Admin user ID who made change
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plan_audit_user ON plan_audit_log(user_id, changed_at DESC);
CREATE INDEX idx_plan_audit_plan ON plan_audit_log(new_plan_id);
CREATE INDEX idx_plan_audit_date ON plan_audit_log(changed_at DESC);
```

**Design Notes:**
- Every plan assignment/removal/modification logged
- JSONB snapshots preserve complete state at time of change
- `reason` field for compliance/reporting
- Immutable - no updates/deletes allowed

#### 3. Update to `user` Table

```sql
-- Add custom plan reference
ALTER TABLE "user" ADD COLUMN custom_plan_id TEXT REFERENCES custom_plans(id);

-- Add admin role (for authorization)
ALTER TABLE "user" ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
-- Valid values: 'user' | 'admin'

-- Index for lookups
CREATE INDEX idx_user_custom_plan ON "user"(custom_plan_id);
CREATE INDEX idx_user_role ON "user"(role) WHERE role = 'admin';
```

**Priority Logic:**
- If `custom_plan_id` is set → use custom plan (ignore `tier`)
- If `custom_plan_id` is null → use `tier` column (existing behavior)
- This ensures backward compatibility with existing users

## Domain Layer Changes

### 1. New Domain Type: `CustomPlan`

**Location**: `packages/domain/src/entities/custom-plan.ts`

```typescript
export interface CustomPlan {
  id: string;
  name: string;
  description?: string;
  
  // Pricing
  priceMonthly: number;           // USD cents (e.g., 19900 = $199)
  
  // Quota Overrides (undefined = use tier defaults)
  maxEndpoints?: number;
  maxTokensMonthly?: number;
  minIntervalMs?: number;
  maxRunsPerMonth?: number;
  
  // Stripe
  stripePriceId?: string;
  
  // Lifecycle
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface CreateCustomPlanInput {
  name: string;
  description?: string;
  priceMonthly: number;
  maxEndpoints?: number;
  maxTokensMonthly?: number;
  minIntervalMs?: number;
  maxRunsPerMonth?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdBy: string;
}

export interface UpdateCustomPlanInput {
  name?: string;
  description?: string;
  priceMonthly?: number;
  maxEndpoints?: number;
  maxTokensMonthly?: number;
  minIntervalMs?: number;
  maxRunsPerMonth?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}
```

### 2. New Port: `ICustomPlansRepo`

**Location**: `packages/domain/src/ports/repos.ts`

```typescript
export interface ICustomPlansRepo {
  // CRUD operations
  create(input: CreateCustomPlanInput): Promise<CustomPlan>;
  getById(id: string): Promise<CustomPlan | null>;
  getByStripePrice(stripePriceId: string): Promise<CustomPlan | null>;
  list(filters?: {
    active?: boolean;      // Filter by effective dates
    archived?: boolean;    // Include archived plans
  }): Promise<CustomPlan[]>;
  update(id: string, updates: UpdateCustomPlanInput): Promise<CustomPlan>;
  archive(id: string): Promise<void>;
  
  // User Assignment
  assignToUser(
    userId: string,
    planId: string,
    assignedBy: string,
    reason: string
  ): Promise<void>;
  
  removeFromUser(
    userId: string,
    removedBy: string,
    reason: string
  ): Promise<void>;
  
  getUserPlan(userId: string): Promise<CustomPlan | null>;
  
  // Audit
  getPlanHistory(userId: string): Promise<PlanAuditEntry[]>;
}

export interface PlanAuditEntry {
  id: string;
  userId: string;
  action: 'assigned' | 'removed' | 'modified';
  oldPlanId?: string;
  newPlanId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  reason?: string;
  changedBy: string;
  changedAt: Date;
}
```

### 3. Update Existing Ports

**Update `IJobsRepo`:**
```typescript
export interface IJobsRepo {
  // ... existing methods
  
  /**
   * Get user's tier and custom plan (if assigned).
   * Custom plan takes priority over tier for quota calculations.
   */
  getUserTierAndPlan(userId: string): Promise<{
    tier: UserTier;           // Standard tier (free/pro/enterprise)
    customPlan?: CustomPlan;  // Custom plan (if assigned)
  }>;
  
  /**
   * Get user role for admin authorization.
   */
  getUserRole(userId: string): Promise<'user' | 'admin'>;
}
```

### 4. Update Quota Functions

**Location**: `packages/domain/src/quota/tier-limits.ts`

```typescript
/**
 * Get execution limits for a user.
 * Custom plan overrides take priority over tier defaults.
 */
export function getExecutionLimitsForUser(
  tier: UserTier,
  customPlan?: CustomPlan
): ExecutionLimits {
  const defaults = TIER_EXECUTION_LIMITS[tier];
  
  if (!customPlan) {
    return defaults;
  }
  
  // Custom plan overrides (fallback to tier defaults)
  return {
    maxEndpoints: customPlan.maxEndpoints ?? defaults.maxEndpoints,
    minIntervalMs: customPlan.minIntervalMs ?? defaults.minIntervalMs,
    maxRunsPerMonth: customPlan.maxRunsPerMonth ?? defaults.maxRunsPerMonth,
  };
}

/**
 * Get AI token limit for a user.
 */
export function getTokenLimitForUser(
  tier: UserTier,
  customPlan?: CustomPlan
): number {
  if (customPlan?.maxTokensMonthly !== undefined) {
    return customPlan.maxTokensMonthly;
  }
  return TIER_LIMITS[tier];
}

/**
 * Get monthly price for a user (for display).
 */
export function getMonthlyPriceForUser(
  tier: UserTier,
  customPlan?: CustomPlan
): number {
  if (customPlan?.priceMonthly !== undefined) {
    return customPlan.priceMonthly;
  }
  
  // Default tier pricing (in cents)
  const tierPricing: Record<UserTier, number> = {
    free: 0,
    pro: 2999,      // $29.99
    enterprise: 9999 // $99.99
  };
  
  return tierPricing[tier];
}
```

## Service Layer Implementation

### 1. New Service: `CustomPlansManager`

**Location**: `packages/services/src/custom-plans/manager.ts`

```typescript
import type { 
  ICustomPlansRepo, 
  IPaymentProvider, 
  CreateCustomPlanInput,
  UpdateCustomPlanInput,
  CustomPlan 
} from '@cronicorn/domain';

export interface CustomPlansDeps {
  customPlansRepo: ICustomPlansRepo;
  paymentProvider: IPaymentProvider;
}

export class CustomPlansManager {
  constructor(private deps: CustomPlansDeps) {}
  
  /**
   * Create a new custom plan.
   * Optionally creates Stripe Price object.
   */
  async createPlan(
    input: CreateCustomPlanInput,
    options: { createStripePrice?: boolean } = {}
  ): Promise<CustomPlan> {
    // Validate input
    this.validatePlanInput(input);
    
    let stripePriceId: string | undefined;
    
    // Optionally create Stripe Price
    if (options.createStripePrice) {
      const stripePrice = await this.deps.paymentProvider.createCustomPrice({
        name: input.name,
        amountCents: input.priceMonthly,
        interval: 'month',
        metadata: {
          customPlan: 'true',
          planName: input.name,
        },
      });
      stripePriceId = stripePrice.id;
    }
    
    // Create in database
    const plan = await this.deps.customPlansRepo.create({
      ...input,
      stripePriceId,
    });
    
    return plan;
  }
  
  /**
   * Update an existing plan.
   */
  async updatePlan(
    planId: string,
    updates: UpdateCustomPlanInput,
    updatedBy: string
  ): Promise<CustomPlan> {
    // Get existing plan
    const existing = await this.deps.customPlansRepo.getById(planId);
    if (!existing) {
      throw new Error(`Plan not found: ${planId}`);
    }
    
    // Validate updates
    if (updates.priceMonthly !== undefined) {
      this.validatePrice(updates.priceMonthly);
    }
    
    // Update in database
    return await this.deps.customPlansRepo.update(planId, updates);
  }
  
  /**
   * Assign custom plan to a user.
   * This replaces their tier-based limits.
   */
  async assignPlanToUser(
    userId: string,
    planId: string,
    assignedBy: string,
    reason: string
  ): Promise<void> {
    // Validate plan exists and is active
    const plan = await this.deps.customPlansRepo.getById(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }
    
    if (plan.archivedAt) {
      throw new Error('Cannot assign archived plan');
    }
    
    const now = new Date();
    if (plan.effectiveFrom > now) {
      throw new Error('Plan is not yet effective');
    }
    
    if (plan.effectiveTo && plan.effectiveTo < now) {
      throw new Error('Plan has expired');
    }
    
    // Assign in database (creates audit log entry)
    await this.deps.customPlansRepo.assignToUser(
      userId,
      planId,
      assignedBy,
      reason
    );
  }
  
  /**
   * Remove custom plan from user (revert to tier-based).
   */
  async removePlanFromUser(
    userId: string,
    removedBy: string,
    reason: string
  ): Promise<void> {
    await this.deps.customPlansRepo.removeFromUser(
      userId,
      removedBy,
      reason
    );
  }
  
  /**
   * List all plans with optional filters.
   */
  async listPlans(filters?: {
    active?: boolean;
    archived?: boolean;
  }): Promise<CustomPlan[]> {
    return await this.deps.customPlansRepo.list(filters);
  }
  
  /**
   * Get plan history for a user.
   */
  async getUserPlanHistory(userId: string) {
    return await this.deps.customPlansRepo.getPlanHistory(userId);
  }
  
  // Validation helpers
  private validatePlanInput(input: CreateCustomPlanInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Plan name is required');
    }
    
    this.validatePrice(input.priceMonthly);
    
    if (input.maxEndpoints !== undefined && input.maxEndpoints < 1) {
      throw new Error('maxEndpoints must be at least 1');
    }
    
    if (input.maxTokensMonthly !== undefined && input.maxTokensMonthly < 1000) {
      throw new Error('maxTokensMonthly must be at least 1000');
    }
    
    if (input.minIntervalMs !== undefined && input.minIntervalMs < 1000) {
      throw new Error('minIntervalMs must be at least 1000');
    }
  }
  
  private validatePrice(priceMonthly: number): void {
    if (priceMonthly < 0) {
      throw new Error('Price cannot be negative');
    }
    
    // Optional: Enforce minimum price for custom plans
    const MIN_CUSTOM_PRICE = 5000; // $50 minimum
    if (priceMonthly > 0 && priceMonthly < MIN_CUSTOM_PRICE) {
      throw new Error(`Custom plan price must be at least $${MIN_CUSTOM_PRICE / 100}`);
    }
  }
}
```

### 2. Update `SubscriptionsManager`

**Location**: `packages/services/src/subscriptions/manager.ts`

```typescript
export class SubscriptionsManager {
  constructor(
    private deps: SubscriptionDeps & {
      customPlansRepo: ICustomPlansRepo; // Add this
    }
  ) {}
  
  /**
   * Create checkout session - handle custom plans.
   */
  async createCheckout(input: CreateCheckoutInput): Promise<{ checkoutUrl: string }> {
    const { userId, tier } = input;
    
    // Check if user has custom plan assigned
    const customPlan = await this.deps.customPlansRepo.getUserPlan(userId);
    
    let priceId: string;
    if (customPlan?.stripePriceId) {
      // Use custom Stripe price
      priceId = customPlan.stripePriceId;
    } else {
      // Use standard tier price
      priceId = this.getPriceIdForTier(tier);
    }
    
    // Get user details
    const user = await this.deps.jobsRepo.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Create checkout session
    const result = await this.deps.paymentProvider.createCheckoutSession({
      userId,
      userEmail: user.email,
      priceId, // Use custom or standard price
      successUrl: `${this.deps.baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.deps.baseUrl}/pricing`,
      existingCustomerId: user.stripeCustomerId ?? undefined,
    });
    
    return { checkoutUrl: result.checkoutUrl };
  }
  
  // ... rest of methods
}
```

### 3. Update `QuotaGuard`

**Location**: `packages/adapter-drizzle/src/quota-guard.ts`

```typescript
async canProceed(tenantId: string): Promise<boolean> {
  // Get user tier and custom plan
  const { tier, customPlan } = await this.deps.jobsRepo.getUserTierAndPlan(tenantId);
  
  // Determine token limit (custom plan overrides tier)
  const limit = getTokenLimitForUser(tier, customPlan);
  
  // Calculate current month usage
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  
  const usage = await this.getMonthlyUsage(tenantId, startOfMonth);
  
  return usage < limit;
}
```

## Adapter Layer Implementation

### 1. Drizzle Schema Updates

**Location**: `packages/adapter-drizzle/src/schema.ts`

```typescript
// Add to existing schema file

export const customPlans = pgTable("custom_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  
  // Pricing
  priceMonthly: integer("price_monthly_cents").notNull(),
  
  // Quota Overrides
  maxEndpoints: integer("max_endpoints"),
  maxTokensMonthly: integer("max_tokens_monthly"),
  minIntervalMs: integer("min_interval_ms"),
  maxRunsPerMonth: integer("max_runs_per_month"),
  
  // Stripe
  stripePriceId: text("stripe_price_id").unique(),
  
  // Lifecycle
  effectiveFrom: timestamp("effective_from", { mode: "date" }).notNull().defaultNow(),
  effectiveTo: timestamp("effective_to", { mode: "date" }),
  
  // Audit
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { mode: "date" }),
}, (table) => ({
  stripePriceIdx: index("idx_custom_plans_stripe_price").on(table.stripePriceId),
  effectiveIdx: index("idx_custom_plans_effective").on(table.effectiveFrom, table.effectiveTo),
}));

export const planAuditLog = pgTable("plan_audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id),
  action: text("action").notNull(), // 'assigned' | 'removed' | 'modified'
  oldPlanId: text("old_plan_id"),
  newPlanId: text("new_plan_id").references(() => customPlans.id),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  reason: text("reason"),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("idx_plan_audit_user").on(table.userId, table.changedAt),
  planIdx: index("idx_plan_audit_plan").on(table.newPlanId),
  dateIdx: index("idx_plan_audit_date").on(table.changedAt),
}));

// Update user table
export const user = pgTable("user", {
  // ... existing fields
  customPlanId: text("custom_plan_id").references(() => customPlans.id),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
}, (table) => ({
  // ... existing indexes
  customPlanIdx: index("idx_user_custom_plan").on(table.customPlanId),
  roleIdx: index("idx_user_role").on(table.role),
}));
```

### 2. Drizzle Repository Implementation

**Location**: `packages/adapter-drizzle/src/custom-plans-repo.ts`

```typescript
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, lte, gte, or } from 'drizzle-orm';
import type { 
  ICustomPlansRepo, 
  CustomPlan, 
  CreateCustomPlanInput,
  UpdateCustomPlanInput,
  PlanAuditEntry 
} from '@cronicorn/domain';
import * as schema from './schema.js';

export class DrizzleCustomPlansRepo implements ICustomPlansRepo {
  constructor(private db: NodePgDatabase<typeof schema>) {}
  
  async create(input: CreateCustomPlanInput): Promise<CustomPlan> {
    const [row] = await this.db
      .insert(schema.customPlans)
      .values({
        name: input.name,
        description: input.description,
        priceMonthly: input.priceMonthly,
        maxEndpoints: input.maxEndpoints,
        maxTokensMonthly: input.maxTokensMonthly,
        minIntervalMs: input.minIntervalMs,
        maxRunsPerMonth: input.maxRunsPerMonth,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        effectiveTo: input.effectiveTo,
        createdBy: input.createdBy,
      })
      .returning();
    
    return this.toDomain(row);
  }
  
  async getById(id: string): Promise<CustomPlan | null> {
    const [row] = await this.db
      .select()
      .from(schema.customPlans)
      .where(eq(schema.customPlans.id, id));
    
    return row ? this.toDomain(row) : null;
  }
  
  async getByStripePrice(stripePriceId: string): Promise<CustomPlan | null> {
    const [row] = await this.db
      .select()
      .from(schema.customPlans)
      .where(eq(schema.customPlans.stripePriceId, stripePriceId));
    
    return row ? this.toDomain(row) : null;
  }
  
  async list(filters?: { active?: boolean; archived?: boolean }): Promise<CustomPlan[]> {
    let query = this.db.select().from(schema.customPlans);
    
    const conditions = [];
    
    // Filter by active status
    if (filters?.active) {
      const now = new Date();
      conditions.push(
        and(
          lte(schema.customPlans.effectiveFrom, now),
          or(
            isNull(schema.customPlans.effectiveTo),
            gte(schema.customPlans.effectiveTo, now)
          )
        )
      );
    }
    
    // Filter by archived status
    if (filters?.archived === false) {
      conditions.push(isNull(schema.customPlans.archivedAt));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const rows = await query;
    return rows.map(row => this.toDomain(row));
  }
  
  async update(id: string, updates: UpdateCustomPlanInput): Promise<CustomPlan> {
    const [row] = await this.db
      .update(schema.customPlans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.customPlans.id, id))
      .returning();
    
    if (!row) {
      throw new Error(`Plan not found: ${id}`);
    }
    
    return this.toDomain(row);
  }
  
  async archive(id: string): Promise<void> {
    await this.db
      .update(schema.customPlans)
      .set({ archivedAt: new Date() })
      .where(eq(schema.customPlans.id, id));
  }
  
  async assignToUser(
    userId: string,
    planId: string,
    assignedBy: string,
    reason: string
  ): Promise<void> {
    // Get current plan (if any)
    const [currentUser] = await this.db
      .select({ customPlanId: schema.user.customPlanId })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    
    const oldPlanId = currentUser?.customPlanId;
    
    // Update user's plan
    await this.db
      .update(schema.user)
      .set({ customPlanId: planId })
      .where(eq(schema.user.id, userId));
    
    // Create audit log entry
    await this.db.insert(schema.planAuditLog).values({
      userId,
      action: 'assigned',
      oldPlanId,
      newPlanId: planId,
      reason,
      changedBy: assignedBy,
    });
  }
  
  async removeFromUser(
    userId: string,
    removedBy: string,
    reason: string
  ): Promise<void> {
    // Get current plan
    const [currentUser] = await this.db
      .select({ customPlanId: schema.user.customPlanId })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    
    const oldPlanId = currentUser?.customPlanId;
    
    // Remove plan from user
    await this.db
      .update(schema.user)
      .set({ customPlanId: null })
      .where(eq(schema.user.id, userId));
    
    // Create audit log entry
    if (oldPlanId) {
      await this.db.insert(schema.planAuditLog).values({
        userId,
        action: 'removed',
        oldPlanId,
        newPlanId: null,
        reason,
        changedBy: removedBy,
      });
    }
  }
  
  async getUserPlan(userId: string): Promise<CustomPlan | null> {
    const [result] = await this.db
      .select()
      .from(schema.user)
      .innerJoin(
        schema.customPlans,
        eq(schema.user.customPlanId, schema.customPlans.id)
      )
      .where(eq(schema.user.id, userId));
    
    return result ? this.toDomain(result.custom_plans) : null;
  }
  
  async getPlanHistory(userId: string): Promise<PlanAuditEntry[]> {
    const rows = await this.db
      .select()
      .from(schema.planAuditLog)
      .where(eq(schema.planAuditLog.userId, userId))
      .orderBy(schema.planAuditLog.changedAt);
    
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      action: row.action as 'assigned' | 'removed' | 'modified',
      oldPlanId: row.oldPlanId ?? undefined,
      newPlanId: row.newPlanId ?? undefined,
      oldValues: row.oldValues,
      newValues: row.newValues,
      reason: row.reason ?? undefined,
      changedBy: row.changedBy,
      changedAt: row.changedAt,
    }));
  }
  
  private toDomain(row: typeof schema.customPlans.$inferSelect): CustomPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      priceMonthly: row.priceMonthly,
      maxEndpoints: row.maxEndpoints ?? undefined,
      maxTokensMonthly: row.maxTokensMonthly ?? undefined,
      minIntervalMs: row.minIntervalMs ?? undefined,
      maxRunsPerMonth: row.maxRunsPerMonth ?? undefined,
      stripePriceId: row.stripePriceId ?? undefined,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? undefined,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt ?? undefined,
    };
  }
}
```

## API Layer Implementation

### Admin Endpoints

**Location**: `apps/api/src/routes/admin/custom-plans.routes.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Schemas
const createPlanSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceMonthly: z.number().int().min(0),
  maxEndpoints: z.number().int().min(1).optional(),
  maxTokensMonthly: z.number().int().min(1000).optional(),
  minIntervalMs: z.number().int().min(1000).optional(),
  maxRunsPerMonth: z.number().int().min(100).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  createStripePrice: z.boolean().optional(),
});

const updatePlanSchema = createPlanSchema.partial();

const assignPlanSchema = z.object({
  planId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

// Router setup
export const customPlansRouter = new Hono();

// Middleware: Require admin role
customPlansRouter.use('*', async (c, next) => {
  const user = c.get('user'); // Set by auth middleware
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const role = await c.get('customPlansManager').deps.jobsRepo.getUserRole(user.id);
  if (role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  await next();
});

// POST /api/admin/custom-plans - Create plan
customPlansRouter.post(
  '/',
  zValidator('json', createPlanSchema),
  async (c) => {
    const user = c.get('user');
    const input = c.req.valid('json');
    const manager = c.get('customPlansManager');
    
    const plan = await manager.createPlan(
      {
        ...input,
        createdBy: user.id,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      },
      { createStripePrice: input.createStripePrice }
    );
    
    return c.json({ plan }, 201);
  }
);

// GET /api/admin/custom-plans - List plans
customPlansRouter.get('/', async (c) => {
  const active = c.req.query('active') === 'true';
  const archived = c.req.query('archived') === 'true';
  
  const manager = c.get('customPlansManager');
  const plans = await manager.listPlans({ active, archived });
  
  return c.json({ plans });
});

// GET /api/admin/custom-plans/:id - Get plan
customPlansRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const manager = c.get('customPlansManager');
  
  const plan = await manager.deps.customPlansRepo.getById(id);
  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404);
  }
  
  return c.json({ plan });
});

// PATCH /api/admin/custom-plans/:id - Update plan
customPlansRouter.patch(
  '/:id',
  zValidator('json', updatePlanSchema),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const updates = c.req.valid('json');
    const manager = c.get('customPlansManager');
    
    const plan = await manager.updatePlan(id, updates, user.id);
    return c.json({ plan });
  }
);

// DELETE /api/admin/custom-plans/:id - Archive plan
customPlansRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const manager = c.get('customPlansManager');
  
  await manager.deps.customPlansRepo.archive(id);
  return c.json({ success: true });
});

// POST /api/admin/users/:userId/assign-plan - Assign plan to user
customPlansRouter.post(
  '/users/:userId/assign-plan',
  zValidator('json', assignPlanSchema),
  async (c) => {
    const userId = c.req.param('userId');
    const admin = c.get('user');
    const { planId, reason } = c.req.valid('json');
    const manager = c.get('customPlansManager');
    
    await manager.assignPlanToUser(userId, planId, admin.id, reason);
    return c.json({ success: true });
  }
);

// DELETE /api/admin/users/:userId/custom-plan - Remove custom plan
customPlansRouter.delete(
  '/users/:userId/custom-plan',
  zValidator('json', z.object({ reason: z.string().min(1).max(500) })),
  async (c) => {
    const userId = c.req.param('userId');
    const admin = c.get('user');
    const { reason } = c.req.valid('json');
    const manager = c.get('customPlansManager');
    
    await manager.removePlanFromUser(userId, admin.id, reason);
    return c.json({ success: true });
  }
);

// GET /api/admin/users/:userId/plan-history - Get audit log
customPlansRouter.get('/users/:userId/plan-history', async (c) => {
  const userId = c.req.param('userId');
  const manager = c.get('customPlansManager');
  
  const history = await manager.getUserPlanHistory(userId);
  return c.json({ history });
});
```

## Testing Strategy

### Unit Tests

1. **Domain Functions** (`packages/domain/src/quota/__tests__/tier-limits.test.ts`)
   - Test `getExecutionLimitsForUser` with custom plans
   - Test `getTokenLimitForUser` with custom plans
   - Test fallback to tier defaults

2. **CustomPlansManager** (`packages/services/src/custom-plans/__tests__/manager.test.ts`)
   - Test plan creation with validation
   - Test plan assignment validation
   - Test Stripe price creation
   - Test error cases

3. **DrizzleCustomPlansRepo** (`packages/adapter-drizzle/src/__tests__/custom-plans-repo.test.ts`)
   - Test CRUD operations
   - Test user assignment/removal
   - Test audit log creation
   - Test active plan filtering

### Integration Tests

1. **Admin API Endpoints** (`apps/api/src/routes/admin/__tests__/custom-plans.api.test.ts`)
   - Test authorization (admin-only)
   - Test complete plan lifecycle
   - Test plan assignment workflow
   - Test audit log retrieval

2. **Quota Enforcement** (`packages/adapter-drizzle/src/__tests__/quota-with-custom-plans.test.ts`)
   - Test quota checks with custom plans
   - Test fallback to tier limits
   - Test plan priority over tier

## Rollout Plan

### Week 1: Database & Domain
- [ ] Create migrations for new tables
- [ ] Add domain types and ports
- [ ] Implement Drizzle repository
- [ ] Unit tests for domain functions

### Week 2: Services
- [ ] Implement CustomPlansManager
- [ ] Update SubscriptionsManager
- [ ] Update QuotaGuard
- [ ] Unit tests for services

### Week 3: API
- [ ] Create admin endpoints
- [ ] Add admin auth middleware
- [ ] Integration tests for API
- [ ] Manual testing with Postman

### Week 4: Stripe
- [ ] Implement createCustomPrice
- [ ] Update webhook handlers
- [ ] Test custom subscriptions
- [ ] End-to-end checkout test

### Week 5: Admin UI
- [ ] Create admin portal structure
- [ ] Build plan management interface
- [ ] Build user assignment interface
- [ ] Display audit logs

### Week 6: Production
- [ ] Deploy database migrations
- [ ] Deploy backend code
- [ ] Deploy admin UI
- [ ] Create first custom plan
- [ ] Document workflows

## Monitoring & Observability

### Metrics to Track
- Number of active custom plans
- Number of users on custom plans
- Revenue from custom plans
- Plan assignment frequency
- Audit log volume

### Alerts to Set
- Custom plan creation failures
- Stripe price creation failures
- Plan assignment errors
- Quota enforcement failures with custom plans

## Documentation Needed

1. **For Sales Team**: How to create and assign custom plans
2. **For Support**: How to view user's plan and audit history
3. **For Engineering**: Admin API reference and examples
4. **For Compliance**: Audit log retention and export procedures

## Security Considerations

1. **Admin Authentication**: Require 2FA for admin users
2. **Role Assignment**: Manual only, no self-service admin promotion
3. **Audit Logging**: All actions logged with user ID and reason
4. **Input Validation**: Strict validation on all plan inputs
5. **Rate Limiting**: Apply to admin endpoints to prevent abuse

## Future Enhancements

1. **Annual Plans**: Support yearly billing with discounts
2. **Multi-Currency**: Support pricing in EUR, GBP, etc.
3. **Per-Seat Pricing**: Charge based on team size
4. **Usage-Based**: Metered billing for API calls
5. **Contract Management**: Track contract start/end dates
6. **Self-Service Quotes**: Let enterprise customers request custom quotes
7. **Plan Templates**: Save common custom plan configurations
8. **Approval Workflows**: Require approval for high-value plans

## References

- [ADR-0054: Enterprise Custom Pricing Management](../../.adr/0054-enterprise-custom-pricing-management.md)
- [ADR-0022: Stripe Subscription Integration](../../.adr/0022-stripe-subscription-integration.md)
- [ADR-0021: Tier-Based Quota Enforcement](../../.adr/0021-tier-based-quota-enforcement.md)
