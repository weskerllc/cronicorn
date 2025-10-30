import { AddEndpointRequestSchema, UpdateEndpointRequestSchema } from "@cronicorn/api-contracts/jobs";
import type { CreateEndpointForm, UpdateEndpointForm } from "./schemas";
import type { z } from "zod";

// Type helpers for API contract schemas
type AddEndpointRequest = z.infer<typeof AddEndpointRequestSchema>;
type UpdateEndpointRequest = z.infer<typeof UpdateEndpointRequestSchema>;

/**
 * Transforms and validates form data using API contract schemas
 * This ensures API contracts are the single source of truth for validation
 */
export function transformCreatePayload(data: CreateEndpointForm): AddEndpointRequest {
    const payload: Partial<AddEndpointRequest> = {
        name: data.name,
        description: data.description,
        url: data.url,
        method: data.method,
    };

    if (data.scheduleType === "interval") {
        payload.baselineIntervalMs = data.baselineIntervalMinutes * 60 * 1000;
    } else {
        payload.baselineCron = data.baselineCron;
    }

    // Transform headers array to headersJson object
    if (data.headers && data.headers.length > 0) {
        payload.headersJson = data.headers.reduce((acc, header) => {
            if (header.key && header.value) {
                acc[header.key] = header.value;
            }
            return acc;
        }, {} as Record<string, string>);
    }

    // Use API contract schema for validation - this is the single source of truth
    return AddEndpointRequestSchema.parse(payload);
}

/**
 * Transforms and validates form data using API contract schemas
 * This ensures API contracts are the single source of truth for validation
 */
export function transformUpdatePayload(data: UpdateEndpointForm): UpdateEndpointRequest {
    const payload: Partial<UpdateEndpointRequest> = {
        name: data.name,
        description: data.description,
        url: data.url,
        method: data.method,
    };

    if (data.scheduleType === "interval") {
        payload.baselineIntervalMs = data.baselineIntervalMinutes * 60 * 1000;
        payload.baselineCron = undefined; // Clear cron when switching to interval
    } else {
        payload.baselineCron = data.baselineCron;
        payload.baselineIntervalMs = undefined; // Clear interval when switching to cron
    }

    // Transform headers array to headersJson object
    if (data.headers && data.headers.length > 0) {
        payload.headersJson = data.headers.reduce((acc, header) => {
            if (header.key && header.value) {
                acc[header.key] = header.value;
            }
            return acc;
        }, {} as Record<string, string>);
    } else {
        payload.headersJson = {}; // Clear headers if none provided
    }

    // Use API contract schema for validation - this is the single source of truth
    return UpdateEndpointRequestSchema.parse(payload);
}

/**
 * Converts API endpoint data to form format for editing
 */
export function endpointToFormData(endpoint: any) {
    // Convert headersJson object to key-value array for form
    const headersArray = endpoint.headersJson
        ? Object.entries(endpoint.headersJson).map(([key, value]) => ({ key, value }))
        : [];

    // Determine schedule type based on existing data
    const scheduleType = endpoint.baselineCron ? "cron" : "interval";

    return {
        scheduleType,
        name: endpoint.name,
        description: endpoint.description,
        url: endpoint.url || "",
        method: endpoint.method || "GET",
        baselineIntervalMinutes: endpoint.baselineIntervalMs
            ? Math.round(endpoint.baselineIntervalMs / 60000)
            : undefined,
        baselineCron: endpoint.baselineCron || "",
        headers: headersArray,
    };
}