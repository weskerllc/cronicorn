import { requireAuth } from "../../auth/middleware.js";
import { createRouter } from "../../types.js";
import * as handlers from "./subscriptions.handlers.js";

const router = createRouter();

// Protect all subscription routes with auth
router.use("/subscriptions/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth)(c, next);
});

// ==================== Subscription Routes ====================
// Note: Using regular routes (not .openapi()) to exclude from OpenAPI docs
// These are internal billing endpoints consumed by the web app, not public API
router.post("/subscriptions/checkout", handlers.handleCreateCheckout);
router.post("/subscriptions/portal", handlers.handleCreatePortal);
router.get("/subscriptions/status", handlers.handleGetStatus);

export default router;
