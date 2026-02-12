/**
 * Signing Dispatcher — Decorator that adds HMAC-SHA256 signatures to outbound requests.
 *
 * Wraps any Dispatcher implementation and injects:
 * - X-Cronicorn-Signature: sha256=<hex-encoded HMAC>
 * - X-Cronicorn-Timestamp: <unix-seconds>
 *
 * Fail-open: if key lookup fails, the request proceeds unsigned (availability over security).
 */

import type { Clock, Dispatcher, ExecutionResult, JobEndpoint, Logger, SigningKeyProvider } from "@cronicorn/domain";

import { computeSignature } from "@cronicorn/domain/signing";

export class SigningDispatcher implements Dispatcher {
  constructor(
    private readonly inner: Dispatcher,
    private readonly keyProvider: SigningKeyProvider,
    private readonly logger: Logger,
    private readonly clock: Clock,
  ) {}

  async execute(ep: JobEndpoint): Promise<ExecutionResult> {
    try {
      const key = await this.keyProvider.getKey(ep.tenantId);
      if (key) {
        const timestamp = Math.floor(this.clock.now().getTime() / 1000);
        const body = ep.bodyJson ? JSON.stringify(ep.bodyJson) : "";
        const signature = computeSignature(key, timestamp, body);
        const signedEp: JobEndpoint = {
          ...ep,
          headersJson: {
            ...(ep.headersJson ?? {}),
            "X-Cronicorn-Signature": `sha256=${signature}`,
            "X-Cronicorn-Timestamp": String(timestamp),
          },
        };
        return this.inner.execute(signedEp);
      }
    }
    catch (err) {
      // Fail-open: log warning, proceed unsigned
      this.logger.warn(
        {
          tenantId: ep.tenantId,
          error: err instanceof Error ? err.message : String(err),
        },
        "Signing key lookup failed, proceeding unsigned",
      );
    }
    return this.inner.execute(ep);
  }
}
