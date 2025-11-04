/**
 * Auth Config Queries
 * 
 * Provides queries for fetching available authentication methods.
 */

import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferResponseType } from "hono/client";

// Type helper to extract success response
type SuccessResponse<T> = Exclude<T, { message: string }>;

const $get = apiClient.api.auth.config.$get;
export type AuthConfigResponse = SuccessResponse<InferResponseType<typeof $get>>;

/**
 * Fetch available authentication methods (public endpoint)
 */
export async function getAuthConfig(): Promise<AuthConfigResponse> {
    const response = await apiClient.api.auth.config.$get({ param: {} });
    const json = await response.json();

    if ("message" in json) {
        throw new Error(String(json.message));
    }
    return json;
}

export const AUTH_CONFIG_QUERY_KEY = ["auth", "config"] as const;

/**
 * Query options for fetching auth configuration
 * Usage: useSuspenseQuery(authConfigQueryOptions())
 */
export function authConfigQueryOptions() {
    return queryOptions({
        queryKey: AUTH_CONFIG_QUERY_KEY,
        queryFn: getAuthConfig,
        staleTime: Number.POSITIVE_INFINITY, // Never refetch - config doesn't change during session
    });
}

