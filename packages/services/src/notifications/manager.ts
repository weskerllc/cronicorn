/**
 * NotificationsManager - Orchestrates notification delivery.
 *
 * Responsible for:
 * - Managing push subscriptions
 * - Sending notifications through appropriate channels
 * - Respecting user preferences
 * - Cleaning up expired subscriptions
 */

import type {
  Logger,
  NotificationPayload,
  NotificationSender,
  NotificationSubscriptionsRepo,
  NotificationType,
  PushSubscription,
} from "@cronicorn/domain";

import { createEmergencyPayload, createUsageAlertPayload } from "@cronicorn/domain";

import type { NotificationSendResult, SendEmergencyInput, SendUsageAlertInput } from "./types.js";

/**
 * NotificationsManager configuration.
 */
export type NotificationsManagerConfig = {
  /** Repository for subscriptions and preferences */
  subscriptions: NotificationSubscriptionsRepo;
  /** Web push sender (optional - if not provided, web push is disabled) */
  webPushSender?: NotificationSender;
  /** Logger for diagnostics */
  logger: Logger;
};

/**
 * NotificationsManager - Business logic for notification delivery.
 *
 * Supports multiple notification channels (web push, Slack, email)
 * through the NotificationSender port. Routes notifications based
 * on user preferences and available subscriptions.
 */
export class NotificationsManager {
  private readonly subscriptions: NotificationSubscriptionsRepo;
  private readonly webPushSender?: NotificationSender;
  private readonly logger: Logger;

  constructor(config: NotificationsManagerConfig) {
    this.subscriptions = config.subscriptions;
    this.webPushSender = config.webPushSender;
    this.logger = config.logger;
  }

  /**
   * Save a push subscription for a user.
   */
  async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    await this.subscriptions.savePushSubscription(userId, subscription);
    this.logger.info({ userId, endpoint: subscription.endpoint.slice(0, 50) }, "Push subscription saved");
  }

  /**
   * Remove a push subscription.
   */
  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.subscriptions.removePushSubscription(userId, endpoint);
    this.logger.info({ userId }, "Push subscription removed");
  }

  /**
   * Get all push subscriptions for a user.
   */
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.subscriptions.getPushSubscriptions(userId);
  }

  /**
   * Get notification preferences for a user.
   */
  async getPreferences(userId: string) {
    return this.subscriptions.getPreferences(userId);
  }

  /**
   * Update notification preferences.
   */
  async updatePreferences(userId: string, prefs: Parameters<NotificationSubscriptionsRepo["updatePreferences"]>[1]) {
    await this.subscriptions.updatePreferences(userId, prefs);
    this.logger.info({ userId }, "Notification preferences updated");
  }

  /**
   * Send a usage alert notification.
   *
   * Checks user preferences before sending. Only sends if:
   * - Notifications are enabled
   * - Usage alerts are enabled
   * - Usage exceeds user's threshold
   */
  async sendUsageAlert(input: SendUsageAlertInput): Promise<NotificationSendResult> {
    const { userId, usagePercent, tier } = input;

    // Check preferences
    const prefs = await this.subscriptions.getPreferences(userId);
    if (!prefs.enabled || !prefs.usageAlerts) {
      this.logger.debug({ userId }, "Usage alerts disabled for user");
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    if (usagePercent < prefs.usageThreshold) {
      this.logger.debug({ userId, usagePercent, threshold: prefs.usageThreshold }, "Usage below threshold");
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    const payload = createUsageAlertPayload(usagePercent, tier);
    return this.sendToUser(userId, "usage_alert", payload);
  }

  /**
   * Send an emergency notification to multiple users.
   *
   * Emergency notifications bypass most preference checks
   * (only respects the master enabled flag).
   */
  async sendEmergency(input: SendEmergencyInput): Promise<Map<string, NotificationSendResult>> {
    const { userIds, title, description, endpointId } = input;

    const payload = createEmergencyPayload(title, description, endpointId);
    const results = new Map<string, NotificationSendResult>();

    // Get preferences for all users
    for (const userId of userIds) {
      const prefs = await this.subscriptions.getPreferences(userId);

      // Emergency notifications only check master enabled flag
      if (!prefs.enabled || !prefs.emergencyAlerts) {
        results.set(userId, { successCount: 0, failureCount: 0, errors: [] });
        continue;
      }

      const result = await this.sendToUser(userId, "emergency", payload);
      results.set(userId, result);
    }

    this.logger.info({
      userCount: userIds.length,
      title,
    }, "Emergency notification sent");

    return results;
  }

  /**
   * Send a notification to a specific user through all available channels.
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<NotificationSendResult> {
    const result: NotificationSendResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    // Send via web push if available
    if (this.webPushSender) {
      const pushResult = await this.sendViaWebPush(userId, payload);
      result.successCount += pushResult.successCount;
      result.failureCount += pushResult.failureCount;
      result.errors.push(...pushResult.errors);
    }

    // Future: Add Slack, email channels here
    // if (this.slackSender) { ... }
    // if (this.emailSender) { ... }

    this.logger.info({
      userId,
      type,
      successCount: result.successCount,
      failureCount: result.failureCount,
    }, "Notification sent");

    return result;
  }

  /**
   * Send notification via web push to all user's subscribed devices.
   */
  private async sendViaWebPush(
    userId: string,
    payload: NotificationPayload,
  ): Promise<NotificationSendResult> {
    const result: NotificationSendResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    if (!this.webPushSender) {
      return result;
    }

    const subscriptions = await this.subscriptions.getPushSubscriptions(userId);

    for (const sub of subscriptions) {
      const sendResult = await this.webPushSender.send(
        JSON.stringify(sub),
        payload,
      );

      if (sendResult.success) {
        result.successCount++;
      }
      else {
        result.failureCount++;
        if (sendResult.error) {
          result.errors.push(sendResult.error);
        }

        // Remove expired subscriptions
        if (sendResult.shouldRemove) {
          await this.subscriptions.removePushSubscription(userId, sub.endpoint);
          this.logger.info({ userId, endpoint: sub.endpoint.slice(0, 50) }, "Removed expired push subscription");
        }
      }
    }

    return result;
  }
}
