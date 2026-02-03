import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Notifications"];

const errorResponses = {
  [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
    z.object({ message: z.string() }),
    "Authentication required",
  ),
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
    z.object({ message: z.string() }),
    "Internal server error",
  ),
};

// ==================== Push Subscription Schema ====================

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().openapi({
    description: "The push service endpoint URL",
    example: "https://fcm.googleapis.com/fcm/send/...",
  }),
  expirationTime: z.number().nullable().optional().openapi({
    description: "Expiration time of the subscription (if any)",
  }),
  keys: z.object({
    p256dh: z.string().openapi({
      description: "P-256 public key for encryption",
    }),
    auth: z.string().openapi({
      description: "Authentication secret",
    }),
  }),
});

const NotificationPreferencesSchema = z.object({
  enabled: z.boolean().openapi({
    description: "Master enable/disable for all notifications",
  }),
  usageAlerts: z.boolean().openapi({
    description: "Enable usage quota alerts",
  }),
  usageThreshold: z.number().min(0).max(100).openapi({
    description: "Usage threshold percentage (0-100) to trigger alert",
  }),
  emergencyAlerts: z.boolean().openapi({
    description: "Enable emergency/outage alerts",
  }),
  aiInsights: z.boolean().openapi({
    description: "Enable AI planner insights",
  }),
});

// ==================== Get Settings Route ====================

export const getNotificationSettings = createRoute({
  path: "/notifications/settings",
  method: "get",
  tags,
  summary: "Get notification settings",
  description: "Get push subscriptions, preferences, and VAPID public key for the current user",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        preferences: NotificationPreferencesSchema,
        subscriptions: z.array(z.object({
          endpoint: z.string(),
          createdAt: z.string().optional(),
        })),
        vapidPublicKey: z.string().nullable().openapi({
          description: "VAPID public key for push subscription (null if not configured)",
        }),
      }),
      "Notification settings",
    ),
    ...errorResponses,
  },
});

export type GetNotificationSettingsRoute = typeof getNotificationSettings;

// ==================== Update Preferences Route ====================

export const updateNotificationPreferences = createRoute({
  path: "/notifications/preferences",
  method: "patch",
  tags,
  summary: "Update notification preferences",
  description: "Update notification preferences for the current user",
  request: {
    body: jsonContent(
      NotificationPreferencesSchema.partial(),
      "Notification preferences to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationPreferencesSchema,
      "Updated preferences",
    ),
    ...errorResponses,
  },
});

export type UpdateNotificationPreferencesRoute = typeof updateNotificationPreferences;

// ==================== Subscribe to Push Route ====================

export const subscribeToPush = createRoute({
  path: "/notifications/push/subscribe",
  method: "post",
  tags,
  summary: "Subscribe to push notifications",
  description: "Save a push subscription for the current user's device",
  request: {
    body: jsonContent(
      PushSubscriptionSchema,
      "Push subscription from browser",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Subscription saved",
    ),
    ...errorResponses,
  },
});

export type SubscribeToPushRoute = typeof subscribeToPush;

// ==================== Unsubscribe from Push Route ====================

export const unsubscribeFromPush = createRoute({
  path: "/notifications/push/unsubscribe",
  method: "post",
  tags,
  summary: "Unsubscribe from push notifications",
  description: "Remove a push subscription for the current user's device",
  request: {
    body: jsonContent(
      z.object({
        endpoint: z.string().url().openapi({
          description: "The push service endpoint URL to unsubscribe",
        }),
      }),
      "Push subscription endpoint to remove",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Subscription removed",
    ),
    ...errorResponses,
  },
});

export type UnsubscribeFromPushRoute = typeof unsubscribeFromPush;

// ==================== Test Push Route ====================

export const testPush = createRoute({
  path: "/notifications/push/test",
  method: "post",
  tags,
  summary: "Send a test push notification",
  description: "Send a test push notification to all of the current user's devices",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        successCount: z.number(),
        failureCount: z.number(),
      }),
      "Test notification result",
    ),
    ...errorResponses,
  },
});

export type TestPushRoute = typeof testPush;
