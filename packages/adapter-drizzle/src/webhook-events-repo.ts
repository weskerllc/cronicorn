import type { WebhookEventRecord, WebhookEventsRepo } from "@cronicorn/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, lt } from "drizzle-orm";

import type * as schema from "./schema.js";
import { webhookEvents } from "./schema.js";

/**
 * Drizzle implementation of WebhookEventsRepo.
 *
 * Tracks processed webhook events to ensure idempotency.
 * Stripe may retry delivery of the same event multiple times.
 */
export class DrizzleWebhookEventsRepo implements WebhookEventsRepo {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async getEvent(eventId: string): Promise<WebhookEventRecord | null> {
    const rows = await this.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, eventId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      type: row.type,
      processed: row.processed,
      processedAt: row.processedAt,
      receivedAt: row.receivedAt,
      data: row.data,
      error: row.error,
      retryCount: row.retryCount,
    };
  }

  async recordEvent(event: {
    id: string;
    type: string;
    data: unknown;
  }): Promise<void> {
    await this.db.insert(webhookEvents).values({
      id: event.id,
      type: event.type,
      data: event.data,
      processed: false,
      retryCount: 0,
    });
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, eventId));
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    // Increment retry count and record error
    const existingEvent = await this.getEvent(eventId);
    const retryCount = existingEvent ? existingEvent.retryCount + 1 : 1;

    await this.db
      .update(webhookEvents)
      .set({
        error,
        retryCount,
      })
      .where(eq(webhookEvents.id, eventId));
  }

  async deleteOldEvents(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(webhookEvents)
      .where(lt(webhookEvents.receivedAt, olderThan));

    // Return count of deleted rows
    return result.rowCount ?? 0;
  }
}
