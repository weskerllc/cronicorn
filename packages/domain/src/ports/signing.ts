/**
 * Signing port for outbound request HMAC signing.
 *
 * Provides signing keys per tenant so the dispatcher can
 * attach X-Cronicorn-Signature headers to outbound requests.
 */

export type SigningKeyProvider = {
  getKey: (tenantId: string) => Promise<string | null>;
};

/**
 * Signing key CRUD port for the management UI.
 *
 * Manages per-user HMAC signing keys: create, rotate, inspect, delete.
 * The raw key is returned only on create/rotate (shown once, never stored in plaintext by the UI).
 */
export type SigningKeysRepo = {
  getInfo: (userId: string) => Promise<{
    hasKey: boolean;
    keyPrefix: string | null;
    createdAt: Date | null;
    rotatedAt: Date | null;
  }>;
  create: (userId: string) => Promise<{ rawKey: string; keyPrefix: string }>;
  rotate: (userId: string) => Promise<{ rawKey: string; keyPrefix: string }>;
  delete: (userId: string) => Promise<void>;
};
