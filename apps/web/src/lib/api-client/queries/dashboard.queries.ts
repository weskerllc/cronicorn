import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

/**
 * Dashboard API Query Helpers
 *
 * Provides type-safe queries for the dashboard stats endpoint.
 * Uses InferRequestType/InferResponseType from Hono RPC client for type safety.
 */

// ==================== Query Functions ====================

const $getDashboard = apiClient.api.dashboard.stats.$get;
type GetDashboardStatsQuery = InferRequestType<typeof $getDashboard>["query"];
type GetDashboardStatsResponse = SuccessResponse<InferResponseType<typeof $getDashboard>>;

export async function getDashboardStats(
    query: GetDashboardStatsQuery = {}
): Promise<GetDashboardStatsResponse> {
    const resp = await apiClient.api.dashboard.stats.$get({ query, param: {} });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
}

// ==================== Query Options Factories ====================

export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

/**
 * Query options for dashboard stats
 * Usage: useQuery(dashboardStatsQueryOptions()), useSuspenseQuery(dashboardStatsQueryOptions())
 *
 * Note: Dashboard data is set with a 30-second staleTime since aggregate metrics
 * don't need to be real-time and this reduces server load.
 */
export function dashboardStatsQueryOptions(query: GetDashboardStatsQuery = {}) {
    return queryOptions({
        queryKey: [DASHBOARD_QUERY_KEY, "stats", query] as const,
        queryFn: () => getDashboardStats(query),
        staleTime: 30000, // 30 seconds - dashboard data doesn't need to be real-time
    });
}
