/**
 * Drizzle adapter for signing key CRUD operations.
 *
 * Manages per-user HMAC signing keys for outbound request verification.
 * Keys are stored as raw hex strings (64 chars = 32 bytes).
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { eq } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";

import { signingKeys } from "./schema.js";

export class DrizzleSigningKeyRepo {
  // eslint-disable-next-line ts/no-explicit-any
  constructor(private readonly db: NodePgDatabase<any>) {}

  /**
   * Generate a new signing key for a user.
   * Returns the raw key (shown only once) and the display prefix.
   *
   * @throws if a key already exists for the user (unique constraint)
   */
  async create(userId: string): Promise<{ rawKey: string; keyPrefix: string }> {
    const rawKey = randomBytes(32).toString("hex");
    const keyPrefix = `sk_${rawKey.slice(0, 8)}`;
    const id = randomUUID();

    await this.db.insert(signingKeys).values({
      id,
      userId,
      key: rawKey,
      keyPrefix,
    });

    return { rawKey, keyPrefix };
  }

  /**
   * Rotate the signing key for a user.
   * Deletes the old key and creates a new one (immediate invalidation).
   *
   * @throws if no key exists for the user
   */
  async rotate(userId: string): Promise<{ rawKey: string; keyPrefix: string }> {
    const existing = await this.db
      .select({ id: signingKeys.id })
      .from(signingKeys)
      .where(eq(signingKeys.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("No signing key exists for this user");
    }

    // Delete old key
    await this.db.delete(signingKeys).where(eq(signingKeys.userId, userId));

    // Create new key
    const rawKey = randomBytes(32).toString("hex");
    const keyPrefix = `sk_${rawKey.slice(0, 8)}`;
    const id = randomUUID();

    await this.db.insert(signingKeys).values({
      id,
      userId,
      key: rawKey,
      keyPrefix,
      rotatedAt: new Date(),
    });

    return { rawKey, keyPrefix };
  }

  /**
   * Get signing key metadata for display (never returns the raw key).
   */
  async getInfo(userId: string): Promise<{
    hasKey: boolean;
    keyPrefix: string | null;
    createdAt: Date | null;
    rotatedAt: Date | null;
  }> {
    const row = await this.db
      .select({
        keyPrefix: signingKeys.keyPrefix,
        createdAt: signingKeys.createdAt,
        rotatedAt: signingKeys.rotatedAt,
      })
      .from(signingKeys)
      .where(eq(signingKeys.userId, userId))
      .limit(1);

    if (row.length === 0) {
      return { hasKey: false, keyPrefix: null, createdAt: null, rotatedAt: null };
    }

    return {
      hasKey: true,
      keyPrefix: row[0]!.keyPrefix,
      createdAt: row[0]!.createdAt,
      rotatedAt: row[0]!.rotatedAt,
    };
  }

  /**
   * Delete the signing key for a user.
   */
  async delete(userId: string): Promise<void> {
    await this.db.delete(signingKeys).where(eq(signingKeys.userId, userId));
  }
}
