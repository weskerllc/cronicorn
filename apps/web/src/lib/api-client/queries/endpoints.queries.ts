import type { InferRequestType, InferResponseType } from "hono/client";

import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

// ==================== Query Functions ====================

const $listEndpoints = apiClient.api.jobs[":jobId"].endpoints.$get;
type ListEndpointsResponse = SuccessResponse<InferResponseType<typeof $listEndpoints>>;

export async function listEndpoints(jobId: string): Promise<ListEndpointsResponse> {
  const resp = await apiClient.api.jobs[":jobId"].endpoints.$get({ param: { jobId } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $getEndpoint = apiClient.api.jobs[":jobId"].endpoints[":id"].$get;
type GetEndpointResponse = SuccessResponse<InferResponseType<typeof $getEndpoint>>;

export async function getEndpoint(jobId: string, id: string): Promise<GetEndpointResponse> {
  const resp = await apiClient.api.jobs[":jobId"].endpoints[":id"].$get({ param: { jobId, id } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Mutation Functions ====================

const $createEndpoint = apiClient.api.jobs[":jobId"].endpoints.$post;
type CreateEndpointRequest = InferRequestType<typeof $createEndpoint>["json"];
type CreateEndpointResponse = SuccessResponse<InferResponseType<typeof $createEndpoint>>;

export async function createEndpoint(jobId: string, data: CreateEndpointRequest): Promise<CreateEndpointResponse> {
  const resp = await apiClient.api.jobs[":jobId"].endpoints.$post({
    param: { jobId },
    json: data,
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $updateEndpoint = apiClient.api.jobs[":jobId"].endpoints[":id"].$patch;
type UpdateEndpointRequest = InferRequestType<typeof $updateEndpoint>["json"];
type UpdateEndpointResponse = SuccessResponse<InferResponseType<typeof $updateEndpoint>>;

export async function updateEndpoint(jobId: string, id: string, data: UpdateEndpointRequest): Promise<UpdateEndpointResponse> {
  const resp = await apiClient.api.jobs[":jobId"].endpoints[":id"].$patch({
    param: { jobId, id },
    json: data,
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

export async function deleteEndpoint(jobId: string, id: string): Promise<void> {
  const resp = await apiClient.api.jobs[":jobId"].endpoints[":id"].$delete({
    param: { jobId, id },
  });

  if (!resp.ok) {
    const json = await resp.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    throw new Error("Failed to delete endpoint");
  }
}

// ==================== Endpoint Action Mutations ====================

const $pauseEndpoint = apiClient.api.endpoints[":id"].pause.$post;
type PauseEndpointRequest = InferRequestType<typeof $pauseEndpoint>["json"];

export async function pauseEndpoint(id: string, data: PauseEndpointRequest): Promise<void> {
  const resp = await apiClient.api.endpoints[":id"].pause.$post({
    param: { id },
    json: data,
  });

  if (!resp.ok) {
    const json = await resp.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    throw new Error("Failed to pause endpoint");
  }
}

export async function resetFailures(id: string): Promise<void> {
  const resp = await apiClient.api.endpoints[":id"]["reset-failures"].$post({
    param: { id },
  });

  if (!resp.ok) {
    const json = await resp.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    throw new Error("Failed to reset failures");
  }
}

export async function clearHints(id: string): Promise<void> {
  const resp = await apiClient.api.endpoints[":id"].hints.$delete({
    param: { id },
  });

  if (!resp.ok) {
    const json = await resp.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    throw new Error("Failed to clear hints");
  }
}

// ==================== Query Options Factories ====================

/**
 * Query options for listing endpoints for a job
 * Usage: useSuspenseQuery(endpointsQueryOptions(jobId))
 */
export function endpointsQueryOptions(jobId: string) {
  return queryOptions({
    queryKey: ["jobs", jobId, "endpoints"] as const,
    queryFn: () => listEndpoints(jobId),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Query options for getting a single endpoint
 * Usage: useSuspenseQuery(endpointQueryOptions(jobId, endpointId))
 */
export function endpointQueryOptions(jobId: string, id: string) {
  return queryOptions({
    queryKey: ["jobs", jobId, "endpoints", id] as const,
    queryFn: () => getEndpoint(jobId, id),
    staleTime: 30000, // 30 seconds
  });
}
