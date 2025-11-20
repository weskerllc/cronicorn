import { z } from "zod";
import { AddEndpointRequestSchema, UpdateEndpointRequestSchema } from "@cronicorn/api-contracts/jobs";

// Header form for UI (key-value pairs for form fields)
export const headerSchema = z.object({
    key: z.string().min(1, "Header name is required"),
    value: z.string().min(1, "Header value is required"),
});

// Base fields shared between interval and cron schedules
const baseEndpointFields = {
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    url: z.string().min(1, "URL is required"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    headers: z.array(headerSchema).optional(),
    bodyJson: z.string().optional(), // JSON string (static body), validated on transform
    bodySchema: z.string().optional(), // JSON Schema string (for AI-generated bodies), validated on transform
    // Advanced configuration (optional)
    minIntervalMinutes: z.number().positive().optional(),
    maxIntervalMinutes: z.number().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
    maxExecutionTimeMs: z.number().int().positive().max(1800000).optional(),
    maxResponseSizeKb: z.number().int().positive().optional(),
};

// Minimal UI-only form schemas for presentation layer
// Actual validation is handled by API contracts in transform functions
const intervalEndpointSchema = z.object({
    scheduleType: z.literal("interval"),
    ...baseEndpointFields,
    baselineIntervalMinutes: z.number().min(1, "Must be at least 1 minute"),
});

const cronEndpointSchema = z.object({
    scheduleType: z.literal("cron"),
    ...baseEndpointFields,
    baselineCron: z.string().min(1, "Cron expression is required"),
});

export const createEndpointSchema = z.discriminatedUnion("scheduleType", [
    intervalEndpointSchema,
    cronEndpointSchema,
]).refine(
    data => !data.minIntervalMinutes || !data.maxIntervalMinutes || data.minIntervalMinutes <= data.maxIntervalMinutes,
    {
        message: "Min interval must be less than or equal to max interval",
        path: ["minIntervalMinutes"],
    },
);

export const updateEndpointSchema = z.discriminatedUnion("scheduleType", [
    intervalEndpointSchema,
    cronEndpointSchema,
]).refine(
    data => !data.minIntervalMinutes || !data.maxIntervalMinutes || data.minIntervalMinutes <= data.maxIntervalMinutes,
    {
        message: "Min interval must be less than or equal to max interval",
        path: ["minIntervalMinutes"],
    },
);

export type CreateEndpointForm = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointForm = z.infer<typeof updateEndpointSchema>;
export type HeaderForm = z.infer<typeof headerSchema>;

// Re-export API contract schemas for use in API calls
export { AddEndpointRequestSchema, UpdateEndpointRequestSchema };