import { createRouter } from "../../types.js";
import * as handlers from "./jobs.handlers.js";
import * as routes from "./jobs.routes.js";

const router = createRouter()
  // ==================== Job Lifecycle Routes ====================
  .openapi(routes.createJob, handlers.createJob)
  .openapi(routes.getJob, handlers.getJob)
  .openapi(routes.listJobs, handlers.listJobs)
  .openapi(routes.updateJob, handlers.updateJob)
  .openapi(routes.archiveJob, handlers.archiveJob)

  // ==================== Endpoint Orchestration Routes ====================
  .openapi(routes.addEndpoint, handlers.addEndpoint)
  .openapi(routes.updateEndpoint, handlers.updateEndpoint)
  .openapi(routes.deleteEndpoint, handlers.deleteEndpoint)
  .openapi(routes.getEndpoint, handlers.getEndpoint)
  .openapi(routes.listEndpoints, handlers.listEndpoints)

  // ==================== Adaptive Scheduling Routes ====================
  .openapi(routes.applyIntervalHint, handlers.applyIntervalHint)
  .openapi(routes.scheduleOneShot, handlers.scheduleOneShot)
  .openapi(routes.pauseEndpoint, handlers.pauseEndpoint)
  .openapi(routes.clearHints, handlers.clearHints)
  .openapi(routes.resetFailures, handlers.resetFailures)

  // ==================== Execution Visibility Routes ====================
  .openapi(routes.listRuns, handlers.listRuns)
  .openapi(routes.getRunDetails, handlers.getRunDetails)
  .openapi(routes.getHealthSummary, handlers.getHealthSummary);

export default router;
