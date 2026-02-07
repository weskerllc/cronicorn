/**
 * Request logging middleware using Pino
 *
 * Logs structured information for every HTTP request including:
 * - method: HTTP method (GET, POST, etc.)
 * - path: Request path
 * - status: Response status code
 * - duration: Request duration in milliseconds
 * - requestId: Correlation ID from request-id middleware
 * - userId: Authenticated user ID (if available)
 *
 * This middleware should be registered after request-id middleware
 * so that requestId is available in context.
 */

import type { Context, Next } from "hono";

import { logger } from "./logger.js";

/**
 * Request logger middleware
 *
 * Captures request timing and logs a structured entry on response completion.
 * Works with the request-id middleware to include correlation IDs.
 *
 * @example
 * ```ts
 * // In app.ts - register after request-id middleware
 * app.use("*", requestIdMiddleware);
 * app.use("*", requestLoggerMiddleware);
 * ```
 *
 * @example Output (production JSON):
 * ```json
 * {
 *   "level": "info",
 *   "time": 1699999999999,
 *   "method": "GET",
 *   "path": "/api/health",
 *   "status": 200,
 *   "duration": 12,
 *   "requestId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 * ```
 */
export async function requestLoggerMiddleware(c: Context, next: Next) {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;

  // Build log object with required fields
  const logData: Record<string, unknown> = {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  };

  // Add requestId if available (set by request-id middleware)
  const requestId = c.get("requestId");
  if (requestId) {
    logData.requestId = requestId;
  }

  // Add userId if authenticated (set by auth middleware)
  const userId = c.get("userId");
  if (userId) {
    logData.userId = userId;
  }

  // Log at appropriate level based on status code
  if (c.res.status >= 500) {
    logger.error(logData, "Request completed with server error");
  }
  else if (c.res.status >= 400) {
    logger.warn(logData, "Request completed with client error");
  }
  else {
    logger.info(logData, "Request completed");
  }
}
