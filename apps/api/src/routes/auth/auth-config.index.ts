import { createRouter } from "../../types.js";
import * as handlers from "./auth-config.handlers.js";
import * as routes from "./auth-config.routes.js";

const router = createRouter()
    // ==================== Auth Config Route (Public) ====================
    .openapi(routes.getAuthConfig, handlers.getAuthConfig);

export default router;
