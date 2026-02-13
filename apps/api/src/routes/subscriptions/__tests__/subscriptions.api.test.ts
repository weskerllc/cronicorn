import type { PaymentProvider } from "@cronicorn/domain";

import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, createTestUser, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createMockAuth, createMockSession } from "../../../lib/__tests__/test-helpers.js";

/**
 * API integration tests for subscription routes.
 *
 * Tests the full HTTP request/response cycle including:
 * - Route validation and OpenAPI schemas
 * - Authentication middleware
 * - Request/response mapping
 * - Error handling
 * - Payment provider integration (mocked)
 *
 * Uses real database with transaction-per-test pattern.
 * Auth and PaymentProvider are mocked via test helpers.
 */

// Helper to safely extract JSON from response
// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

const mockUserId = "test-subscription-user-1";

const testConfig: Env = {
  NODE_ENV: "test",
  LOG_LEVEL: "debug",
  PORT: 3000,
  DATABASE_URL: "postgres://test",
  DB_POOL_MAX: 5,
  DB_POOL_IDLE_TIMEOUT_MS: 20000,
  DB_POOL_CONNECTION_TIMEOUT_MS: 10000,
  API_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000/api/auth",
  GITHUB_CLIENT_ID: "test_client_id",
  GITHUB_CLIENT_SECRET: "test_client_secret",
  STRIPE_SECRET_KEY: "sk_test_fake_key_for_testing",
  ADMIN_USER_EMAIL: "admin@example.com",
  ADMIN_USER_PASSWORD: "test-password-123",
  ADMIN_USER_NAME: "Admin User",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fake_secret",
  STRIPE_PRICE_PRO: "price_test_pro",
  STRIPE_PRICE_PRO_ANNUAL: "price_test_pro_annual",
  STRIPE_PRICE_ENTERPRISE: "price_test_enterprise",
  BASE_URL: "http://localhost:5173",
  RATE_LIMIT_MUTATION_RPM: 60,
  RATE_LIMIT_READ_RPM: 120,
  SHUTDOWN_TIMEOUT_MS: 30000,
};

/**
 * Creates a mock PaymentProvider for testing subscription endpoints.
 *
 * Returns configurable mock that tracks calls and returns predictable responses.
 * Override specific methods as needed for individual test scenarios.
 */
function createMockPaymentProvider(overrides?: Partial<PaymentProvider>): PaymentProvider {
  return {
    createCheckoutSession: async params => ({
      sessionId: `cs_test_${params.userId}`,
      checkoutUrl: `https://checkout.stripe.com/test/${params.userId}`,
    }),
    createPortalSession: async params => ({
      sessionId: `ps_test_${params.customerId}`,
      portalUrl: `https://billing.stripe.com/test/${params.customerId}`,
    }),
    verifyWebhook: async () => ({
      id: "evt_test_123",
      type: "checkout.session.completed",
      data: {},
    }),
    extractTierFromSubscription: () => "pro",
    issueRefund: async () => ({
      refundId: "re_test_123",
      status: "succeeded",
    }),
    cancelSubscriptionNow: async () => {},
    ...overrides,
  };
}

