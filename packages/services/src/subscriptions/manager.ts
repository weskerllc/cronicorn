import type { CreateCheckoutInput, CreatePortalInput, SubscriptionDeps, SubscriptionStatus } from "./types.js";

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
    const { userId, tier } = input;

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

    // Return tier and subscription details
    // Note: subscriptionStatus and endsAt are on user table but not returned by getUserById
    // For MVP, just return tier - can enhance later
    return {
      tier: user.tier,
      status: null, // TODO: Add to getUserById return type
      endsAt: null, // TODO: Add to getUserById return type
    };
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
        // eslint-disable-next-line no-console
        console.log(`[SubscriptionsManager] Ignoring unhandled webhook event: ${event.type}`);
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
      console.error("[SubscriptionsManager] Missing userId or tier in checkout session metadata", session);
      throw new Error("Missing userId or tier in checkout session metadata");
    }

    // eslint-disable-next-line no-console
    console.log(`[SubscriptionsManager] Checkout completed: user=${userId}, tier=${tier}, customer=${session.customer}`);

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
  // eslint-disable-next-line ts/no-explicit-any
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(subscription.customer);

    if (!user) {
      console.warn(`[SubscriptionsManager] No user found for Stripe customer: ${subscription.customer}`);
      return;
    }

    // Extract tier from subscription data using PaymentProvider port
    const tier = this.deps.paymentProvider.extractTierFromSubscription(subscription);

    // eslint-disable-next-line no-console
    console.log(`[SubscriptionsManager] Subscription updated: user=${user.id}, status=${subscription.status}, tier=${tier}`);

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
      console.warn(`[SubscriptionsManager] No user found for Stripe customer: ${subscription.customer}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`[SubscriptionsManager] Subscription deleted: user=${user.id}, downgrading to free`);

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
      console.warn(`[SubscriptionsManager] No user found for Stripe customer: ${invoice.customer}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`[SubscriptionsManager] Payment succeeded: user=${user.id}`);

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      subscriptionStatus: "active",
    });
  }

  /**
   * Payment failed - mark as past_due.
   */
  // eslint-disable-next-line ts/no-explicit-any
  private async handlePaymentFailed(invoice: any): Promise<void> {
    const user = await this.deps.jobsRepo.getUserByStripeCustomerId(invoice.customer);

    if (!user) {
      console.warn(`[SubscriptionsManager] No user found for Stripe customer: ${invoice.customer}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`[SubscriptionsManager] Payment failed: user=${user.id}, marking past_due`);

    await this.deps.jobsRepo.updateUserSubscription(user.id, {
      subscriptionStatus: "past_due",
    });
  }
}
