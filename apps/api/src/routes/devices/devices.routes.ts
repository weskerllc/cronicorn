import { createRoute, z } from "@hono/zod-openapi";
import * as HTTPStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Devices"];

// ==================== List Connected Devices Route ====================

const DeviceSchema = z.object({
    id: z.string(),
    token: z.string(),
    userAgent: z.string().nullable(),
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
    expiresAt: z.string(),
});

const ListDevicesResponseSchema = z.object({
    devices: z.array(DeviceSchema),
});

export const listConnectedDevices = createRoute({
    method: "get",
    path: "/devices",
    tags,
    summary: "List connected devices",
    description: "Get all connected sessions (devices) for the current user",
    responses: {
        [HTTPStatusCodes.OK]: jsonContent(ListDevicesResponseSchema, "List of connected devices"),
        [HTTPStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({ message: z.string() }),
            "Unauthorized",
        ),
    },
});

export type ListConnectedDevicesRoute = typeof listConnectedDevices;

// ==================== Revoke Device Route ====================

const RevokeDeviceParamSchema = z.object({
    tokenId: z.string().openapi({
        param: {
            name: "tokenId",
            in: "path",
        },
        example: "session_123abc",
    }),
});

const RevokeDeviceResponseSchema = z.object({
    success: z.boolean(),
});

export const revokeDevice = createRoute({
    method: "delete",
    path: "/devices/{tokenId}",
    request: {
        params: RevokeDeviceParamSchema,
    },
    tags,
    summary: "Revoke device access",
    description: "Revoke session access for a connected device (deletes the session)",
    responses: {
        [HTTPStatusCodes.OK]: jsonContent(RevokeDeviceResponseSchema, "Device revoked successfully"),
        [HTTPStatusCodes.NOT_FOUND]: jsonContent(
            z.object({
                success: z.boolean(),
                error: z.object({
                    issues: z.array(z.object({
                        code: z.string(),
                        path: z.array(z.union([z.string(), z.number()])),
                        message: z.string().optional(),
                    })),
                    name: z.string(),
                }),
            }),
            "Device not found",
        ),
        [HTTPStatusCodes.FORBIDDEN]: jsonContent(
            z.object({
                success: z.boolean(),
                error: z.object({
                    issues: z.array(z.object({
                        code: z.string(),
                        path: z.array(z.union([z.string(), z.number()])),
                        message: z.string().optional(),
                    })),
                    name: z.string(),
                }),
            }),
            "Forbidden - device belongs to another user",
        ),
        [HTTPStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({ message: z.string() }),
            "Unauthorized",
        ),
    },
});

export type RevokeDeviceRoute = typeof revokeDevice;
