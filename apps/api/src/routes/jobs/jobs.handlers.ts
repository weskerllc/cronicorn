import type { JobEndpoint } from "@cronicorn/domain";

import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./jobs.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import { handleErrorResponse } from "../../lib/error-utils.js";
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
      return handleErrorResponse(c, error, {
        operation: "updateJob",
        userId,
      }, {
        defaultMessage: "Update failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "archiveJob",
        userId,
      }, {
        defaultMessage: "Archive failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "pauseJob",
        userId,
      }, {
        defaultMessage: "Pause failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "resumeJob",
        userId,
      }, {
        defaultMessage: "Resume failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "addEndpoint",
        userId,
      }, {
        defaultMessage: "Create failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "updateEndpoint",
        userId,
      }, {
        defaultMessage: "Update failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "deleteEndpoint",
        userId,
      }, {
        defaultMessage: "Delete failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "archiveEndpoint",
        userId,
      }, {
        defaultMessage: "Archive failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "getEndpoint",
        userId,
      }, {
        defaultMessage: "Fetch failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "listEndpoints",
        userId,
      }, {
        defaultMessage: "List failed",
      });
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
      return handleErrorResponse(c, error, {
        operation: "applyIntervalHint",
        userId,
      }, {
        defaultMessage: "Failed to apply hint",
      });
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
      return handleErrorResponse(c, error, {
        operation: "scheduleOneShot",
        userId,
      }, {
        defaultMessage: "Failed to schedule",
      });
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
      return handleErrorResponse(c, error, {
        operation: "pauseEndpoint",
        userId,
      }, {
        defaultMessage: "Failed to pause/resume",
      });
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
      return handleErrorResponse(c, error, {
        operation: "clearHints",
        userId,
      }, {
        defaultMessage: "Failed to clear hints",
      });
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
      return handleErrorResponse(c, error, {
        operation: "resetFailures",
        userId,
      }, {
        defaultMessage: "Failed to reset failures",
      });
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
      return handleErrorResponse(c, error, {
        operation: "getHealthSummary",
        userId,
      }, {
        defaultMessage: "Failed to get health summary",
      });
    }
  });
};

/**
 * Test endpoint handler — three-phase pattern:
 * 1. Auth check in transaction (fetch endpoint, verify ownership)
 * 2. Dispatch HTTP request outside transaction (may be long-running)
 * 3. Record test run in new transaction
 *
 * Uses closure capture because withJobsManager requires Response return type.
 */
// @ts-expect-error - Multi-phase withJobsManager pattern causes deep type instantiation
export const testEndpoint: AppRouteHandler<routes.TestEndpointRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  // Phase 1: Auth check + fetch endpoint (in transaction)
  let endpoint: JobEndpoint | null = null;

  await c.get("withJobsManager")(async (manager) => {
    endpoint = await manager.getEndpoint(userId, id);
    return c.body(null, HTTPStatusCodes.NO_CONTENT);
  });

  if (!endpoint) {
    return c.json({ message: "Endpoint not found" }, HTTPStatusCodes.NOT_FOUND);
  }

  // Re-bind after null guard (TS can't track closure mutations)
  const ep: JobEndpoint = endpoint;

  // Block archived endpoints (allow paused — they're often paused for debugging)
  if (ep.archivedAt) {
    return c.json({ message: "Cannot test an archived endpoint" }, HTTPStatusCodes.BAD_REQUEST);
  }

  // Phase 2: Execute the HTTP request (outside transaction — may be long-running)
  const dispatcher = c.get("dispatcher");
  const result = await dispatcher.execute(ep);

  // Phase 3: Record the test run (new transaction)
  return c.get("withJobsManager")(async (manager) => {
    const testResult = await manager.recordTestRun(id, result);
    return c.json(testResult, HTTPStatusCodes.OK);
  });
};

// ==================== AI Analysis Sessions Handlers ====================

export const listSessions: AppRouteHandler<routes.ListSessionsRoute> = async (c) => {
  const { id: endpointId } = c.req.valid("param");
  const query = c.req.valid("query");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    try {
      const result = await manager.listSessions(userId, endpointId, query.limit, query.offset);
      return c.json(result, HTTPStatusCodes.OK);
    }
    catch (error) {
      return handleErrorResponse(c, error, {
        operation: "listSessions",
        userId,
      }, {
        defaultMessage: "Failed to list sessions",
      });
    }
  });
};

export const getSession: AppRouteHandler<routes.GetSessionRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { userId } = getAuthContext(c);

  return c.get("withJobsManager")(async (manager) => {
    const session = await manager.getSession(userId, id);
    if (!session) {
      return c.json({ message: "Session not found" }, HTTPStatusCodes.NOT_FOUND);
    }
    return c.json({
      id: session.id,
      endpointId: session.endpointId,
      endpointName: session.endpointName,
      analyzedAt: session.analyzedAt.toISOString(),
      toolCalls: session.toolCalls,
      reasoning: session.reasoning,
      tokenUsage: session.tokenUsage,
      durationMs: session.durationMs,
      warnings: session.warnings,
    }, HTTPStatusCodes.OK);
  });
};
