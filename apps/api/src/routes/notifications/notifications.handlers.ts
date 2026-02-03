import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./notifications.routes.js";

import { getAuthContext } from "../../auth/middleware.js";

// ==================== Get Notification Settings Handler ====================

export const getNotificationSettings: AppRouteHandler<routes.GetNotificationSettingsRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const vapidPublicKey = c.get("vapidPublicKey") ?? null;

  return c.get("withNotificationsManager")(async (manager) => {
    const [preferences, subscriptions] = await Promise.all([
      manager.getPreferences(userId),
      manager.getPushSubscriptions(userId),
    ]);

    return c.json({
      preferences,
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        createdAt: undefined, // We don't have this in the PushSubscription type
      })),
      vapidPublicKey,
    }, HTTPStatusCodes.OK);
  });
};

// ==================== Update Notification Preferences Handler ====================

export const updateNotificationPreferences: AppRouteHandler<routes.UpdateNotificationPreferencesRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const input = c.req.valid("json");

  return c.get("withNotificationsManager")(async (manager) => {
    await manager.updatePreferences(userId, input);
    const updated = await manager.getPreferences(userId);
    return c.json(updated, HTTPStatusCodes.OK);
  });
};

// ==================== Subscribe to Push Handler ====================

export const subscribeToPush: AppRouteHandler<routes.SubscribeToPushRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const subscription = c.req.valid("json");

  return c.get("withNotificationsManager")(async (manager) => {
    await manager.savePushSubscription(userId, {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: subscription.keys,
    });

    return c.json({
      success: true,
      message: "Push subscription saved successfully",
    }, HTTPStatusCodes.OK);
  });
};

// ==================== Unsubscribe from Push Handler ====================

export const unsubscribeFromPush: AppRouteHandler<routes.UnsubscribeFromPushRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const { endpoint } = c.req.valid("json");

  return c.get("withNotificationsManager")(async (manager) => {
    await manager.removePushSubscription(userId, endpoint);

    return c.json({
      success: true,
      message: "Push subscription removed successfully",
    }, HTTPStatusCodes.OK);
  });
};

// ==================== Test Push Handler ====================

export const testPush: AppRouteHandler<routes.TestPushRoute> = async (c) => {
  const { userId } = getAuthContext(c);

  return c.get("withNotificationsManager")(async (manager) => {
    const result = await manager.sendToUser(userId, "system", {
      title: "Test Notification",
      body: "This is a test push notification from Cronicorn!",
      priority: "normal",
      tag: "test",
      url: "/settings/notifications",
    });

    return c.json({
      successCount: result.successCount,
      failureCount: result.failureCount,
    }, HTTPStatusCodes.OK);
  });
};
