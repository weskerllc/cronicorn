/**
 * Notification ports for multi-channel alerting.
 *
 * Supports different notification channels (web push, Slack, email, etc.)
 * through a common interface. Designed for:
 * - Usage alerts (quota thresholds)
 * - Emergency notifications (system outages, job failures)
 * - AI planner alerts (detected anomalies)
 */

import type { NotificationChannel, NotificationPayload, NotificationType, PushSubscription } from "../entities/notification.js";

/**
 * NotificationSender - Sends notifications through a specific channel.
 *
 * Each adapter (WebPush, Slack, Email, etc.) implements this interface.
 * The sender is responsible for:
 * - Formatting the notification for its channel
 * - Handling delivery failures gracefully
 * - Respecting channel-specific rate limits
 *
 * **Example Adapters**:
 * - WebPushSender: Browser push notifications via web-push
 * - SlackSender: Slack webhook integration
 * - EmailSender: Transactional email via SendGrid/Resend
 */
export type NotificationSender = {
  /**
   * The channel this sender handles.
   */
  readonly channel: NotificationChannel;

  /**
   * Send a notification to a specific destination.
   *
   * @param destination - Channel-specific destination (push subscription, Slack webhook URL, email)
   * @param payload - The notification content
   * @returns Success/failure result with optional error details
   */
  send: (destination: string, payload: NotificationPayload) => Promise<NotificationResult>;
};

/**
 * Result of a notification send attempt.
 */
export type NotificationResult = {
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Whether the subscription should be removed (e.g., expired push subscription) */
  shouldRemove?: boolean;
};

/**
 * NotificationSubscriptionsRepo - Stores user notification preferences.
 *
 * Manages subscriptions for different notification channels per user.
 * Each user can have multiple subscriptions (e.g., multiple devices for push).
 */
export type NotificationSubscriptionsRepo = {
  /**
   * Save a push subscription for a user.
   *
   * @param userId - User ID
   * @param subscription - Push subscription data from browser
   */
  savePushSubscription: (userId: string, subscription: PushSubscription) => Promise<void>;

  /**
   * Get all push subscriptions for a user.
   *
   * @param userId - User ID
   * @returns Array of push subscriptions
   */
  getPushSubscriptions: (userId: string) => Promise<PushSubscription[]>;

  /**
   * Remove a push subscription (e.g., when expired or unsubscribed).
   *
   * @param userId - User ID
   * @param endpoint - The subscription endpoint to remove
   */
  removePushSubscription: (userId: string, endpoint: string) => Promise<void>;

  /**
   * Get all push subscriptions for multiple users (batch operation).
   * Used for sending alerts to multiple users (e.g., all admins).
   *
   * @param userIds - Array of user IDs
   * @returns Map of userId to their subscriptions
   */
  getPushSubscriptionsBatch: (userIds: string[]) => Promise<Map<string, PushSubscription[]>>;

  /**
   * Get notification preferences for a user.
   *
   * @param userId - User ID
   * @returns User's notification preferences
   */
  getPreferences: (userId: string) => Promise<NotificationPreferences>;

  /**
   * Update notification preferences for a user.
   *
   * @param userId - User ID
   * @param prefs - Partial preferences to update
   */
  updatePreferences: (userId: string, prefs: Partial<NotificationPreferences>) => Promise<void>;
};

/**
 * User notification preferences.
 */
export type NotificationPreferences = {
  /** Enable/disable all notifications */
  enabled: boolean;
  /** Enable usage quota alerts */
  usageAlerts: boolean;
  /** Usage threshold percentage (0-100) to trigger alert */
  usageThreshold: number;
  /** Enable emergency/outage alerts */
  emergencyAlerts: boolean;
  /** Enable AI planner insights */
  aiInsights: boolean;
};

/**
 * Default notification preferences for new users.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  usageAlerts: true,
  usageThreshold: 80, // Alert at 80% usage
  emergencyAlerts: true,
  aiInsights: false, // Opt-in for AI insights
};

/**
 * NotificationDispatcher - Orchestrates sending notifications across channels.
 *
 * Used by the NotificationsManager service to send notifications.
 * Handles routing to appropriate senders based on user preferences and
 * subscriptions.
 */
export type NotificationDispatcher = {
  /**
   * Send a notification to a user across their enabled channels.
   *
   * @param userId - User ID to notify
   * @param type - Type of notification (for preference filtering)
   * @param payload - Notification content
   * @returns Results per channel
   */
  sendToUser: (
    userId: string,
    type: NotificationType,
    payload: NotificationPayload
  ) => Promise<Map<NotificationChannel, NotificationResult>>;

  /**
   * Send a notification to multiple users.
   *
   * @param userIds - User IDs to notify
   * @param type - Type of notification
   * @param payload - Notification content
   * @returns Results per user
   */
  sendToUsers: (
    userIds: string[],
    type: NotificationType,
    payload: NotificationPayload
  ) => Promise<Map<string, Map<NotificationChannel, NotificationResult>>>;
};
