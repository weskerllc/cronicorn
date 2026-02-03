import { createRouter } from "../../types.js";
import * as handlers from "./notifications.handlers.js";
import * as routes from "./notifications.routes.js";

const router = createRouter()
  // ==================== Settings ====================
  .openapi(routes.getNotificationSettings, handlers.getNotificationSettings)
  .openapi(routes.updateNotificationPreferences, handlers.updateNotificationPreferences)
  // ==================== Push Subscriptions ====================
  .openapi(routes.subscribeToPush, handlers.subscribeToPush)
  .openapi(routes.unsubscribeFromPush, handlers.unsubscribeFromPush)
  .openapi(routes.testPush, handlers.testPush);

export default router;
