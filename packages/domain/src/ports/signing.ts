/**
 * Signing port for outbound request HMAC signing.
 *
 * Provides signing keys per tenant so the dispatcher can
 * attach X-Cronicorn-Signature headers to outbound requests.
 */

export type SigningKeyProvider = {
  getKey: (tenantId: string) => Promise<string | null>;
};
