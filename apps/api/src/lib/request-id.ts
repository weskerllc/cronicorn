/**
 * Request ID middleware for request correlation
 *
 * Generates a unique UUID for each incoming request and:
 * 1. Sets it in the Hono context for use by other middleware/handlers
 * 2. Adds X-Request-Id header to the response for client correlation
 *
 * The request ID can be used to trace requests across logs and services.
 */

import type { Context, Next } from "hono";

import { randomUUID } from "node:crypto";

/**
 * Request ID middleware
 *
 * Generates a UUID v4 for each request using Node's crypto.randomUUID().
 * The ID is stored in context as `requestId` and returned in the
 * `X-Request-Id` response header.
 *
 * @example
 * ```ts
 * // In app.ts
 * app.use("*", requestIdMiddleware);
 *
 * // In route handlers
 * const requestId = c.get("requestId");
 * logger.info({ requestId }, "Processing request");
 * ```
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  // Generate a new UUID for this request
  const requestId = randomUUID();

  // Store in context for access by other middleware and handlers
  c.set("requestId", requestId);

  // Set response header for client-side correlation
  c.header("X-Request-Id", requestId);

  await next();
}
