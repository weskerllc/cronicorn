import { requireAuth } from "../../auth/middleware.js";
import { createRouter } from "../../types.js";
import * as handlers from "./jobs.handlers.js";
import * as routes from "./jobs.routes.js";

const router = createRouter();

// Protect all /jobs and /endpoints routes with auth
router.use("/jobs/*", async (c, next) => {
  const auth = c.get("auth");
  return requireAuth(auth)(c, next);
});

router.use("/endpoints/*", async (c, next) => {
  const auth = c.get("auth");
  return requireAuth(auth)(c, next);
});

router.use("/runs/*", async (c, next) => {
  const auth = c.get("auth");
  return requireAuth(auth)(c, next);
});

// ==================== Job Lifecycle Routes ====================
router.openapi(routes.createJob, handlers.createJob);
router.openapi(routes.getJob, handlers.getJob);
router.openapi(routes.listJobs, handlers.listJobs);
router.openapi(routes.updateJob, handlers.updateJob);
router.openapi(routes.archiveJob, handlers.archiveJob);

// ==================== Endpoint Orchestration Routes ====================
router.openapi(routes.addEndpoint, handlers.addEndpoint);
router.openapi(routes.updateEndpoint, handlers.updateEndpoint);
router.openapi(routes.deleteEndpoint, handlers.deleteEndpoint);
router.openapi(routes.listEndpoints, handlers.listEndpoints);

// ==================== Adaptive Scheduling Routes ====================
router.openapi(routes.applyIntervalHint, handlers.applyIntervalHint);
router.openapi(routes.scheduleOneShot, handlers.scheduleOneShot);
router.openapi(routes.pauseEndpoint, handlers.pauseEndpoint);
router.openapi(routes.clearHints, handlers.clearHints);
router.openapi(routes.resetFailures, handlers.resetFailures);

// ==================== Execution Visibility Routes ====================
router.openapi(routes.listRuns, handlers.listRuns);
router.openapi(routes.getRunDetails, handlers.getRunDetails);
router.openapi(routes.getHealthSummary, handlers.getHealthSummary);

export default router;
