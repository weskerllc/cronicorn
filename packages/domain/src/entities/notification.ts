/**
 * Notification domain entities.
 *
 * Types for the notification system supporting multiple channels
 * (web push, Slack, email) and different notification types
 * (usage alerts, emergencies, AI insights).
 */

/**
 * Notification channels supported by the system.
 */
export type NotificationChannel = "web_push" | "slack" | "email";

/**
 * Types of notifications the system can send.
 */
export type NotificationType =
  | "usage_alert" // Quota threshold reached
  | "emergency" // System outage, critical job failures
  | "ai_insight" // AI planner detected something noteworthy
  | "job_failure" // Individual job failure notification
  | "system"; // System announcements

/**
 * Priority levels for notifications.
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Notification payload - content to be sent.
 */
export type NotificationPayload = {
  /** Notification title (short) */
  title: string;
  /** Notification body (longer description) */
  body: string;
  /** Priority level */
  priority: NotificationPriority;
  /** Optional icon URL */
  icon?: string;
  /** Optional URL to open when clicked */
  url?: string;
  /** Optional additional data */
  data?: Record<string, unknown>;
  /** Notification tag for grouping/replacing */
  tag?: string;
};

/**
 * Web Push subscription from browser's PushManager.
 *
 * This matches the shape of PushSubscription.toJSON() from the Web Push API.
 */
export type PushSubscription = {
  /** The push endpoint URL */
  endpoint: string;
  /** Expiration time (if any) */
  expirationTime?: number | null;
  /** Encryption keys */
  keys: {
    /** P-256 public key */
    p256dh: string;
    /** Authentication secret */
    auth: string;
  };
};

/**
 * Stored push subscription with metadata.
 */
export type StoredPushSubscription = PushSubscription & {
  /** Unique ID */
  id: string;
  /** User who owns this subscription */
  userId: string;
  /** When the subscription was created */
  createdAt: Date;
  /** User agent string (for device identification) */
  userAgent?: string;
  /** Device name (if provided) */
  deviceName?: string;
};

/**
 * Create a usage alert notification payload.
 */
export function createUsageAlertPayload(
  usagePercent: number,
  tier: string,
): NotificationPayload {
  const isWarning = usagePercent < 100;
  return {
    title: isWarning
      ? `Usage Alert: ${usagePercent}% of quota used`
      : "Usage Limit Reached",
    body: isWarning
      ? `You've used ${usagePercent}% of your ${tier} plan quota. Consider upgrading to avoid interruptions.`
      : `You've reached your ${tier} plan quota limit. Upgrade to continue using AI features.`,
    priority: isWarning ? "normal" : "high",
    tag: "usage-alert",
    url: "/settings/billing",
    data: {
      type: "usage_alert",
      usagePercent,
      tier,
    },
  };
}

/**
 * Create an emergency notification payload.
 */
export function createEmergencyPayload(
  title: string,
  description: string,
  endpointId?: string,
): NotificationPayload {
  return {
    title,
    body: description,
    priority: "urgent",
    tag: endpointId ? `emergency-${endpointId}` : "emergency",
    url: endpointId ? `/endpoints/${endpointId}` : "/dashboard",
    data: {
      type: "emergency",
      endpointId,
    },
  };
}

/**
 * Create a job failure notification payload.
 */
export function createJobFailurePayload(
  jobName: string,
  endpointName: string,
  failureCount: number,
  errorMessage?: string,
): NotificationPayload {
  const isConsecutive = failureCount > 1;
  return {
    title: isConsecutive
      ? `${jobName}: ${failureCount} consecutive failures`
      : `${jobName}: Endpoint failed`,
    body: errorMessage
      ? `${endpointName}: ${errorMessage}`
      : `${endpointName} failed to execute`,
    priority: failureCount >= 3 ? "high" : "normal",
    tag: `job-failure-${jobName}`,
    url: `/jobs/${jobName}`,
    data: {
      type: "job_failure",
      jobName,
      endpointName,
      failureCount,
    },
  };
}
