/**
 * Drizzle adapter for WebhookEventsRepo.
 * Implements idempotency tracking for webhook events.
 */

import type { WebhookEventsRepo } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { eq } from "drizzle-orm";

import { type WebhookEventInsert, webhookEvents } from "./schema.js";

export class DrizzleWebhookEventsRepo implements WebhookEventsRepo {
  constructor(
    // eslint-disable-next-line ts/no-explicit-any
    private readonly db: NodePgDatabase<any> | NodePgTransaction<any, any>,
  ) {}

  async hasBeenProcessed(eventId: string): Promise<boolean> {
    const rows = await this.db
      .select({ eventId: webhookEvents.eventId })
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    return rows.length > 0;
  }

  async recordProcessedEvent(eventId: string, eventType: string): Promise<void> {
    const record: WebhookEventInsert = {
      eventId,
      eventType,
      processedAt: new Date(),
      status: "processed",
      errorMessage: null,
    };

    // Use INSERT ... ON CONFLICT DO NOTHING for idempotency
    // If the event was already recorded, this is a no-op
    await this.db
      .insert(webhookEvents)
      .values(record)
      .onConflictDoNothing();
  }
}
