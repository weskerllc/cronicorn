import type { NotificationPreferences, NotificationSubscriptionsRepo, PushSubscription } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { notificationPreferences, pushSubscriptions } from "./schema.js";

/**
 * Default notification preferences for new users.
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  usageAlerts: true,
  usageThreshold: 80,
  emergencyAlerts: true,
  aiInsights: false,
};

/**
 * DrizzleNotificationSubscriptionsRepo - PostgreSQL-backed notification storage.
 *
 * Manages push subscriptions and notification preferences per user.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class DrizzleNotificationSubscriptionsRepo implements NotificationSubscriptionsRepo {
  constructor(
    // eslint-disable-next-line ts/no-explicit-any
    private readonly db: NodePgDatabase<any> | NodePgTransaction<any, any>,
  ) { }

  /**
   * Save a push subscription for a user.
   * If the endpoint already exists for this user, it will be updated.
   */
  async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // Check if subscription already exists for this user
    const existing = await this.db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription (keys might have changed)
      await this.db
        .update(pushSubscriptions)
        .set({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expirationTime: subscription.expirationTime
            ? new Date(subscription.expirationTime)
            : null,
        })
        .where(eq(pushSubscriptions.id, existing[0].id));
    }
    else {
      // Insert new subscription
      await this.db.insert(pushSubscriptions).values({
        id: nanoid(),
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
      });
    }
  }

  /**
   * Get all push subscriptions for a user.
   */
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return rows.map(row => ({
      endpoint: row.endpoint,
      expirationTime: row.expirationTime?.getTime() ?? null,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    }));
  }

  /**
   * Remove a push subscription by endpoint.
   */
  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }

  /**
   * Get push subscriptions for multiple users in a single query.
   */
  async getPushSubscriptionsBatch(userIds: string[]): Promise<Map<string, PushSubscription[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));

    const result = new Map<string, PushSubscription[]>();

    for (const row of rows) {
      const existing = result.get(row.userId) ?? [];
      existing.push({
        endpoint: row.endpoint,
        expirationTime: row.expirationTime?.getTime() ?? null,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      });
      result.set(row.userId, existing);
    }

    return result;
  }

  /**
   * Get notification preferences for a user.
   * Returns defaults if no preferences are set.
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      return DEFAULT_PREFERENCES;
    }

    const row = rows[0];
    return {
      enabled: row.enabled,
      usageAlerts: row.usageAlerts,
      usageThreshold: row.usageThreshold,
      emergencyAlerts: row.emergencyAlerts,
      aiInsights: row.aiInsights,
    };
  }

  /**
   * Update notification preferences for a user.
   * Creates the preferences row if it doesn't exist.
   */
  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void> {
    const existing = await this.db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(notificationPreferences)
        .set({
          ...prefs,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId));
    }
    else {
      await this.db.insert(notificationPreferences).values({
        userId,
        enabled: prefs.enabled ?? DEFAULT_PREFERENCES.enabled,
        usageAlerts: prefs.usageAlerts ?? DEFAULT_PREFERENCES.usageAlerts,
        usageThreshold: prefs.usageThreshold ?? DEFAULT_PREFERENCES.usageThreshold,
        emergencyAlerts: prefs.emergencyAlerts ?? DEFAULT_PREFERENCES.emergencyAlerts,
        aiInsights: prefs.aiInsights ?? DEFAULT_PREFERENCES.aiInsights,
        updatedAt: new Date(),
      });
    }
  }
}
