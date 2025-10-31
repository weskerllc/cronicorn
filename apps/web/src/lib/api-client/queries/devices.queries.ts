import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses)
type SuccessResponse<T> = Exclude<T, { message: string } | { success: boolean; error: unknown }>;

/**
 * Devices API Query Helpers
 *
 * Provides type-safe access to connected OAuth devices endpoints.
 * Uses Hono RPC client for end-to-end type safety.
 */

// ==================== Query Functions ====================

const $listDevices = apiClient.api.devices.$get;
export type ListDevicesResponse = SuccessResponse<InferResponseType<typeof $listDevices>>;

export async function listDevices(): Promise<ListDevicesResponse> {
    const resp = await apiClient.api.devices.$get({ param: {} });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
}

// ==================== Mutation Functions ====================

const $revokeDevice = apiClient.api.devices[":tokenId"].$delete;
type RevokeDeviceResponse = SuccessResponse<InferResponseType<typeof $revokeDevice>>;

export async function revokeDevice(tokenId: string): Promise<RevokeDeviceResponse> {
    const resp = await apiClient.api.devices[":tokenId"].$delete({
        param: { tokenId },
    });
    const json = await resp.json();

    // Check for error responses
    if ("message" in json) {
        throw new Error(json.message);
    }
    if ("error" in json && "success" in json && !json.success) {
        throw new Error(
            typeof json.error === "object" && json.error !== null && "name" in json.error
                ? String(json.error.name)
                : "Failed to revoke device",
        );
    }

    return json;
}


// ==================== Query Options Factories ====================

export const DEVICES_QUERY_KEY = ["connected-devices"] as const;

/**
 * Query options for listing connected devices
 * Usage: useQuery(devicesQueryOptions())
 */
export function devicesQueryOptions() {
    return queryOptions({
        queryKey: DEVICES_QUERY_KEY,
        queryFn: () => listDevices(),
        staleTime: 30000, // 30 seconds
    });
}
