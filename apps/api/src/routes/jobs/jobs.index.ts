import { requireAuth } from "../../auth/middleware.js";
import { createRouter } from "../../types.js";
import * as handlers from "./jobs.handlers.js";
import * as routes from "./jobs.routes.js";

const router = createRouter();

// Protect all /jobs routes with auth
router.use("/jobs/*", async (c, next) => {
    const auth = c.get("auth");
    return requireAuth(auth)(c, next);
});

router.openapi(routes.create, handlers.create);

export default router;
