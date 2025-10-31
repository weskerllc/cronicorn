import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./devices.routes.js";

import { getAuthContext } from "../../auth/middleware.js";
import { createDevicesService } from "../../lib/create-devices-service.js";

export const listConnectedDevices: AppRouteHandler<typeof routes.listConnectedDevices> = async (c) => {
    const { userId } = getAuthContext(c);
    const db = c.var.db;

    // Use transaction to query Better Auth tables
    return db.transaction(async (tx) => {
        const service = createDevicesService(tx);
        const devices = await service.listConnectedDevices(userId);

        return c.json(
            {
                devices: devices.map(device => ({
                    id: device.id,
                    token: device.token,
                    userAgent: device.userAgent,
                    ipAddress: device.ipAddress,
                    createdAt: new Date(device.createdAt).toISOString(),
                    expiresAt: new Date(device.expiresAt).toISOString(),
                })),
            },
            HTTPStatusCodes.OK,
        );
    });
};

export const revokeDevice: AppRouteHandler<typeof routes.revokeDevice> = async (c) => {
    const { userId } = getAuthContext(c);
    const db = c.var.db;
    const { tokenId } = c.req.valid("param");

    // Use transaction to ensure atomic check + delete
    return db.transaction(async (tx) => {
        const service = createDevicesService(tx);

        // First, verify the token belongs to the current user
        const token = await service.getToken(tokenId);

        if (!token) {
            return c.json(
                {
                    success: false,
                    error: {
                        issues: [{ code: "not_found", path: ["tokenId"], message: "Device not found" }],
                        name: "NotFoundError",
                    },
                },
                HTTPStatusCodes.NOT_FOUND,
            );
        }

        if (token.userId !== userId) {
            return c.json(
                {
                    success: false,
                    error: {
                        issues: [{ code: "forbidden", path: ["tokenId"], message: "Device belongs to another user" }],
                        name: "ForbiddenError",
                    },
                },
                HTTPStatusCodes.FORBIDDEN,
            );
        }

        // Delete the OAuth token (this revokes access)
        await service.revokeToken(tokenId);

        return c.json({ success: true }, HTTPStatusCodes.OK);
    });
};
