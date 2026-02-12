/**
 * Drizzle adapter for SigningKeyProvider port.
 *
 * Looks up the raw HMAC signing key for a given tenant (user).
 * Used by SigningDispatcher to sign outbound requests.
 */

import type { SigningKeyProvider } from "@cronicorn/domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { eq } from "drizzle-orm";

import { signingKeys } from "./schema.js";

export class DrizzleSigningKeyProvider implements SigningKeyProvider {
  // eslint-disable-next-line ts/no-explicit-any
  constructor(private readonly db: NodePgDatabase<any>) {}

  async getKey(tenantId: string): Promise<string | null> {
    const row = await this.db
      .select({ key: signingKeys.key })
      .from(signingKeys)
      .where(eq(signingKeys.userId, tenantId))
      .limit(1);

    return row[0]?.key ?? null;
  }
}
