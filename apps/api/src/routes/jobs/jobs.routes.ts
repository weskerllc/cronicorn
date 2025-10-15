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
  summary: "Create a new job",
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
  summary: "Get a job by ID",
  request: {
    params: z.object({ id: z.string() }),
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
  summary: "List all jobs for the authenticated user",
  request: {
    query: z.object({
      status: z.enum(["active", "archived"]).optional(),
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
  summary: "Update a job",
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
  summary: "Archive a job (soft delete)",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.JobResponseSchema, "Archived job"),
    ...errorResponses,
  },
});

// ==================== Endpoint Orchestration Routes ====================

export const addEndpoint = createRoute({
  path: "/jobs/:jobId/endpoints",
  method: "post",
  tags: ["Endpoints"],
  summary: "Add an endpoint to a job",
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
  summary: "Update an endpoint configuration",
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
  summary: "Delete an endpoint",
  request: {
    params: z.object({ jobId: z.string(), id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Endpoint deleted" },
    ...errorResponses,
  },
});

export const listEndpoints = createRoute({
  path: "/jobs/:jobId/endpoints",
  method: "get",
  tags: ["Endpoints"],
  summary: "List all endpoints for a job",
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
  summary: "Apply an interval hint to an endpoint",
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
  summary: "Schedule a one-shot run for an endpoint",
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
  summary: "Pause or resume an endpoint",
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
  summary: "Clear all AI hints for an endpoint",
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
  summary: "Reset failure count for an endpoint",
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
  summary: "List run history for an endpoint",
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
  summary: "Get detailed information about a specific run",
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
  summary: "Get health summary for an endpoint",
  request: {
    params: z.object({ id: z.string() }),
    query: schemas.HealthSummaryQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(schemas.HealthSummaryResponseSchema, "Health summary"),
    ...errorResponses,
  },
});

// Type exports for handlers
export type CreateJobRoute = typeof createJob;
export type GetJobRoute = typeof getJob;
export type ListJobsRoute = typeof listJobs;
export type UpdateJobRoute = typeof updateJob;
export type ArchiveJobRoute = typeof archiveJob;

export type AddEndpointRoute = typeof addEndpoint;
export type UpdateEndpointRoute = typeof updateEndpoint;
export type DeleteEndpointRoute = typeof deleteEndpoint;
export type ListEndpointsRoute = typeof listEndpoints;

export type ApplyIntervalHintRoute = typeof applyIntervalHint;
export type ScheduleOneShotRoute = typeof scheduleOneShot;
export type PauseEndpointRoute = typeof pauseEndpoint;
export type ClearHintsRoute = typeof clearHints;
export type ResetFailuresRoute = typeof resetFailures;

export type ListRunsRoute = typeof listRuns;
export type GetRunDetailsRoute = typeof getRunDetails;
export type GetHealthSummaryRoute = typeof getHealthSummary;
