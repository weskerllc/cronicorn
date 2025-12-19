import type { JobsRepo, PaymentProvider } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionsManager } from "../manager.js";

/**
 * Unit tests for SubscriptionsManager
 *
 * Tests business logic for subscription management and webhook handling.
 * Mocks all external dependencies (repos, payment provider).
 */

describe("subscriptionsManager", () => {
  let manager: SubscriptionsManager;
  let mockJobsRepo: JobsRepo;
  let mockPaymentProvider: PaymentProvider;

  // Helper to create complete user mock with all refund fields
  const createMockUser = (overrides: Partial<{
    id: string;
    email: string;
    tier: "free" | "pro" | "enterprise";
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionActivatedAt: Date | null;
    refundWindowExpiresAt: Date | null;
    lastPaymentIntentId: string | null;
    lastInvoiceId: string | null;
    refundStatus: string | null;
    refundIssuedAt: Date | null;
  }>) => ({
    id: "user_123",
    email: "test@example.com",
    tier: "free" as const,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionActivatedAt: null,
    refundWindowExpiresAt: null,
    lastPaymentIntentId: null,
    lastInvoiceId: null,
    refundStatus: null,
    refundIssuedAt: null,
    ...overrides,
  });

  // Helper to create user from webhook lookup (fewer fields)
  const createMockWebhookUser = (overrides: Partial<{
    id: string;
    email: string;
    refundStatus: string | null;
  }>) => ({
    id: "user_123",
    email: "test@example.com",
    refundStatus: null,
    ...overrides,
  });

  beforeEach(() => {
    // Mock JobsRepo
    mockJobsRepo = {
      getUserById: vi.fn(),
      getEndpointCounts: vi.fn(),
      getUserByStripeCustomerId: vi.fn(),
      updateUserSubscription: vi.fn(),
      // Other methods not used in subscription tests
      getUserTier: vi.fn(),
      createJob: vi.fn(),
      getJob: vi.fn(),
      listJobs: vi.fn(),
      updateJob: vi.fn(),
      archiveJob: vi.fn(),
      pauseJob: vi.fn(),
      resumeJob: vi.fn(),
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      listEndpointsByJob: vi.fn(),
      getEndpoint: vi.fn(),
      deleteEndpoint: vi.fn(),
      archiveEndpoint: vi.fn(),
      countEndpointsByUser: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      setNextRunAtIfEarlier: vi.fn(),
      writeAIHint: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      setPausedUntil: vi.fn(),
      updateAfterRun: vi.fn(),
      getUsage: vi.fn(),
    };

    // Mock PaymentProvider (including extractTierFromSubscription)
    mockPaymentProvider = {
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhook: vi.fn(),
      extractTierFromSubscription: vi.fn(),
      issueRefund: vi.fn(),
      cancelSubscriptionNow: vi.fn(),
    };

    manager = new SubscriptionsManager({
      jobsRepo: mockJobsRepo,
      paymentProvider: mockPaymentProvider,
      baseUrl: "http://localhost:5173",
    });
  });

  describe("createCheckout", () => {
    it("should create checkout session for new subscriber", async () => {
      const mockUser = createMockUser({
        id: "user_123",
        email: "test@example.com",
        tier: "free",
        stripeCustomerId: null,
      });

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockPaymentProvider.createCheckoutSession).mockResolvedValue({
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      });

      const result = await manager.createCheckout({
        userId: "user_123",
        tier: "pro",
      });

      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_test_123");

      expect(mockPaymentProvider.createCheckoutSession).toHaveBeenCalledWith({
        userId: "user_123",
        userEmail: "test@example.com",
        tier: "pro",
        successUrl: "http://localhost:5173/dashboard?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:5173/pricing",
        existingCustomerId: undefined,
      });
    });

    it("should reuse existing Stripe customer", async () => {
      const mockUser = createMockUser({
        id: "user_123",
        email: "test@example.com",
        tier: "pro",
        stripeCustomerId: "cus_existing_123",
      });

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockPaymentProvider.createCheckoutSession).mockResolvedValue({
        sessionId: "cs_test_456",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_456",
      });

      await manager.createCheckout({
        userId: "user_123",
        tier: "enterprise",
      });

      expect(mockPaymentProvider.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          existingCustomerId: "cus_existing_123",
        }),
      );
    });

    it("should throw error if user not found", async () => {
      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(null);

      await expect(
        manager.createCheckout({ userId: "unknown", tier: "pro" }),
      ).rejects.toThrow("User not found: unknown");
    });
  });

  describe("createPortal", () => {
    it("should create portal session for subscriber", async () => {
      const mockUser = createMockUser({
        id: "user_123",
        email: "test@example.com",
        tier: "pro",
        stripeCustomerId: "cus_123",
      });

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockPaymentProvider.createPortalSession).mockResolvedValue({
        sessionId: "bps_test_123",
        portalUrl: "https://billing.stripe.com/session/bps_test_123",
      });

      const result = await manager.createPortal({ userId: "user_123" });

      expect(result.portalUrl).toBe("https://billing.stripe.com/session/bps_test_123");

      expect(mockPaymentProvider.createPortalSession).toHaveBeenCalledWith({
        customerId: "cus_123",
        returnUrl: "http://localhost:5173/settings",
      });
    });

    it("should throw error if user has no subscription", async () => {
      const mockUser = createMockUser({
        id: "user_123",
        email: "test@example.com",
        tier: "free",
        stripeCustomerId: null,
      });

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      await expect(manager.createPortal({ userId: "user_123" })).rejects.toThrow(
        "User has no active subscription",
      );
    });
  });

  describe("getSubscriptionStatus", () => {
    it("should return subscription status", async () => {
      const mockUser = createMockUser({
        id: "user_123",
        email: "test@example.com",
        tier: "pro",
        stripeCustomerId: "cus_123",
      });

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      const result = await manager.getSubscriptionStatus("user_123");

      expect(result).toEqual({
        tier: "pro",
        status: null,
        endsAt: null,
        refundEligibility: {
          eligible: false,
          expiresAt: null,
          status: null,
        },
      });
    });
  });

  describe("webhook handling", () => {
    describe("checkout.session.completed", () => {
      it("should update user subscription on checkout completion", async () => {
        const event = {
          type: "checkout.session.completed",
          data: {
            metadata: {
              userId: "user_123",
              tier: "pro",
            },
            customer: "cus_123",
            subscription: "sub_123",
          },
        };

        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", expect.objectContaining({
          tier: "pro",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: "active",
          subscriptionEndsAt: null,
          subscriptionActivatedAt: expect.any(Date),
          refundWindowExpiresAt: expect.any(Date),
          lastPaymentIntentId: undefined,
          lastInvoiceId: undefined,
          refundStatus: "eligible",
        }));
      });

      it("should throw error if metadata is missing", async () => {
        const event = {
          type: "checkout.session.completed",
          data: {
            metadata: {},
            customer: "cus_123",
          },
        };

        await expect(manager.handleWebhookEvent(event)).rejects.toThrow(
          "Missing userId or tier in checkout session metadata",
        );
      });
    });

    describe("customer.subscription.updated", () => {
      it("should update subscription details", async () => {
        const mockUser = createMockUser({
          id: "user_123",
          email: "test@example.com",
          tier: "pro",
        });

        vi.mocked(mockJobsRepo.getUserByStripeCustomerId).mockResolvedValue(createMockWebhookUser({ id: mockUser.id, email: mockUser.email }));
        vi.mocked(mockPaymentProvider.extractTierFromSubscription).mockReturnValue("enterprise");

        const event = {
          type: "customer.subscription.updated",
          data: {
            customer: "cus_123",
            status: "active",
            items: {
              data: [
                {
                  price: {
                    id: "price_enterprise_456",
                  },
                },
              ],
            },
            current_period_end: 1735689600, // 2025-01-01
          },
        };

        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", {
          tier: "enterprise",
          subscriptionStatus: "active",
          subscriptionEndsAt: new Date(1735689600 * 1000),
        });
      });

      it("should handle missing user gracefully", async () => {
        vi.mocked(mockJobsRepo.getUserByStripeCustomerId).mockResolvedValue(null);

        const event = {
          type: "customer.subscription.updated",
          data: {
            customer: "cus_unknown",
            status: "active",
          },
        };

        // Should not throw, just log warning
        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).not.toHaveBeenCalled();
      });
    });

    describe("customer.subscription.deleted", () => {
      it("should downgrade user to free tier", async () => {
        const mockUser = createMockUser({
          id: "user_123",
          email: "test@example.com",
          tier: "pro",
        });

        vi.mocked(mockJobsRepo.getUserByStripeCustomerId).mockResolvedValue(createMockWebhookUser({ id: mockUser.id, email: mockUser.email }));

        const event = {
          type: "customer.subscription.deleted",
          data: {
            customer: "cus_123",
          },
        };

        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", {
          tier: "free",
          subscriptionStatus: "canceled",
          subscriptionEndsAt: null,
        });
      });
    });

    describe("invoice.payment_succeeded", () => {
      it("should mark subscription as active and capture payment intent", async () => {
        const mockUser = createMockUser({
          id: "user_123",
          email: "test@example.com",
          tier: "pro",
        });

        vi.mocked(mockJobsRepo.getUserByStripeCustomerId).mockResolvedValue(createMockWebhookUser({ id: mockUser.id, email: mockUser.email }));

        const event = {
          type: "invoice.payment_succeeded",
          data: {
            customer: "cus_123",
            payment_intent: "pi_456",
            id: "in_456",
          },
        };

        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", {
          subscriptionStatus: "active",
          lastPaymentIntentId: "pi_456",
          lastInvoiceId: "in_456",
        });
      });
    });

    describe("invoice.payment_failed", () => {
      it("should mark subscription as past_due", async () => {
        const mockUser = createMockUser({
          id: "user_123",
          email: "test@example.com",
          tier: "pro",
        });

        vi.mocked(mockJobsRepo.getUserByStripeCustomerId).mockResolvedValue(createMockWebhookUser({ id: mockUser.id, email: mockUser.email }));

        const event = {
          type: "invoice.payment_failed",
          data: {
            customer: "cus_123",
          },
        };

        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", {
          subscriptionStatus: "past_due",
        });
      });
    });

    describe("unhandled events", () => {
      it("should ignore unknown event types", async () => {
        const event = {
          type: "customer.created",
          data: {},
        };

        // Should not throw
        await manager.handleWebhookEvent(event);

        expect(mockJobsRepo.updateUserSubscription).not.toHaveBeenCalled();
      });
    });
  });

  describe("requestRefund", () => {
    it("should issue refund for eligible Pro user within 14-day window", async () => {
      const now = new Date();
      const activatedAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const expiresAt = new Date(activatedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days after activation

      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        tier: "pro" as const,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionActivatedAt: activatedAt,
        refundWindowExpiresAt: expiresAt,
        lastPaymentIntentId: "pi_test_456",
        lastInvoiceId: "in_test_789",
        refundStatus: "eligible",
        refundIssuedAt: null,
      };

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockPaymentProvider.issueRefund).mockResolvedValue({
        refundId: "re_test_123",
        status: "succeeded",
      });
      vi.mocked(mockPaymentProvider.cancelSubscriptionNow).mockResolvedValue();

      const result = await manager.requestRefund({
        userId: "user_123",
        reason: "Not satisfied",
      });

      expect(result.refundId).toBe("re_test_123");
      expect(result.status).toBe("succeeded");

      // Verify refund was issued
      expect(mockPaymentProvider.issueRefund).toHaveBeenCalledWith({
        paymentIntentId: "pi_test_456",
        reason: "requested_by_customer",
        metadata: {
          userId: "user_123",
          userReason: "Not satisfied",
        },
      });

      // Verify subscription was canceled
      expect(mockPaymentProvider.cancelSubscriptionNow).toHaveBeenCalledWith("sub_123");

      // Verify database was updated
      expect(mockJobsRepo.updateUserSubscription).toHaveBeenCalledWith("user_123", {
        tier: "free",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: undefined,
        refundStatus: "issued",
        refundIssuedAt: expect.any(Date),
        refundReason: "Not satisfied",
      });
    });

    it("should reject refund for non-Pro tier", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        tier: "free" as const,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionActivatedAt: null,
        refundWindowExpiresAt: null,
        lastPaymentIntentId: null,
        lastInvoiceId: null,
        refundStatus: null,
        refundIssuedAt: null,
      };

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      await expect(
        manager.requestRefund({ userId: "user_123", reason: "Test" }),
      ).rejects.toThrow("Only Pro tier is eligible for refunds");
    });

    it("should reject refund if already issued", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        tier: "pro" as const,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionActivatedAt: new Date("2025-01-10T00:00:00Z"),
        refundWindowExpiresAt: new Date("2025-01-24T00:00:00Z"),
        lastPaymentIntentId: "pi_test_456",
        lastInvoiceId: "in_test_789",
        refundStatus: "issued",
        refundIssuedAt: new Date("2025-01-12T00:00:00Z"),
      };

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      await expect(
        manager.requestRefund({ userId: "user_123" }),
      ).rejects.toThrow("Refund already issued");
    });

    it("should reject refund if window expired", async () => {
      const _now = new Date("2025-02-01T00:00:00Z");
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        tier: "pro" as const,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionActivatedAt: new Date("2025-01-10T00:00:00Z"),
        refundWindowExpiresAt: new Date("2025-01-24T00:00:00Z"), // Expired
        lastPaymentIntentId: "pi_test_456",
        lastInvoiceId: "in_test_789",
        refundStatus: "eligible",
        refundIssuedAt: null,
      };

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      await expect(
        manager.requestRefund({ userId: "user_123" }),
      ).rejects.toThrow("Refund window has expired");
    });

    it("should reject refund if no payment intent found", async () => {
      const now = new Date();
      const activatedAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const expiresAt = new Date(activatedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days after activation

      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        tier: "pro" as const,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionActivatedAt: activatedAt,
        refundWindowExpiresAt: expiresAt,
        lastPaymentIntentId: null, // Missing
        lastInvoiceId: null,
        refundStatus: "eligible",
        refundIssuedAt: null,
      };

      vi.mocked(mockJobsRepo.getUserById).mockResolvedValue(mockUser);

      await expect(
        manager.requestRefund({ userId: "user_123" }),
      ).rejects.toThrow("No payment intent found");
    });
  });
});
