import type { NotificationPayload, NotificationResult, NotificationSender } from "@cronicorn/domain";

import webpush from "web-push";

/**
 * Configuration for Web Push sender.
 */
export type WebPushConfig = {
  /** VAPID subject (typically a mailto: or https: URL) */
  vapidSubject: string;
  /** VAPID public key (base64url encoded) */
  vapidPublicKey: string;
  /** VAPID private key (base64url encoded) */
  vapidPrivateKey: string;
};

/**
 * Web Push implementation of NotificationSender.
 *
 * Uses the web-push library to send push notifications via the
 * Web Push protocol (RFC 8030).
 *
 * **Setup Requirements**:
 * 1. Generate VAPID keys: `npx web-push generate-vapid-keys`
 * 2. Store keys in environment variables
 * 3. Use the public key in the frontend for subscription
 *
 * **Error Handling**:
 * - 410 Gone: Subscription expired, should be removed
 * - 404 Not Found: Subscription invalid, should be removed
 * - Other errors: Log and retry later
 */
export class WebPushSender implements NotificationSender {
  readonly channel = "web_push" as const;

  constructor(config: WebPushConfig) {
    webpush.setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey,
    );
  }

  /**
   * Send a push notification to a subscription.
   *
   * @param destination - JSON stringified PushSubscription from browser
   * @param payload - Notification content
   */
  async send(destination: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // Parse the subscription - web-push expects a specific format
      const parsed: unknown = JSON.parse(destination);
      if (!this.isValidSubscription(parsed)) {
        return {
          success: false,
          error: "Invalid subscription format",
          shouldRemove: true,
        };
      }

      // Convert to web-push expected format
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        tag: payload.tag,
        data: {
          url: payload.url,
          ...payload.data,
        },
      });

      // Set TTL based on priority
      const ttl = this.getTtlForPriority(payload.priority);

      await webpush.sendNotification(parsed, pushPayload, {
        TTL: ttl,
        urgency: this.mapPriorityToUrgency(payload.priority),
      });

      return { success: true };
    }
    catch (error) {
      // Check for web-push specific error shape
      if (this.isWebPushError(error)) {
        // 410 Gone or 404 Not Found means subscription is invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
          return {
            success: false,
            error: "Subscription expired or invalid",
            shouldRemove: true,
          };
        }

        return {
          success: false,
          error: `Web Push failed: ${error.body ?? "Unknown error"}`,
        };
      }

      // Generic error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Web Push failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Type guard for web-push subscription format.
   */
  private isValidSubscription(value: unknown): value is webpush.PushSubscription {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    if (!("endpoint" in value) || typeof value.endpoint !== "string") {
      return false;
    }
    if (!("keys" in value) || typeof value.keys !== "object" || value.keys === null) {
      return false;
    }
    if (!("p256dh" in value.keys) || typeof value.keys.p256dh !== "string") {
      return false;
    }
    if (!("auth" in value.keys) || typeof value.keys.auth !== "string") {
      return false;
    }
    return true;
  }

  /**
   * Type guard for web-push error format.
   */
  private isWebPushError(error: unknown): error is { statusCode: number; body?: string } {
    if (typeof error !== "object" || error === null) {
      return false;
    }
    return "statusCode" in error && typeof error.statusCode === "number";
  }

  /**
   * Map notification priority to TTL (time to live in seconds).
   */
  private getTtlForPriority(priority: NotificationPayload["priority"]): number {
    switch (priority) {
      case "urgent":
        return 60 * 60; // 1 hour
      case "high":
        return 60 * 60 * 4; // 4 hours
      case "normal":
        return 60 * 60 * 24; // 24 hours
      case "low":
        return 60 * 60 * 24 * 7; // 1 week
      default:
        return 60 * 60 * 24; // Default 24 hours
    }
  }

  /**
   * Map notification priority to Web Push urgency.
   */
  private mapPriorityToUrgency(priority: NotificationPayload["priority"]): "very-low" | "low" | "normal" | "high" {
    switch (priority) {
      case "urgent":
        return "high";
      case "high":
        return "high";
      case "normal":
        return "normal";
      case "low":
        return "low";
      default:
        return "normal";
    }
  }
}

/**
 * Generate VAPID keys for Web Push.
 *
 * Run this once and store the keys securely.
 * The public key is used in the browser, private key on the server.
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
