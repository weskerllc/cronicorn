import * as sessionsSchemas from "@cronicorn/api-contracts/sessions";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import * as schemas from "./jobs.schemas.js";

const tags = ["Jobs"];
const errorResponses = {
  [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
    z.object({ message: z.string() }),
    "Authentication required",
  ),
  [HttpStatusCodes.NOT_FOUND]: jsonContent(
    z.object({ message: z.string() }),
    "Resource not found",
  ),
  [HttpStatusCodes.BAD_REQUEST]: jsonContent(
    z.object({ message: z.string() }),
    "Invalid request",
  ),
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
    z.object({ message: z.string() }),
    "Internal server error",
  ),
};

// ==================== Job Lifecycle Routes ====================

export const createJob = createRoute({
  path: "/jobs",
  method: "post",
  tags,
  summary: schemas.CreateJobSummary,
  description: schemas.CreateJobDescription,
  request: {
    body: jsonContentRequired(schemas.CreateJobRequestSchema, "Job data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(schemas.JobResponseSchema, "Job created"),
    ...errorResponses,
  },
});

export const getJob = createRoute({
  path: "/jobs/:id",
  method: "get",
  tags,
  summary: schemas.GetJobSummary,
  description: schemas.GetJobDescription,
  request: {
    params: schemas.GetJobRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Job details"),
    ...errorResponses,
  },
});

export const listJobs = createRoute({
  path: "/jobs",
  method: "get",
  tags,
  summary: schemas.ListJobsSummary,
  description: schemas.ListJobsDescription,
  request: {
    query: z.object({
      status: z.enum(["active", "paused", "archived"]).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ jobs: z.array(schemas.JobWithCountResponseSchema) }),
      "List of jobs",
    ),
    ...errorResponses,
  },
});

export const updateJob = createRoute({
  path: "/jobs/:id",
  method: "patch",
  tags,
  summary: schemas.UpdateJobSummary,
  description: schemas.UpdateJobDescription,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContentRequired(schemas.UpdateJobRequestSchema, "Job updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Updated job"),
    ...errorResponses,
  },
});

export const archiveJob = createRoute({
  path: "/jobs/:id",
  method: "delete",
  tags,
  summary: schemas.ArchiveJobSummary,
  description: schemas.ArchiveJobDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Archived job"),
    ...errorResponses,
  },
});

export const pauseJob = createRoute({
  path: "/jobs/:id/pause",
  method: "post",
  tags,
  summary: schemas.PauseJobSummary,
  description: schemas.PauseJobDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Paused job"),
    ...errorResponses,
  },
});

export const resumeJob = createRoute({
  path: "/jobs/:id/resume",
  method: "post",
  tags,
  summary: schemas.ResumeJobSummary,
  description: schemas.ResumeJobDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Resumed job"),
    ...errorResponses,
  },
});

// ==================== Endpoint Orchestration Routes ====================

export const addEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints",
  method: "post",
  tags: ["Endpoints"],
  summary: schemas.AddEndpointSummary,
  description: schemas.AddEndpointDescription,
  request: {
    params: z.object({ jobId: z.string() }),
    body: jsonContentRequired(schemas.AddEndpointRequestSchema, "Endpoint data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(schemas.EndpointResponseSchema, "Endpoint created"),
    ...errorResponses,
  },
});

export const updateEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints/:id",
  method: "patch",
  tags: ["Endpoints"],
  summary: schemas.UpdateEndpointSummary,
  description: schemas.UpdateEndpointDescription,
  request: {
    params: z.object({ jobId: z.string(), id: z.string() }),
    body: jsonContentRequired(schemas.UpdateEndpointRequestSchema, "Endpoint updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.EndpointResponseSchema, "Updated endpoint"),
    ...errorResponses,
  },
});

export const deleteEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints/:id",
  method: "delete",
  tags: ["Endpoints"],
  summary: schemas.DeleteEndpointSummary,
  description: schemas.DeleteEndpointDescription,
  request: {
    params: z.object({ jobId: z.string(), id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Endpoint deleted" },
    ...errorResponses,
  },
});

export const archiveEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints/:id/archive",
  method: "post",
  tags: ["Endpoints"],
  summary: schemas.ArchiveEndpointSummary,
  description: schemas.ArchiveEndpointDescription,
  request: {
    params: z.object({ jobId: z.string(), id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.EndpointResponseSchema, "Archived endpoint"),
    ...errorResponses,
  },
});

export const getEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints/:id",
  method: "get",
  tags: ["Endpoints"],
  summary: schemas.GetEndpointSummary,
  description: schemas.GetEndpointDescription,
  request: {
    params: z.object({ jobId: z.string(), id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.EndpointResponseSchema, "Endpoint details"),
    ...errorResponses,
  },
});

export const listEndpoints = createRoute({
  path: "/jobs/:jobId/endpoints",
  method: "get",
  tags: ["Endpoints"],
  summary: schemas.ListEndpointsSummary,
  description: schemas.ListEndpointsDescription,
  request: {
    params: z.object({ jobId: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ endpoints: z.array(schemas.EndpointResponseSchema) }),
      "List of endpoints",
    ),
    ...errorResponses,
  },
});

// ==================== Adaptive Scheduling Routes ====================

