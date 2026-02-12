import type { SigningKeysRepo } from "@cronicorn/domain";

import { DrizzleSigningKeyRepo } from "@cronicorn/adapter-drizzle";

import type { Database } from "./db.js";

/**
 * Composition root: Wires DrizzleSigningKeyRepo into the SigningKeysRepo port.
 *
 * @param db - Drizzle database or transaction context
 * @returns SigningKeysRepo port implementation
 */
export function createSigningKeysRepo(db: Database): SigningKeysRepo {
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  return new DrizzleSigningKeyRepo(db);
}
