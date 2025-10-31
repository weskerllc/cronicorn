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

    // Parse and validate bodyJson if provided
    if (data.bodyJson && data.bodyJson.trim()) {
        try {
            payload.bodyJson = JSON.parse(data.bodyJson);
        } catch (error) {
            throw new Error(`Invalid JSON in request body: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Advanced configuration (convert minutes to milliseconds)
    if (data.minIntervalMinutes) {
        payload.minIntervalMs = data.minIntervalMinutes * 60 * 1000;
    }
    if (data.maxIntervalMinutes) {
        payload.maxIntervalMs = data.maxIntervalMinutes * 60 * 1000;
    }
    if (data.timeoutMs) {
        payload.timeoutMs = data.timeoutMs;
    }
    if (data.maxExecutionTimeMs) {
        payload.maxExecutionTimeMs = data.maxExecutionTimeMs;
    }
    if (data.maxResponseSizeKb) {
        payload.maxResponseSizeKb = data.maxResponseSizeKb;
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

    // Parse and validate bodyJson if provided
    if (data.bodyJson !== undefined) {
        if (data.bodyJson && data.bodyJson.trim()) {
            try {
                payload.bodyJson = JSON.parse(data.bodyJson);
            } catch (error) {
                throw new Error(`Invalid JSON in request body: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } else {
            payload.bodyJson = undefined; // Clear body if empty
        }
    }

    // Advanced configuration (convert minutes to milliseconds)
    if (data.minIntervalMinutes !== undefined) {
        payload.minIntervalMs = data.minIntervalMinutes ? data.minIntervalMinutes * 60 * 1000 : undefined;
    }
    if (data.maxIntervalMinutes !== undefined) {
        payload.maxIntervalMs = data.maxIntervalMinutes ? data.maxIntervalMinutes * 60 * 1000 : undefined;
    }
    if (data.timeoutMs !== undefined) {
        payload.timeoutMs = data.timeoutMs;
    }
    if (data.maxExecutionTimeMs !== undefined) {
        payload.maxExecutionTimeMs = data.maxExecutionTimeMs;
    }
    if (data.maxResponseSizeKb !== undefined) {
        payload.maxResponseSizeKb = data.maxResponseSizeKb;
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

    // Convert bodyJson to string for form
    const bodyJson = endpoint.bodyJson ? JSON.stringify(endpoint.bodyJson, null, 2) : "";

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
        bodyJson,
        // Advanced configuration (convert milliseconds to minutes)
        minIntervalMinutes: endpoint.minIntervalMs
            ? Math.round(endpoint.minIntervalMs / 60000)
            : undefined,
        maxIntervalMinutes: endpoint.maxIntervalMs
            ? Math.round(endpoint.maxIntervalMs / 60000)
            : undefined,
        timeoutMs: endpoint.timeoutMs,
        maxExecutionTimeMs: endpoint.maxExecutionTimeMs,
        maxResponseSizeKb: endpoint.maxResponseSizeKb,
    };
}