/**
 * Notification service types.
 */

import type { NotificationPreferences, PushSubscription } from "@cronicorn/domain";

/**
 * Input for saving a push subscription.
 */
export type SavePushSubscriptionInput = {
  userId: string;
  subscription: PushSubscription;
  userAgent?: string;
  deviceName?: string;
};

/**
 * Input for sending a usage alert.
 */
export type SendUsageAlertInput = {
  userId: string;
  usagePercent: number;
  tier: string;
};

/**
 * Input for sending an emergency notification.
 */
export type SendEmergencyInput = {
  userIds: string[];
  title: string;
  description: string;
  endpointId?: string;
};

/**
 * Result of a notification send operation.
 */
export type NotificationSendResult = {
  successCount: number;
  failureCount: number;
  errors: string[];
};

/**
 * Push subscription with metadata for display.
 */
export type PushSubscriptionWithMeta = PushSubscription & {
  deviceName?: string;
  userAgent?: string;
  createdAt?: Date;
};

/**
 * User notification settings for API response.
 */
export type UserNotificationSettings = {
  preferences: NotificationPreferences;
  subscriptions: PushSubscriptionWithMeta[];
  vapidPublicKey: string;
};
