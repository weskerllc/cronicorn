/**
 * External service ports (payment providers, etc.)
 */

export type CheckoutSessionParams = {
  userId: string;
  userEmail: string;
  tier: "pro" | "enterprise";
  billingPeriod?: "monthly" | "annual"; // Optional: defaults to monthly pricing
  successUrl: string;
  cancelUrl: string;
  existingCustomerId?: string; // Reuse existing Stripe customer if available
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

/**
 * PaymentProvider port for subscription management.
 *
 * Abstracts payment provider (Stripe) from domain logic.
 * Implementations handle checkout sessions, customer portal, and webhook verification.
 */
export type PaymentProvider = {
  /**
   * Create Stripe Checkout Session for subscription.
   *
   * @param params - Checkout session parameters
   * @returns Session ID and checkout URL
   */
  createCheckoutSession: (params: CheckoutSessionParams) => Promise<CheckoutSessionResult>;

  /**
   * Create Customer Portal Session for self-service.
   *
   * Allows users to manage payment methods, view invoices, and cancel subscriptions.
   *
   * @param params - Portal session parameters
   * @returns Session ID and portal URL
   */
  createPortalSession: (params: PortalSessionParams) => Promise<PortalSessionResult>;

  /**
   * Verify webhook signature and parse event.
   *
   * SECURITY: This method MUST verify the webhook signature to prevent
   * malicious actors from faking subscription events.
   *
   * @param payload - Raw webhook payload (string)
   * @param signature - Signature from webhook header
   * @param secret - Webhook signing secret
   * @returns Parsed webhook event
   * @throws Error if signature verification fails
   */
  verifyWebhook: (payload: string, signature: string, secret: string) => Promise<WebhookEvent>;

  /**
   * Extract tier from subscription price information.
   *
   * Payment providers encode tier information in price/plan IDs.
   * This method provides a provider-agnostic way to determine tier from subscription data.
   *
   * @param subscriptionData - Raw subscription data from webhook/API
   * @returns Tier name or null if tier cannot be determined
   */
  extractTierFromSubscription: (subscriptionData: unknown) => "pro" | "enterprise" | null;

  /**
   * Issue a refund for a payment.
   *
   * Refunds the full amount for the specified payment intent.
   * Used for 14-day money-back guarantee implementation.
   *
   * @param params - Refund parameters
   * @returns Refund ID and status from payment provider
   */
  issueRefund: (params: {
    paymentIntentId: string;
    amountCents?: number; // Optional: defaults to full amount
    reason?: "requested_by_customer" | "duplicate" | "fraudulent";
    metadata?: Record<string, string>;
  }) => Promise<{ refundId: string; status: string }>;

  /**
   * Cancel subscription immediately (no grace period).
   *
   * Cancels the subscription effective immediately, preventing future charges.
   * Used when issuing refunds to ensure no additional billing.
   *
   * @param subscriptionId - Stripe subscription ID
   */
  cancelSubscriptionNow: (subscriptionId: string) => Promise<void>;
};
