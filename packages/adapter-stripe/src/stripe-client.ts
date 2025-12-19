import type {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
  PortalSessionParams,
  PortalSessionResult,
  WebhookEvent,
} from "@cronicorn/domain";

import Stripe from "stripe";

export type StripeConfig = {
  secretKey: string;
  proPriceId: string;
  enterprisePriceId: string;
};

/**
 * Stripe implementation of PaymentProvider port.
 *
 * Handles:
 * - Checkout session creation for subscriptions
 * - Customer portal session creation
 * - Webhook signature verification
 * - Price ID to tier mapping
 */
export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;
  private priceMap: Record<"pro" | "enterprise", string>;
  private reversePriceMap: Map<string, "pro" | "enterprise">;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2023-10-16", // Pin API version for stability
      typescript: true,
    });

    this.priceMap = {
      pro: config.proPriceId,
      enterprise: config.enterprisePriceId,
    };

    // Build reverse map for webhook handlers
    this.reversePriceMap = new Map([
      [config.proPriceId, "pro"],
      [config.enterprisePriceId, "enterprise"],
    ]);
  }

  /**
   * Create Stripe Checkout Session for subscription.
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: this.priceMap[params.tier],
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        tier: params.tier,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    // Reuse existing customer if provided
    if (params.existingCustomerId) {
      sessionParams.customer = params.existingCustomerId;
    }
    else {
      sessionParams.customer_email = params.userEmail;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error("Stripe checkout session created but URL is missing");
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  /**
   * Create Customer Portal Session for self-service.
   */
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

  /**
   * Verify webhook signature and parse event.
   *
   * SECURITY: Validates that webhook came from Stripe.
   * Throws if signature verification fails.
   */
  async verifyWebhook(payload: string, signature: string, secret: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);

    return {
      id: event.id,
      type: event.type,
      data: event.data.object,
    };
  }

  /**
   * Extract tier from subscription data.
   *
   * Implements PaymentProvider port method.
   * Stripe stores tier in subscription line items → price → id.
   *
   * @param subscriptionData - Raw Stripe subscription object
   * @returns Tier name or null if not found
   */
  extractTierFromSubscription(subscriptionData: unknown): "pro" | "enterprise" | null {
    // Type guard for Stripe subscription structure
    if (
      typeof subscriptionData === "object"
      && subscriptionData !== null
      && "items" in subscriptionData
    ) {
      // Type-safe extraction with runtime checks
      const subscription: unknown = subscriptionData;
      if (
        subscription
        && typeof subscription === "object"
        && "items" in subscription
        && subscription.items
        && typeof subscription.items === "object"
        && "data" in subscription.items
        && Array.isArray(subscription.items.data)
        && subscription.items.data.length > 0
      ) {
        const firstItem = subscription.items.data[0];
        if (
          firstItem
          && typeof firstItem === "object"
          && "price" in firstItem
          && firstItem.price
          && typeof firstItem.price === "object"
          && "id" in firstItem.price
          && typeof firstItem.price.id === "string"
        ) {
          return this.reversePriceMap.get(firstItem.price.id) ?? null;
        }
      }
    }

    return null;
  }

  /**
   * Issue a refund for a payment.
   *
   * @param params - Refund parameters
   * @returns Refund ID and status
   */
  async issueRefund(params: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: "requested_by_customer" | "duplicate" | "fraudulent";
    metadata?: Record<string, string>;
  }): Promise<{ refundId: string; status: string }> {
    const refund = await this.stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amountCents,
      reason: params.reason,
      metadata: params.metadata,
    });

    return {
      refundId: refund.id,
      status: refund.status,
    };
  }

  /**
   * Cancel subscription immediately (no grace period).
   *
   * @param subscriptionId - Stripe subscription ID
   */
  async cancelSubscriptionNow(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId, {
      prorate: false,
      invoice_now: false,
    });
  }

  /**
   * Map Stripe price ID back to tier.
   *
   * @deprecated Use extractTierFromSubscription instead for port compliance
   * @param priceId - Stripe price ID
   * @returns Tier name or null if not found
   */
  getTierFromPriceId(priceId: string): "pro" | "enterprise" | null {
    return this.reversePriceMap.get(priceId) ?? null;
  }
}
