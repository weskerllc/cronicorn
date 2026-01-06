/**
 * Error Utilities - Safe error handling for API responses
 *
 * SECURITY: Never return raw error.message to clients - it may contain:
 * - Database schema details
 * - User IDs and internal identifiers
 * - File paths and implementation details
 * - Stack traces and debugging information
 *
 * Instead:
 * 1. Log detailed error server-side with logger
 * 2. Return generic, safe message to client
 * 3. Use appropriate HTTP status codes
 */

import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { logger } from "./logger.js";

/**
 * Safe error patterns - messages known to be safe for clients
 */
const SAFE_ERROR_PATTERNS = [
  /not found/i,
  /validation/i,
  /invalid/i,
  /required/i,
  /unauthorized/i,
  /forbidden/i,
  /no.*subscription/i, // "no active subscription", "no subscription found"
  /limit.*reached/i, // "Endpoint limit reached", etc.
  /too short/i, // "Interval too short", etc.
  /too long/i, // "Interval too long", etc.
  /below minimum/i, // "Below minimum interval"
  /exceeds maximum/i, // "Exceeds maximum interval"
  /must be in the future/i, // Time validation errors
] as const;

/**
 * Checks if an error message is safe to return to clients
 */
function isSafeErrorMessage(message: string): boolean {
  return SAFE_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Returns a safe, generic error response based on the error type
 *
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @param context.operation - The operation being performed
 * @param context.userId - Optional user ID for logging
 * @param defaultMessage - Default safe message to return
 * @returns Safe error message for the client
 */
export function getSafeErrorMessage(
  error: unknown,
  context: { operation: string; userId?: string },
  defaultMessage = "Operation failed",
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log detailed error server-side
  logger.error({ error, errorMessage, ...context }, `Error in ${context.operation}`);

  // Only return error message if it matches safe patterns
  if (isSafeErrorMessage(errorMessage)) {
    return errorMessage;
  }

  // Otherwise return generic message
  return defaultMessage;
}

/**
 * Handle error and throw appropriate HTTPException with safe error message
 *
 * @param c - Hono context
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @param context.operation - The operation being performed
 * @param context.userId - Optional user ID for logging
 * @param options - Response options
 * @param options.defaultMessage - Default error message if no safe pattern matches
 * @param options.defaultStatus - Default HTTP status code if no pattern matches
 * @throws HTTPException with safe error message
 */
export function handleErrorResponse(
  c: Context,
  error: unknown,
  context: { operation: string; userId?: string },
  options?: {
    defaultMessage?: string;
    defaultStatus?: number;
  },
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log detailed error server-side
  logger.error({
    error,
    errorMessage,
    path: c.req.path,
    method: c.req.method,
    ...context,
  }, `Error in ${context.operation}`);

  // Determine status code and safe message from error message patterns
  const defaultMessage = options?.defaultMessage ?? "Operation failed";

  if (errorMessage.toLowerCase().includes("not found")) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, { message: "Resource not found" });
  }

  if (errorMessage.toLowerCase().includes("unauthorized")) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, { message: "Unauthorized" });
  }

  if (errorMessage.toLowerCase().includes("validation") || errorMessage.toLowerCase().includes("invalid")) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { message: "Invalid input" });
  }

  if (errorMessage.toLowerCase().match(/no.*subscription/)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { message: errorMessage });
  }

  // Default case - return appropriate status based on options or 500
  if (options?.defaultStatus === HttpStatusCodes.BAD_REQUEST) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { message: defaultMessage });
  }

  throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, { message: defaultMessage });
}
