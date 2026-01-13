import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferResponseType } from "hono/client";

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
type GetDashboardStatsResponse = SuccessResponse<InferResponseType<typeof $getDashboard>>;

// Query parameters with Date objects (frontend-friendly)
interface DashboardStatsQuery {
    jobId?: string;
    source?: string;
    startDate: Date;
    endDate: Date;
    endpointLimit?: number;
}

export async function getDashboardStats(
    query: DashboardStatsQuery
): Promise<GetDashboardStatsResponse> {
    // Convert Date objects to ISO strings for the API
    const apiQuery = {
        jobId: query.jobId,
        source: query.source,
        startDate: query.startDate,
        endDate: query.endDate,
        endpointLimit: query.endpointLimit,
    };

    const resp = await apiClient.api.dashboard.stats.$get({ query: apiQuery, param: {} });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
}

// ==================== Dashboard Activity Timeline ====================

const $getDashboardActivity = apiClient.api.dashboard.activity.$get;
type GetDashboardActivityResponse = SuccessResponse<InferResponseType<typeof $getDashboardActivity>>;

// Query parameters with Date objects (frontend-friendly)
interface DashboardActivityQuery {
    jobId?: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
    offset?: number;
}

export async function getDashboardActivity(
    query: DashboardActivityQuery
): Promise<GetDashboardActivityResponse> {
    // Convert Date objects to ISO strings for the API
    const apiQuery = {
        jobId: query.jobId,
        startDate: query.startDate,
        endDate: query.endDate,
        limit: query.limit,
        offset: query.offset,
    };

    const resp = await apiClient.api.dashboard.activity.$get({ query: apiQuery, param: {} });
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
export function dashboardStatsQueryOptions(query: DashboardStatsQuery) {
    // Create a stable query key using ISO strings for dates
    const queryKeyData = {
        jobId: query.jobId,
        source: query.source,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        endpointLimit: query.endpointLimit,
    };

    return queryOptions({
        queryKey: [DASHBOARD_QUERY_KEY, "stats", queryKeyData] as const,
        queryFn: () => getDashboardStats(query),
        staleTime: 30000, // 30 seconds - dashboard data doesn't need to be real-time
    });
}

/**
 * Infinite query options for dashboard activity with pagination
 * Fetches pages of activity events, accumulating them as user scrolls/loads more
 */
export function dashboardActivityInfiniteQueryOptions(
    baseQuery: Omit<DashboardActivityQuery, "offset"> & { limit?: number }
) {
    const limit = baseQuery.limit ?? 20;

    // Create a stable query key using ISO strings for dates
    const queryKeyData = {
        jobId: baseQuery.jobId,
        startDate: baseQuery.startDate.toISOString(),
        endDate: baseQuery.endDate.toISOString(),
        limit,
    };

    return infiniteQueryOptions({
        queryKey: [DASHBOARD_QUERY_KEY, "activity-infinite", queryKeyData] as const,
        queryFn: ({ pageParam = 0 }) =>
            getDashboardActivity({ ...baseQuery, limit, offset: pageParam }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const totalFetched = allPages.reduce((sum, p) => sum + p.events.length, 0);
            return totalFetched < lastPage.total ? totalFetched : undefined;
        },
        staleTime: 30000,
    });
}
