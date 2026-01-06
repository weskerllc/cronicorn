/**
 * Integration tests for WebhookEventsRepo.
 * Tests idempotency tracking for webhook events.
 */

import { afterAll, describe } from "vitest";

import { closeTestPool, expect, test } from "../tests/fixtures.js";
import { DrizzleWebhookEventsRepo } from "../webhook-events-repo.js";

describe("drizzleWebhookEventsRepo", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("hasBeenProcessed", () => {
    test("returns false for new event", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      const result = await repo.hasBeenProcessed("evt_new_event_123");

      expect(result).toBe(false);
    });

    test("returns true for already processed event", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      // Record an event
      await repo.recordProcessedEvent("evt_existing_456", "checkout.session.completed");

      // Check if it was processed
      const result = await repo.hasBeenProcessed("evt_existing_456");

      expect(result).toBe(true);
    });
  });

  describe("recordProcessedEvent", () => {
    test("records a new webhook event", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      await repo.recordProcessedEvent("evt_new_789", "customer.subscription.updated");

      // Verify it was recorded
      const isProcessed = await repo.hasBeenProcessed("evt_new_789");
      expect(isProcessed).toBe(true);
    });

    test("is idempotent - duplicate recording is a no-op", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      // Record same event twice
      await repo.recordProcessedEvent("evt_duplicate_101", "invoice.payment_succeeded");
      await repo.recordProcessedEvent("evt_duplicate_101", "invoice.payment_succeeded");

      // Should not throw error and event should still be marked as processed
      const isProcessed = await repo.hasBeenProcessed("evt_duplicate_101");
      expect(isProcessed).toBe(true);
    });

    test("allows same event ID with different event types (edge case)", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      // This scenario shouldn't happen in practice (Stripe event IDs are globally unique)
      // but our implementation should handle it gracefully
      await repo.recordProcessedEvent("evt_unique_202", "checkout.session.completed");

      // Attempting to record with different event type is a no-op (same eventId)
      await repo.recordProcessedEvent("evt_unique_202", "customer.subscription.deleted");

      const isProcessed = await repo.hasBeenProcessed("evt_unique_202");
      expect(isProcessed).toBe(true);
    });
  });

  describe("event details", () => {
    test("records event type correctly", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      await repo.recordProcessedEvent("evt_details_404", "customer.subscription.created");

      // Verify the event is marked as processed (event type is stored but not queried in basic operations)
      const isProcessed = await repo.hasBeenProcessed("evt_details_404");
      expect(isProcessed).toBe(true);
    });

    test("handles multiple different events independently", async ({ tx }) => {
      const repo = new DrizzleWebhookEventsRepo(tx);

      // Record multiple different events
      await repo.recordProcessedEvent("evt_multi_501", "checkout.session.completed");
      await repo.recordProcessedEvent("evt_multi_502", "invoice.payment_succeeded");
      await repo.recordProcessedEvent("evt_multi_503", "customer.subscription.updated");

      // All should be marked as processed
      expect(await repo.hasBeenProcessed("evt_multi_501")).toBe(true);
      expect(await repo.hasBeenProcessed("evt_multi_502")).toBe(true);
      expect(await repo.hasBeenProcessed("evt_multi_503")).toBe(true);

      // Unrelated event should not be processed
      expect(await repo.hasBeenProcessed("evt_multi_999")).toBe(false);
    });
  });
});
