/**
 * Pure HMAC-SHA256 signature computation.
 *
 * Uses node:crypto (no I/O, deterministic) — safe for domain layer.
 * Computes: HMAC-SHA256(key, "{timestamp}.{body}")
 */

import { createHmac } from "node:crypto";

export function computeSignature(key: string, timestamp: number, body: string): string {
  const payload = `${timestamp}.${body}`;
  return createHmac("sha256", key).update(payload).digest("hex");
}