describe("subscriptions API", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  // ==================== GET /api/subscriptions/status ====================

  describe("get /api/subscriptions/status", () => {
    test("returns 401 for unauthenticated request", async ({ tx }) => {
      // Create an app with no auth session (null session returns 401)
      // eslint-disable-next-line ts/consistent-type-assertions -- passing null to simulate unauthenticated request
      const mockAuth = createMockAuth(null as unknown as ReturnType<typeof createMockSession>);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });

    test("returns free tier status for free user", async ({ tx }) => {
      // Create a free tier user
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        tier: "free",
        status: null,
        endsAt: null,
        refundEligibility: {
          eligible: false,
          expiresAt: null,
          status: null,
        },
      });
    });

    test("returns pro tier status for pro user", async ({ tx }) => {
      // Create a pro tier user (no refund window - already expired)
      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        subscriptionStatus: "active",
        refundStatus: "expired", // Refund window already expired
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        tier: "pro",
        refundEligibility: {
          eligible: false,
          status: "expired",
        },
      });
    });

    test("returns refund eligibility true for pro user within 14-day window", async ({ tx }) => {
      // Create a pro tier user within the 14-day refund window
      const now = new Date();
      const refundWindowExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now (still in window)

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_test_456",
        stripeSubscriptionId: "sub_test_456",
        subscriptionStatus: "active",
        refundStatus: "eligible",
        refundWindowExpiresAt,
        lastPaymentIntentId: "pi_test_123",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        tier: "pro",
        refundEligibility: {
          eligible: true,
          status: "eligible",
        },
      });
      // Verify expiresAt is in the future
      expect(new Date(data.refundEligibility.expiresAt).getTime()).toBeGreaterThan(now.getTime());
    });

    test("returns refund eligibility false for pro user with expired window", async ({ tx }) => {
      // Create a pro tier user with expired refund window
      const now = new Date();
      const refundWindowExpiresAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago (expired)

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_test_789",
        stripeSubscriptionId: "sub_test_789",
        subscriptionStatus: "active",
        refundStatus: "eligible", // Still marked as eligible but window expired
        refundWindowExpiresAt,
        lastPaymentIntentId: "pi_test_456",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        tier: "pro",
        refundEligibility: {
          eligible: false, // Should be false because window expired
          status: "eligible", // Status in DB still shows eligible, but calculated value is false
        },
      });
    });

    test("returns refund eligibility false for pro user who already got refund", async ({ tx }) => {
      // Create a pro tier user who already received a refund
      const now = new Date();
      const refundWindowExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Still in window

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_test_issued",
        stripeSubscriptionId: "sub_test_issued",
        subscriptionStatus: "active",
        refundStatus: "issued", // Already received refund
        refundWindowExpiresAt,
        lastPaymentIntentId: "pi_test_issued",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/status", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        tier: "pro",
        refundEligibility: {
          eligible: false, // Not eligible because already issued
          status: "issued",
        },
      });
    });
  });

  // ==================== POST /api/subscriptions/checkout ====================

  describe("post /api/subscriptions/checkout", () => {
    test("returns 401 for unauthenticated request", async ({ tx }) => {
      // eslint-disable-next-line ts/consistent-type-assertions -- passing null to simulate unauthenticated request
      const mockAuth = createMockAuth(null as unknown as ReturnType<typeof createMockSession>);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "pro", billingPeriod: "monthly" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
    });

    test("returns checkout URL for valid pro monthly request", async ({ tx }) => {
      // Create a free tier user who wants to upgrade
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "pro", billingPeriod: "monthly" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        checkoutUrl: expect.stringContaining("https://checkout.stripe.com/test/"),
      });
    });

    test("returns checkout URL for valid pro annual request", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "pro", billingPeriod: "annual" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        checkoutUrl: expect.stringContaining("https://checkout.stripe.com/test/"),
      });
    });

    test("returns checkout URL for enterprise tier request", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "enterprise", billingPeriod: "monthly" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        checkoutUrl: expect.stringContaining("https://checkout.stripe.com/test/"),
      });
    });

    test("returns 422 for invalid tier", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "invalid-tier", billingPeriod: "monthly" }),
        headers: { "Content-Type": "application/json" },
      });

      // Zod OpenAPI validation returns 422 for invalid enum values
      expect(res.status).toBe(422);
    });

    test("returns 422 for invalid billing period", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "pro", billingPeriod: "weekly" }),
        headers: { "Content-Type": "application/json" },
      });

      // Zod OpenAPI validation returns 422 for invalid enum values
      expect(res.status).toBe(422);
    });

    test("uses default monthly billing when billingPeriod not provided", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: "pro" }), // No billingPeriod - should default to monthly
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        checkoutUrl: expect.stringContaining("https://checkout.stripe.com/test/"),
      });
    });

    test("returns 422 for missing tier", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ billingPeriod: "monthly" }), // Missing tier
        headers: { "Content-Type": "application/json" },
      });

      // Zod OpenAPI validation returns 422 for missing required fields
      expect(res.status).toBe(422);
    });
  });

  // ==================== POST /api/subscriptions/portal ====================

  describe("post /api/subscriptions/portal", () => {
    test("returns 401 for unauthenticated request", async ({ tx }) => {
      // eslint-disable-next-line ts/consistent-type-assertions -- passing null to simulate unauthenticated request
      const mockAuth = createMockAuth(null as unknown as ReturnType<typeof createMockSession>);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/portal", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
    });

    test("returns portal URL for user with active subscription", async ({ tx }) => {
      // Create a pro tier user with Stripe customer ID
      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_portal_test_123",
        stripeSubscriptionId: "sub_portal_test_123",
        subscriptionStatus: "active",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/portal", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        portalUrl: expect.stringContaining("https://billing.stripe.com/test/"),
      });
    });

    test("returns 400 for user without subscription (no Stripe customer)", async ({ tx }) => {
      // Create a free tier user without Stripe customer ID
      await createTestUser(tx, {
        id: mockUserId,
        tier: "free",
        // No stripeCustomerId - this user has never subscribed
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/portal", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      // Handler returns 400 via handleErrorResponse for "User has no active subscription" error
      // This matches the /no.*subscription/i pattern in error-utils.ts
      expect(res.status).toBe(400);
      const data = await getJson(res);

      expect(data).toMatchObject({
        error: "User has no active subscription",
      });
    });

    test("returns portal URL for canceled user who still has Stripe customer", async ({ tx }) => {
      // Create a user who was pro but canceled - they still have a customer ID
      // and should be able to access the portal for invoice history, etc.
      await createTestUser(tx, {
        id: mockUserId,
        tier: "free", // Downgraded to free after cancel
        stripeCustomerId: "cus_canceled_123", // But still has customer ID
        stripeSubscriptionId: null, // No active subscription
        subscriptionStatus: "canceled",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/portal", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        portalUrl: expect.stringContaining("https://billing.stripe.com/test/"),
      });
    });
  });

  // ==================== POST /api/subscriptions/refund ====================

  describe("post /api/subscriptions/refund", () => {
    test("returns 401 for unauthenticated request", async ({ tx }) => {
      // eslint-disable-next-line ts/consistent-type-assertions -- passing null to simulate unauthenticated request
      const mockAuth = createMockAuth(null as unknown as ReturnType<typeof createMockSession>);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Test" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
    });

    test("returns 400 for non-pro user", async ({ tx }) => {
      // Create a free tier user who is not eligible for refund
      await createTestUser(tx, {
        id: mockUserId,
        tier: "free",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Want a refund" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = await getJson(res);
      expect(data.error).toContain("Only Pro tier is eligible for refunds");
    });

    test("returns 400 for expired refund window", async ({ tx }) => {
      // Create a pro tier user with expired refund window
      const now = new Date();
      const expiredWindowDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_expired_window",
        stripeSubscriptionId: "sub_expired_window",
        subscriptionStatus: "active",
        refundStatus: "eligible",
        refundWindowExpiresAt: expiredWindowDate, // Window already expired
        lastPaymentIntentId: "pi_expired_test",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Too late for refund" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = await getJson(res);
      expect(data.error).toContain("Refund window has expired");
    });

    test("returns 400 for already refunded user", async ({ tx }) => {
      // Create a pro tier user who already received a refund
      const now = new Date();
      const futureWindowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_already_refunded",
        stripeSubscriptionId: "sub_already_refunded",
        subscriptionStatus: "active",
        refundStatus: "issued", // Already received refund
        refundWindowExpiresAt: futureWindowDate,
        lastPaymentIntentId: "pi_already_refunded",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Want another refund" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = await getJson(res);
      expect(data.error).toContain("Refund already issued");
    });

    test("returns 400 for user with no payment intent", async ({ tx }) => {
      // Create a pro tier user without a payment intent ID (edge case)
      const now = new Date();
      const futureWindowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_no_payment",
        stripeSubscriptionId: "sub_no_payment",
        subscriptionStatus: "active",
        refundStatus: "eligible",
        refundWindowExpiresAt: futureWindowDate,
        lastPaymentIntentId: null, // No payment intent - cannot refund
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Cannot find payment" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = await getJson(res);
      expect(data.error).toContain("No payment intent found");
    });

    test("returns 200 with refund details for eligible pro user", async ({ tx }) => {
      // Create a pro tier user within the 14-day refund window with all required fields
      const now = new Date();
      const futureWindowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now (still in window)

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_eligible_refund",
        stripeSubscriptionId: "sub_eligible_refund",
        subscriptionStatus: "active",
        refundStatus: "eligible",
        refundWindowExpiresAt: futureWindowDate,
        lastPaymentIntentId: "pi_eligible_refund_123",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider({
        issueRefund: async () => ({
          refundId: "re_success_123",
          status: "succeeded",
        }),
        cancelSubscriptionNow: async () => {},
      });
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "14-day money-back guarantee" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        refundId: "re_success_123",
        status: "succeeded",
      });
    });

    test("returns 200 with refund details when no reason provided", async ({ tx }) => {
      // Test that refund works even without a reason (reason is optional)
      const now = new Date();
      const futureWindowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_no_reason_refund",
        stripeSubscriptionId: "sub_no_reason_refund",
        subscriptionStatus: "active",
        refundStatus: "eligible",
        refundWindowExpiresAt: futureWindowDate,
        lastPaymentIntentId: "pi_no_reason_123",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider({
        issueRefund: async () => ({
          refundId: "re_no_reason_456",
          status: "succeeded",
        }),
        cancelSubscriptionNow: async () => {},
      });
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({}), // No reason provided
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        refundId: "re_no_reason_456",
        status: "succeeded",
      });
    });

    test("returns 400 for user with refund already in progress (requested status)", async ({ tx }) => {
      // Create a pro tier user whose refund is already being processed
      const now = new Date();
      const futureWindowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_in_progress",
        stripeSubscriptionId: "sub_in_progress",
        subscriptionStatus: "active",
        refundStatus: "requested", // Refund already in progress
        refundWindowExpiresAt: futureWindowDate,
        lastPaymentIntentId: "pi_in_progress_123",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/refund", {
        method: "POST",
        body: JSON.stringify({ reason: "Duplicate request" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = await getJson(res);
      expect(data.error).toContain("already being processed");
    });
  });

  // ==================== GET /api/subscriptions/usage ====================

  describe("get /api/subscriptions/usage", () => {
    test("returns 401 for unauthenticated request", async ({ tx }) => {
      // eslint-disable-next-line ts/consistent-type-assertions -- passing null to simulate unauthenticated request
      const mockAuth = createMockAuth(null as unknown as ReturnType<typeof createMockSession>);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/usage", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });

    test("returns free tier limits for free user with no usage", async ({ tx }) => {
      // Create a free tier user
      await createTestUser(tx, { id: mockUserId, tier: "free" });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/usage", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      // Free tier limits: 100k tokens, 5 endpoints, 10k runs
      expect(data).toMatchObject({
        aiCallsUsed: 0,
        aiCallsLimit: 100_000,
        endpointsUsed: 0,
        endpointsLimit: 5,
        totalRuns: 0,
        totalRunsLimit: 10_000,
      });
    });

    test("returns pro tier limits for pro user with no usage", async ({ tx }) => {
      // Create a pro tier user
      await createTestUser(tx, {
        id: mockUserId,
        tier: "pro",
        stripeCustomerId: "cus_usage_test_123",
        stripeSubscriptionId: "sub_usage_test_123",
        subscriptionStatus: "active",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/usage", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      // Pro tier limits: 5M tokens, 100 endpoints, 100k runs
      expect(data).toMatchObject({
        aiCallsUsed: 0,
        aiCallsLimit: 15_000_000,
        endpointsUsed: 0,
        endpointsLimit: 100,
        totalRuns: 0,
        totalRunsLimit: 100_000,
      });
    });

    test("returns enterprise tier limits for enterprise user", async ({ tx }) => {
      // Create an enterprise tier user
      await createTestUser(tx, {
        id: mockUserId,
        tier: "enterprise",
        stripeCustomerId: "cus_enterprise_123",
        stripeSubscriptionId: "sub_enterprise_123",
        subscriptionStatus: "active",
      });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const mockPaymentProvider = createMockPaymentProvider();
      const { app } = await createApp(tx, testConfig, mockAuth, {
        useTransactions: false,
        paymentProvider: mockPaymentProvider,
      });

      const res = await app.request("/api/subscriptions/usage", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);

      // Enterprise tier limits: 10M tokens, 1000 endpoints, 1M runs
      expect(data).toMatchObject({
        aiCallsUsed: 0,
        aiCallsLimit: 10_000_000,
        endpointsUsed: 0,
        endpointsLimit: 1_000,
        totalRuns: 0,
        totalRunsLimit: 1_000_000,
      });
    });
  });
});

// Export helpers for use in tests
export {
  createMockPaymentProvider,
  getJson,
  mockUserId,
  testConfig,
};
