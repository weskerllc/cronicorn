import type { CheckoutSessionParams, PortalSessionParams } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { StripePaymentProvider } from "../stripe-client.js";

/**
 * Unit tests for StripePaymentProvider
 *
 * Tests the adapter layer between domain ports and Stripe SDK.
 * Mocks Stripe SDK calls to avoid external API dependencies.
 */

// Mock the Stripe SDK
vi.mock("stripe", () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }));

  return { default: MockStripe };
});

describe("stripePaymentProvider", () => {
  let provider: StripePaymentProvider;
  let mockStripe: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create provider instance
    provider = new StripePaymentProvider({
      secretKey: "sk_test_fake_key",
      proPriceId: "price_pro_123",
      enterprisePriceId: "price_enterprise_456",
    });

    // Get the mocked Stripe instance
    // @ts-expect-error - accessing private field for testing
    mockStripe = provider.stripe;
  });

  describe("createCheckoutSession", () => {
    it("should create checkout session with new customer", async () => {
      const mockSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const params: CheckoutSessionParams = {
        userId: "user_123",
        userEmail: "test@example.com",
        tier: "pro",
        successUrl: "https://app.example.com/success",
        cancelUrl: "https://app.example.com/cancel",
      };

      const result = await provider.createCheckoutSession(params);

      expect(result).toEqual({
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: "price_pro_123",
            quantity: 1,
          },
        ],
        metadata: {
          userId: "user_123",
          tier: "pro",
        },
        success_url: "https://app.example.com/success",
        cancel_url: "https://app.example.com/cancel",
        customer_email: "test@example.com",
      });
    });

    it("should create checkout session with existing customer", async () => {
      const mockSession = {
        id: "cs_test_456",
        url: "https://checkout.stripe.com/pay/cs_test_456",
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const params: CheckoutSessionParams = {
        userId: "user_123",
        userEmail: "test@example.com",
        tier: "enterprise",
        successUrl: "https://app.example.com/success",
        cancelUrl: "https://app.example.com/cancel",
        existingCustomerId: "cus_existing_123",
      };

      const result = await provider.createCheckoutSession(params);

      expect(result.sessionId).toBe("cs_test_456");

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: "price_enterprise_456",
            quantity: 1,
          },
        ],
        metadata: {
          userId: "user_123",
          tier: "enterprise",
        },
        success_url: "https://app.example.com/success",
        cancel_url: "https://app.example.com/cancel",
        customer: "cus_existing_123",
      });
    });

    it("should throw error if checkout URL is missing", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_789",
        url: null, // Missing URL
      });

      const params: CheckoutSessionParams = {
        userId: "user_123",
        userEmail: "test@example.com",
        tier: "pro",
        successUrl: "https://app.example.com/success",
        cancelUrl: "https://app.example.com/cancel",
      };

      await expect(provider.createCheckoutSession(params)).rejects.toThrow(
        "Stripe checkout session created but URL is missing",
      );
    });
  });

  describe("createPortalSession", () => {
    it("should create customer portal session", async () => {
      const mockSession = {
        id: "bps_test_123",
        url: "https://billing.stripe.com/session/bps_test_123",
      };

      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const params: PortalSessionParams = {
        customerId: "cus_123",
        returnUrl: "https://app.example.com/settings",
      };

      const result = await provider.createPortalSession(params);

      expect(result).toEqual({
        sessionId: "bps_test_123",
        portalUrl: "https://billing.stripe.com/session/bps_test_123",
      });

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://app.example.com/settings",
      });
    });
  });

  describe("verifyWebhook", () => {
    it("should verify webhook signature and return event", async () => {
      const mockEvent = {
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            customer: "cus_123",
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const payload = JSON.stringify({ test: "payload" });
      const signature = "t=123,v1=signature";
      const secret = "whsec_test_secret";

      const result = await provider.verifyWebhook(payload, signature, secret);

      expect(result).toEqual({
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: mockEvent.data.object,
      });

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        secret,
      );
    });

    it("should throw error on invalid signature", async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const payload = "invalid";
      const signature = "bad_signature";
      const secret = "whsec_test_secret";

      await expect(
        provider.verifyWebhook(payload, signature, secret),
      ).rejects.toThrow("Invalid signature");
    });
  });

  describe("getTierFromPriceId", () => {
    it("should return pro tier for pro price ID", () => {
      const tier = provider.getTierFromPriceId("price_pro_123");
      expect(tier).toBe("pro");
    });

    it("should return enterprise tier for enterprise price ID", () => {
      const tier = provider.getTierFromPriceId("price_enterprise_456");
      expect(tier).toBe("enterprise");
    });

    it("should return null for unknown price ID", () => {
      const tier = provider.getTierFromPriceId("price_unknown_999");
      expect(tier).toBeNull();
    });
  });
});
