/**
 * Factory for creating NotificationsManager instances.
 *
 * Creates the manager with the appropriate adapters based on configuration.
 * Web Push is only enabled if VAPID keys are configured.
 */

import type { Logger, NotificationSender } from "@cronicorn/domain";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import { DrizzleNotificationSubscriptionsRepo } from "@cronicorn/adapter-drizzle";
import { WebPushSender } from "@cronicorn/adapter-web-push";
import { NotificationsManager } from "@cronicorn/services";

/**
 * Configuration for notifications.
 */
export type NotificationsConfig = {
  /** VAPID subject (typically mailto: or https: URL) */
  vapidSubject?: string;
  /** VAPID public key (base64url encoded) */
  vapidPublicKey?: string;
  /** VAPID private key (base64url encoded) */
  vapidPrivateKey?: string;
};

/**
 * Create a NotificationsManager instance with appropriate adapters.
 *
 * @param db - Database connection or transaction
 * @param logger - Logger instance
 * @param config - VAPID configuration for web push
 * @returns Configured NotificationsManager
 */
export function createNotificationsManager(
  // eslint-disable-next-line ts/no-explicit-any
  db: NodePgDatabase<any> | NodePgTransaction<any, any>,
  logger: Logger,
  config: NotificationsConfig,
): NotificationsManager {
  const subscriptions = new DrizzleNotificationSubscriptionsRepo(db);

  // Only enable web push if all VAPID keys are configured
  let webPushSender: NotificationSender | undefined;
  if (config.vapidSubject && config.vapidPublicKey && config.vapidPrivateKey) {
    webPushSender = new WebPushSender({
      vapidSubject: config.vapidSubject,
      vapidPublicKey: config.vapidPublicKey,
      vapidPrivateKey: config.vapidPrivateKey,
    });
    logger.info("Web Push notifications enabled");
  }
  else {
    logger.debug("Web Push disabled - VAPID keys not configured");
  }

  return new NotificationsManager({
    subscriptions,
    webPushSender,
    logger: logger.child({ service: "notifications" }),
  });
}

/**
 * Check if web push is configured based on config.
 */
export function isWebPushConfigured(config: NotificationsConfig): boolean {
  return !!(config.vapidSubject && config.vapidPublicKey && config.vapidPrivateKey);
}