export const applyIntervalHint = createRoute({
  path: "/endpoints/:id/hints/interval",
  method: "post",
  tags: ["Adaptive Scheduling"],
  summary: schemas.ApplyIntervalHintSummary,
  description: schemas.ApplyIntervalHintDescription,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContentRequired(schemas.ApplyIntervalHintRequestSchema, "Interval hint"),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Hint applied" },
    ...errorResponses,
  },
});

export const scheduleOneShot = createRoute({
  path: "/endpoints/:id/hints/oneshot",
  method: "post",
  tags: ["Adaptive Scheduling"],
  summary: schemas.ScheduleOneShotSummary,
  description: schemas.ScheduleOneShotDescription,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContentRequired(schemas.ScheduleOneShotRequestSchema, "One-shot schedule"),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "One-shot scheduled" },
    ...errorResponses,
  },
});

export const pauseEndpoint = createRoute({
  path: "/endpoints/:id/pause",
  method: "post",
  tags: ["Adaptive Scheduling"],
  summary: schemas.PauseResumeSummary,
  description: schemas.PauseResumeDescription,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContentRequired(schemas.PauseResumeRequestSchema, "Pause configuration"),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Endpoint paused/resumed" },
    ...errorResponses,
  },
});

export const clearHints = createRoute({
  path: "/endpoints/:id/hints",
  method: "delete",
  tags: ["Adaptive Scheduling"],
  summary: schemas.ClearHintsSummary,
  description: schemas.ClearHintsDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Hints cleared" },
    ...errorResponses,
  },
});

export const resetFailures = createRoute({
  path: "/endpoints/:id/reset-failures",
  method: "post",
  tags: ["Adaptive Scheduling"],
  summary: schemas.ResetFailuresSummary,
  description: schemas.ResetFailuresDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Failure count reset" },
    ...errorResponses,
  },
});

// ==================== Execution Visibility Routes ====================

export const listRuns = createRoute({
  path: "/endpoints/:id/runs",
  method: "get",
  tags: ["Execution"],
  summary: schemas.ListRunsSummary,
  description: schemas.ListRunsDescription,
  request: {
    params: z.object({ id: z.string() }),
    query: schemas.ListRunsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.ListRunsResponseSchema, "Run history"),
    ...errorResponses,
  },
});

export const getRunDetails = createRoute({
  path: "/runs/:id",
  method: "get",
  tags: ["Execution"],
  summary: schemas.GetRunDetailsSummary,
  description: schemas.GetRunDetailsDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.RunDetailsResponseSchema, "Run details"),
    ...errorResponses,
  },
});

export const getHealthSummary = createRoute({
  path: "/endpoints/:id/health",
  method: "get",
  tags: ["Execution"],
  summary: schemas.GetHealthSummarySummary,
  description: schemas.GetHealthSummaryDescription,
  request: {
    params: z.object({ id: z.string() }),
    query: schemas.HealthSummaryQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.HealthSummaryResponseSchema, "Health summary"),
    ...errorResponses,
  },
});

// ==================== AI Analysis Sessions Routes ====================

export const listSessions = createRoute({
  path: "/endpoints/:id/sessions",
  method: "get",
  tags: ["AI Analysis"],
  summary: sessionsSchemas.ListSessionsSummary,
  description: sessionsSchemas.ListSessionsDescription,
  request: {
    params: z.object({ id: z.string() }),
    query: sessionsSchemas.ListSessionsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(sessionsSchemas.ListSessionsResponseSchema, "AI analysis sessions"),
    ...errorResponses,
  },
});

export const getSession = createRoute({
  path: "/sessions/:id",
  method: "get",
  tags: ["AI Analysis"],
  summary: sessionsSchemas.GetSessionSummary,
  description: sessionsSchemas.GetSessionDescription,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(sessionsSchemas.AISessionDetailSchema, "AI analysis session details"),
    ...errorResponses,
  },
});

// Type exports for handlers
export type CreateJobRoute = typeof createJob;
export type GetJobRoute = typeof getJob;
export type ListJobsRoute = typeof listJobs;
export type UpdateJobRoute = typeof updateJob;
export type ArchiveJobRoute = typeof archiveJob;
export type PauseJobRoute = typeof pauseJob;
export type ResumeJobRoute = typeof resumeJob;

export type AddEndpointRoute = typeof addEndpoint;
export type UpdateEndpointRoute = typeof updateEndpoint;
export type DeleteEndpointRoute = typeof deleteEndpoint;
export type ArchiveEndpointRoute = typeof archiveEndpoint;
export type GetEndpointRoute = typeof getEndpoint;
export type ListEndpointsRoute = typeof listEndpoints;

export type ApplyIntervalHintRoute = typeof applyIntervalHint;
export type ScheduleOneShotRoute = typeof scheduleOneShot;
export type PauseEndpointRoute = typeof pauseEndpoint;
export type ClearHintsRoute = typeof clearHints;
export type ResetFailuresRoute = typeof resetFailures;

export type ListRunsRoute = typeof listRuns;
export type GetRunDetailsRoute = typeof getRunDetails;
export type GetHealthSummaryRoute = typeof getHealthSummary;

export type ListSessionsRoute = typeof listSessions;
export type GetSessionRoute = typeof getSession;
