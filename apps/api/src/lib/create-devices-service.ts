import { sql } from "drizzle-orm";

import type { Database } from "./db.js";

export type ConnectedDevice = {
    id: string;
    token: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date | string;
    expiresAt: Date | string;
};

/**
 * DevicesService handles session management for the connected devices feature.
 *
 * **Architecture**:
 * - Uses raw SQL queries to avoid TypeScript schema type resolution issues across pnpm workspace packages
 * - Transaction management happens in composition root (middleware)
 * - No domain ports needed - this is adapter-level concern
 *
 * **Responsibilities**:
 * - List sessions (connected devices) for a user
 * - Revoke sessions (disconnect devices)
 * - Authorization (userId-scoped queries)
 *
 * **Note**: Raw SQL is used here because drizzle schema types from @cronicorn/adapter-drizzle
 * are incompatible with apps/api's Database type due to pnpm workspace module resolution.
 */
export class DevicesService {
    constructor(private readonly db: Database) { }

    /**
     * List all connected devices (sessions) for a user.
     *
     * @param userId - The user ID
     * @returns Array of connected sessions
     */
    async listConnectedDevices(userId: string): Promise<ConnectedDevice[]> {
        const results = await this.db.execute<{
            id: string;
            token: string;
            user_agent: string | null;
            ip_address: string | null;
            created_at: Date;
            expires_at: Date;
        }>(sql`
      SELECT 
        id,
        token,
        user_agent,
        ip_address,
        created_at,
        expires_at
      FROM session
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `);

        return results.rows.map(row => ({
            id: row.id,
            token: row.token,
            userAgent: row.user_agent,
            ipAddress: row.ip_address,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        }));
    }

    /**
     * Get a single session and verify ownership.
     *
     * @param sessionId - The session ID
     * @returns Session with userId, or null if not found
     */
    async getToken(sessionId: string): Promise<{ userId: string } | null> {
        const result = await this.db.execute<{ user_id: string }>(sql`
      SELECT user_id
      FROM session
      WHERE id = ${sessionId}
      LIMIT 1
    `);

        const row = result.rows[0];
        return row ? { userId: row.user_id } : null;
    }

    /**
     * Revoke a session (disconnect device).
     *
     * @param sessionId - The session ID to revoke
     */
    async revokeToken(sessionId: string): Promise<void> {
        await this.db.execute(sql`
      DELETE FROM session
      WHERE id = ${sessionId}
    `);
    }
}

/**
 * Factory function to create DevicesService within a transaction.
 * Used by middleware to provide transactional service access.
 */
export function createDevicesService(db: Database) {
    return new DevicesService(db);
}
