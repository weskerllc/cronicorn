import type { CreateCheckoutInput, CreatePortalInput, SubscriptionDeps, SubscriptionStatus } from "./types.js";

import { RefundAlreadyProcessedError, RefundConcurrencyError, RefundExpiredError, RefundNotEligibleError } from "./errors.js";

/**
 * SubscriptionsManager - Business logic for subscription management.
 *
 * Orchestrates between PaymentProvider (e.g., Stripe) and JobsRepo (DB).
 * Handles checkout, portal, and webhook events.
 *
 * **Architecture**:
 * - Depends ONLY on domain ports (PaymentProvider, JobsRepo)
 * - Zero knowledge of concrete adapters (Stripe, Drizzle)
 * - All payment provider operations go through PaymentProvider port
 */
export class SubscriptionsManager {
  constructor(
    private deps: SubscriptionDeps,
  ) { }

  /**
   * Create Stripe Checkout Session for user to subscribe.
   */
  async createCheckout(input: CreateCheckoutInput): Promise<{ checkoutUrl: string }> {
    const { userId, tier, billingPeriod } = input;

    // Get user details
    const user = await this.deps.jobsRepo.getUserById(userId);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create checkout session (reuse existing customer if available)
    const result = await this.deps.paymentProvider.createCheckoutSession({
      userId,
      userEmail: user.email,
      tier,
      billingPeriod: billingPeriod ?? "monthly",
      successUrl: `${this.deps.baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.deps.baseUrl}/pricing`,
      existingCustomerId: user.stripeCustomerId ?? undefined,
    });

    return { checkoutUrl: result.checkoutUrl };
  }

  /**
   * Create Customer Portal Session for self-service.
   */
  async createPortal(input: CreatePortalInput): Promise<{ portalUrl: string }> {
    const { userId } = input;

    // Get user with Stripe customer ID
    const user = await this.deps.jobsRepo.getUserById(userId);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

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
   * Get current subscription status for user.
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const user = await this.deps.jobsRepo.getUserById(userId);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Calculate refund eligibility
    const now = new Date();
    const isEligibleForRefund = Boolean(
      user.tier === "pro"
      && user.refundStatus === "eligible"
      && user.refundWindowExpiresAt
      && user.refundWindowExpiresAt > now,
    );

    // Return tier and subscription details
    // Note: subscriptionStatus and endsAt are on user table but not returned by getUserById
    // For MVP, just return tier - can enhance later
    return {
      tier: user.tier,
      status: null, // TODO: Add to getUserById return type
      endsAt: null, // TODO: Add to getUserById return type
      refundEligibility: {
        eligible: isEligibleForRefund,
        expiresAt: user.refundWindowExpiresAt,
        status: user.refundStatus,
      },
    };
  }

