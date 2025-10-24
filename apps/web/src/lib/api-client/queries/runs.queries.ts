
import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

// ==================== Query Functions ====================

const $listRuns = apiClient.api.endpoints[":id"].runs.$get;
type ListRunsQuery = InferRequestType<typeof $listRuns>["query"];
type ListRunsResponse = SuccessResponse<InferResponseType<typeof $listRuns>>;

export async function listRuns(endpointId: string, filters?: ListRunsQuery): Promise<ListRunsResponse> {
  const resp = await apiClient.api.endpoints[":id"].runs.$get({
    param: { id: endpointId },
    query: filters || {},
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $getRun = apiClient.api.runs[":id"].$get;
type GetRunResponse = SuccessResponse<InferResponseType<typeof $getRun>>;

export async function getRun(runId: string): Promise<GetRunResponse> {
  const resp = await apiClient.api.runs[":id"].$get({ param: { id: runId } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $getHealth = apiClient.api.endpoints[":id"].health.$get;
type GetHealthQuery = InferRequestType<typeof $getHealth>["query"];
type GetHealthResponse = SuccessResponse<InferResponseType<typeof $getHealth>>;

export async function getEndpointHealth(endpointId: string, query?: GetHealthQuery): Promise<GetHealthResponse> {
  const resp = await apiClient.api.endpoints[":id"].health.$get({
    param: { id: endpointId },
    query: query || {},
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Query Options Factories ====================

/**
 * Query options for listing runs for an endpoint
 * Usage: useSuspenseQuery(runsQueryOptions(endpointId, filters))
 */
export function runsQueryOptions(endpointId: string, filters?: ListRunsQuery) {
  return queryOptions({
    queryKey: ["endpoints", endpointId, "runs", filters] as const,
    queryFn: () => listRuns(endpointId, filters),
    staleTime: 60000, // 60 seconds - run history changes less frequently
  });
}

/**
 * Query options for getting a single run
 * Usage: useSuspenseQuery(runQueryOptions(runId))
 */
export function runQueryOptions(runId: string) {
  return queryOptions({
    queryKey: ["runs", runId] as const,
    queryFn: () => getRun(runId),
    staleTime: 60000, // 60 seconds - historical data doesn't change
  });
}

/**
 * Query options for getting endpoint health summary
 * Usage: useSuspenseQuery(healthQueryOptions(endpointId))
 */
export function healthQueryOptions(endpointId: string, query?: GetHealthQuery) {
  return queryOptions({
    queryKey: ["endpoints", endpointId, "health", query] as const,
    queryFn: () => getEndpointHealth(endpointId, query),
    staleTime: 10000, // 10 seconds - health data is time-sensitive
  });
}
