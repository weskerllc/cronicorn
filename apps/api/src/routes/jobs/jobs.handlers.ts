import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./jobs.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import * as mappers from "./jobs.mappers.js";

// ==================== Job Lifecycle Handlers ====================

export const createJob: AppRouteHandler<routes.CreateJobRoute> = async (c) => {
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const job = await manager.createJob(userId, input);
    return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.CREATED);
  });
};

export const getJob: AppRouteHandler<routes.GetJobRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const job = await manager.getJob(userId, id);
    if (!job) {
      return c.json({ message: "Job not found" }, HTTPStatusCodes.NOT_FOUND);
    }
    return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.OK);
  });
};

export const listJobs: AppRouteHandler<routes.ListJobsRoute> = async (c) => {
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const jobs = await manager.listJobs(userId, query);
    return c.json(
      { jobs: jobs.map(mappers.mapJobWithCountToResponse) },
      HTTPStatusCodes.OK,
    );
  });
};

export const updateJob: AppRouteHandler<routes.UpdateJobRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const job = await manager.updateJob(userId, id, input);
      return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const archiveJob: AppRouteHandler<routes.ArchiveJobRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const job = await manager.archiveJob(userId, id);
      return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Archive failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const pauseJob: AppRouteHandler<routes.PauseJobRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const job = await manager.pauseJob(userId, id);
      return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Pause failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const resumeJob: AppRouteHandler<routes.ResumeJobRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const job = await manager.resumeJob(userId, id);
      return c.json(mappers.mapJobToResponse(job), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Resume failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

// ==================== Endpoint Orchestration Handlers ====================

export const addEndpoint: AppRouteHandler<routes.AddEndpointRoute> = async (c) => {
  const { jobId } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const endpoint = await manager.addEndpointToJob(userId, { ...input, jobId });
      return c.json(mappers.mapEndpointToResponse(endpoint), HTTPStatusCodes.CREATED);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      if (message.includes("ValidationError") || message.includes("Endpoint limit reached") || message.includes("Interval too short")) {
        return c.json({ message }, HTTPStatusCodes.BAD_REQUEST);
      }
      throw error;
    }
  });
};

export const updateEndpoint: AppRouteHandler<routes.UpdateEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const endpoint = await manager.updateEndpointConfig(userId, id, input);
      return c.json(mappers.mapEndpointToResponse(endpoint), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const deleteEndpoint: AppRouteHandler<routes.DeleteEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.deleteEndpoint(userId, id);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      // TODO: Remove anywhere that is checking for message content as below in favor of better typed error messages
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const archiveEndpoint: AppRouteHandler<routes.ArchiveEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const archived = await manager.archiveEndpoint(userId, id);
      return c.json(mappers.mapEndpointToResponse(archived), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Archive failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const getEndpoint: AppRouteHandler<routes.GetEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const endpoint = await manager.getEndpoint(userId, id);
      if (!endpoint) {
        return c.json({ message: "Endpoint not found" }, HTTPStatusCodes.NOT_FOUND);
      }
      return c.json(mappers.mapEndpointToResponse(endpoint), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Fetch failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const listEndpoints: AppRouteHandler<routes.ListEndpointsRoute> = async (c) => {
  const { jobId } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const endpoints = await manager.listEndpointsByJob(userId, jobId);
      return c.json(
        { endpoints: endpoints.map(mappers.mapEndpointToResponse) },
        HTTPStatusCodes.OK,
      );
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "List failed";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

// ==================== Adaptive Scheduling Handlers ====================

export const applyIntervalHint: AppRouteHandler<routes.ApplyIntervalHintRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.applyIntervalHint(userId, id, input);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply hint";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      if (message.includes("ValidationError") || message.includes("below minimum") || message.includes("exceeds maximum")) {
        return c.json({ message }, HTTPStatusCodes.BAD_REQUEST);
      }
      throw error;
    }
  });
};

export const scheduleOneShot: AppRouteHandler<routes.ScheduleOneShotRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.scheduleOneShotRun(userId, id, input);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to schedule";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      if (message.includes("ValidationError") || message.includes("must be in the future")) {
        return c.json({ message }, HTTPStatusCodes.BAD_REQUEST);
      }
      throw error;
    }
  });
};

export const pauseEndpoint: AppRouteHandler<routes.PauseEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.pauseOrResumeEndpoint(userId, id, input);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to pause/resume";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const clearHints: AppRouteHandler<routes.ClearHintsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.clearAdaptiveHints(userId, id);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear hints";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

export const resetFailures: AppRouteHandler<routes.ResetFailuresRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      await manager.resetFailureCount(userId, id);
      return c.body(null, HTTPStatusCodes.NO_CONTENT);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset failures";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

// ==================== Execution Visibility Handlers ====================

export const listRuns: AppRouteHandler<routes.ListRunsRoute> = async (c) => {
  const { id: endpointId } = c.req.valid("param");
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const result = await manager.listRuns(userId, { ...query, endpointId });
    return c.json(mappers.mapListRunsToResponse(result), HTTPStatusCodes.OK);
  });
};

export const getRunDetails: AppRouteHandler<routes.GetRunDetailsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const run = await manager.getRunDetails(userId, id);
    if (!run) {
      return c.json({ message: "Run not found" }, HTTPStatusCodes.NOT_FOUND);
    }
    return c.json(mappers.mapRunDetailsToResponse(run), HTTPStatusCodes.OK);
  });
};

export const getHealthSummary: AppRouteHandler<routes.GetHealthSummaryRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const summary = await manager.summarizeEndpointHealth(userId, id, query.sinceHours);
      return c.json(mappers.mapHealthSummaryToResponse(summary), HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get health summary";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};

// ==================== AI Analysis Sessions Handlers ====================

export const listSessions: AppRouteHandler<routes.ListSessionsRoute> = async (c) => {
  const { id: endpointId } = c.req.valid("param");
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const sessions = await manager.listSessions(userId, endpointId, query.limit);
      return c.json({ sessions, total: sessions.length }, HTTPStatusCodes.OK);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list sessions";
      if (message.includes("not found") || message.includes("unauthorized")) {
        return c.json({ message }, HTTPStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  });
};