  /**
   * Request a refund for Pro subscription within 14-day window.
   *
   * Validates eligibility, issues refund, cancels subscription, and downgrades to free tier.
   *
   * @param input - Refund request parameters
   * @param input.userId - User ID requesting the refund
   * @param input.reason - Optional reason for the refund
   * @returns Refund details
   */
  async requestRefund(input: { userId: string; reason?: string }): Promise<{ refundId: string; status: string }> {
    const { userId, reason } = input;

    // 1. Get user details
    const user = await this.deps.jobsRepo.getUserById(userId);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 2. Validate eligibility
    if (user.tier !== "pro") {
      throw new RefundNotEligibleError("Only Pro tier is eligible for refunds");
    }

    if (user.refundStatus === "issued") {
      throw new RefundAlreadyProcessedError("Refund already issued for this subscription");
    }

    if (user.refundStatus === "requested") {
      throw new RefundConcurrencyError("Refund is already being processed for this subscription");
    }

    if (user.refundStatus === "cancel_completed_refund_failed") {
      throw new RefundNotEligibleError("Refund requires manual intervention - subscription was canceled but refund failed");
    }

    const now = new Date();
    if (!user.refundWindowExpiresAt || user.refundWindowExpiresAt <= now) {
      throw new RefundExpiredError("Refund window has expired (must be within 14 days of first payment)");
    }

    if (!user.lastPaymentIntentId) {
      throw new RefundNotEligibleError("No payment intent found for refund");
    }

    // 3. Optimistic lock: Mark as "requested" to prevent concurrent refund attempts
    // This update will only succeed if refundStatus is still "eligible"
    try {
      await this.deps.jobsRepo.updateUserSubscription(userId, {
        refundStatus: "requested",
      });
    }
    catch {
      // If update fails, another request may have already started processing
      throw new RefundConcurrencyError("Unable to process refund - another request may be in progress");
    }

    // Track operation state for error handling
    let cancelCompleted = false;
    let refundIssued = false;

    try {
      // 4. Cancel subscription first (reversible operation)
      if (user.stripeSubscriptionId) {
        this.deps.logger.info({ userId, subscriptionId: user.stripeSubscriptionId }, "Canceling subscription");
        await this.deps.paymentProvider.cancelSubscriptionNow(user.stripeSubscriptionId);
      }
      cancelCompleted = true;

      // 5. Issue refund via payment provider (irreversible operation)
      this.deps.logger.info({ userId, paymentIntentId: user.lastPaymentIntentId }, "Issuing refund");

      const refundResult = await this.deps.paymentProvider.issueRefund({
        paymentIntentId: user.lastPaymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          userId,
          userReason: reason || "14-day money-back guarantee",
        },
      });

      // Mark refund as issued - this is irreversible, used for error handling
      refundIssued = true;

      // 6. Update database: downgrade to free, record refund
      await this.deps.jobsRepo.updateUserSubscription(userId, {
        tier: "free",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null, // Clear subscription ID
        refundStatus: "issued",
        refundIssuedAt: now,
        refundReason: reason || "14-day money-back guarantee",
      });

      // 7. Emit log event for analytics/audit
      this.deps.logger.info({
        userId,
        refundId: refundResult.refundId,
        amount: "full",
        reason: reason || "14-day money-back guarantee",
      }, "Refund issued");

      return refundResult;
    }
    catch (error) {
      // Differentiate failure scenarios based on which operations completed
      if (refundIssued) {
        // Refund was issued (irreversible) but final DB update failed
        // Set status to "issued" to prevent double-refund attempts
        this.deps.logger.error({ userId, error }, "Final DB update failed after refund issued - setting status to issued");
        await this.deps.jobsRepo.updateUserSubscription(userId, {
          refundStatus: "issued",
        });
      }
      else if (cancelCompleted) {
        // Cancel succeeded but refund failed - partial completion state
        // Requires manual intervention, cannot safely retry automatically
        this.deps.logger.error({ userId, error }, "Refund failed after cancel completed - requires manual intervention");
        await this.deps.jobsRepo.updateUserSubscription(userId, {
          refundStatus: "cancel_completed_refund_failed",
        });
      }
      // else: Cancel failed before refund was attempted
      // Status remains "requested" - safe to retry after investigating the issue
      else {
        this.deps.logger.error({ userId, error }, "Cancel failed - status remains requested for retry");
      }
      throw error;
    }
  }

  /**
   * Handle webhook event from Stripe.
   * This is called after signature verification.
   */
  // eslint-disable-next-line ts/no-explicit-any
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
        // Ignore unhandled events (product.created, plan.created, etc.)
        this.deps.logger.debug({ eventType: event.type }, "Ignoring unhandled webhook event");
    }
  }

  /**
   * User completed checkout - create/update subscription.
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    // eslint-disable-next-line ts/consistent-type-assertions
    const tier = session.metadata?.tier as "pro" | "enterprise";

    if (!userId || !tier) {
      this.deps.logger.error({ sessionId: session.id }, "Missing userId or tier in checkout session metadata");
      throw new Error("Missing userId or tier in checkout session metadata");
    }

    this.deps.logger.info({ userId, tier, customerId: session.customer }, "Checkout completed");

    // Calculate refund window (14 days from now)
    const now = new Date();
    const refundWindowExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await this.deps.jobsRepo.updateUserSubscription(userId, {
      tier,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStatus: "active",
      subscriptionEndsAt: null, // Will be set by subscription events
      subscriptionActivatedAt: now,
      refundWindowExpiresAt,
      lastPaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      lastInvoiceId: typeof session.invoice === "string" ? session.invoice : undefined,
      refundStatus: tier === "pro" ? "eligible" : "expired", // Only Pro tier gets refund window
    });
  }

  /**
   * Subscription updated (tier change, renewal, etc.)
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(subscription.customer);

    if (!user) {
      this.deps.logger.warn({ customerId: subscription.customer }, "No user found for Stripe customer");
      return;
    }

    // Extract tier from subscription data using PaymentProvider port
    const tier = this.deps.paymentProvider.extractTierFromSubscription(subscription);

    this.deps.logger.info({ userId: user.id, status: subscription.status, tier }, "Subscription updated");

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      tier: tier ?? undefined,
      subscriptionStatus: subscription.status,
      subscriptionEndsAt: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    });
  }

  /**
   * Subscription canceled/deleted.
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(subscription.customer);

    if (!user) {
      this.deps.logger.warn({ customerId: subscription.customer }, "No user found for Stripe customer");
      return;
    }

    this.deps.logger.info({ userId: user.id }, "Subscription deleted, downgrading to free");

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      tier: "free",
      subscriptionStatus: "canceled",
      subscriptionEndsAt: null,
    });
  }

  /**
   * Payment succeeded - ensure active status.
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(invoice.customer);

    if (!user) {
      this.deps.logger.warn({ customerId: invoice.customer }, "No user found for Stripe customer");
      return;
    }

    // Skip if user already refunded (idempotency check)
    if (user.refundStatus === "issued") {
      this.deps.logger.debug({ userId: user.id }, "Ignoring payment_succeeded for refunded user");
      return;
    }

    // Check if recovering from past_due status
    const isRecovering = user.subscriptionStatus === "past_due";

    if (isRecovering) {
      this.deps.logger.info({ userId: user.id }, "Subscription recovered from past_due to active");
    }
    else {
      this.deps.logger.info({ userId: user.id }, "Payment succeeded");
    }

    const updatePayload: {
      subscriptionStatus: "active";
      lastPaymentIntentId?: string;
      lastInvoiceId?: string;
    } = {
      subscriptionStatus: "active",
    };

    if (typeof invoice.payment_intent === "string" && invoice.payment_intent.length > 0) {
      updatePayload.lastPaymentIntentId = invoice.payment_intent;
    }

    if (typeof invoice.id === "string" && invoice.id.length > 0) {
      updatePayload.lastInvoiceId = invoice.id;
    }

    await this.deps.jobsRepo.updateUserSubscription(user.id, updatePayload);
  }

  /**
   * Payment failed - mark as past_due.
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handlePaymentFailed(invoice: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(invoice.customer);

    if (!user) {
      this.deps.logger.warn({ customerId: invoice.customer }, "No user found for Stripe customer");
      return;
    }

    this.deps.logger.warn({ userId: user.id }, "Payment failed, marking past_due");

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      subscriptionStatus: "past_due",
    });
  }
}
