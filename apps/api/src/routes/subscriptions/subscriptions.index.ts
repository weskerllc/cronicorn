import { createRouter } from "../../types.js";
import * as handlers from "./subscriptions.handlers.js";
import * as routes from "./subscriptions.routes.js";

const router = createRouter()
  // ==================== Subscription Routes ====================
  .openapi(routes.createCheckout, handlers.handleCreateCheckout)
  .openapi(routes.createPortal, handlers.handleCreatePortal)
  .openapi(routes.getStatus, handlers.handleGetStatus)
  .openapi(routes.getUsage, handlers.handleGetUsage);

export default router;
