import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";

import type { InferRequestType, InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

// ==================== Query Functions ====================

const $listEndpoints = apiClient.api.jobs[":jobId"].endpoints.$get;
type ListEndpointsResponse = SuccessResponse<InferResponseType<typeof $listEndpoints>>;

export const listEndpoints = async (jobId: string): Promise<ListEndpointsResponse> => {
    const resp = await apiClient.api.jobs[":jobId"].endpoints.$get({ param: { jobId } });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

const $getEndpoint = apiClient.api.jobs[":jobId"].endpoints[":id"].$get;
type GetEndpointResponse = SuccessResponse<InferResponseType<typeof $getEndpoint>>;

export const getEndpoint = async (jobId: string, id: string): Promise<GetEndpointResponse> => {
    const resp = await apiClient.api.jobs[":jobId"].endpoints[":id"].$get({ param: { jobId, id } });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

// ==================== Mutation Functions ====================

const $createEndpoint = apiClient.api.jobs[":jobId"].endpoints.$post;
type CreateEndpointRequest = InferRequestType<typeof $createEndpoint>["json"];
type CreateEndpointResponse = SuccessResponse<InferResponseType<typeof $createEndpoint>>;

export const createEndpoint = async (
    jobId: string,
    data: CreateEndpointRequest,
): Promise<CreateEndpointResponse> => {
    const resp = await apiClient.api.jobs[":jobId"].endpoints.$post({
        param: { jobId },
        json: data,
    });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

const $updateEndpoint = apiClient.api.jobs[":jobId"].endpoints[":id"].$patch;
type UpdateEndpointRequest = InferRequestType<typeof $updateEndpoint>["json"];
type UpdateEndpointResponse = SuccessResponse<InferResponseType<typeof $updateEndpoint>>;

export const updateEndpoint = async (
    jobId: string,
    id: string,
    data: UpdateEndpointRequest,
): Promise<UpdateEndpointResponse> => {
    const resp = await apiClient.api.jobs[":jobId"].endpoints[":id"].$patch({
        param: { jobId, id },
        json: data,
    });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

export const deleteEndpoint = async (jobId: string, id: string): Promise<void> => {
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
};

// ==================== Endpoint Action Mutations ====================

const $pauseEndpoint = apiClient.api.endpoints[":id"].pause.$post;
type PauseEndpointRequest = InferRequestType<typeof $pauseEndpoint>["json"];

export const pauseEndpoint = async (id: string, data: PauseEndpointRequest): Promise<void> => {
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
};

export const resetFailures = async (id: string): Promise<void> => {
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
};

export const clearHints = async (id: string): Promise<void> => {
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
};

// ==================== Query Options Factories ====================

/**
 * Query options for listing endpoints for a job
 * Usage: useSuspenseQuery(endpointsQueryOptions(jobId))
 */
export const endpointsQueryOptions = (jobId: string) => queryOptions({
    queryKey: ["jobs", jobId, "endpoints"] as const,
    queryFn: () => listEndpoints(jobId),
    staleTime: 30000, // 30 seconds
});

/**
 * Query options for getting a single endpoint
 * Usage: useSuspenseQuery(endpointQueryOptions(jobId, endpointId))
 */
export const endpointQueryOptions = (jobId: string, id: string) => queryOptions({
    queryKey: ["jobs", jobId, "endpoints", id] as const,
    queryFn: () => getEndpoint(jobId, id),
    staleTime: 30000, // 30 seconds
});
