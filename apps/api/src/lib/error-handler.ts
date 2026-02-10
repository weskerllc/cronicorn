import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { logger } from "./logger.js";

/**
 * Maps domain errors to HTTP status codes and responses.
 * Follows the principle: domain throws, adapters/routes catch and translate.
 */
export function errorHandler(err: Error, c: Context) {
  // Hono's native HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation failed",
        issues: err.issues,
      },
      400,
    );
  }

  // Domain-specific errors - detect common patterns from error messages

  // Conflict/already exists errors → 409
  const message = err.message?.toLowerCase() ?? "";
  if (
    message.includes("already exists")
    || message.includes("duplicate")
    || message.includes("conflict")
    || message.includes("unique constraint")
  ) {
    logger.warn({ err, path: c.req.path, method: c.req.method }, "Conflict error");
    return c.json(
      {
        error: "Resource already exists",
        status: 409,
      },
      409,
    );
  }

  // Not found errors → 404
  if (message.includes("not found")) {
    logger.warn({ err, path: c.req.path, method: c.req.method }, "Not found error");
    return c.json(
      {
        error: "Resource not found",
        status: 404,
      },
      404,
    );
  }

  // Fallback: log and return generic 500
  // SECURITY: Only log detailed error server-side, return generic message to client
  logger.error({ err, path: c.req.path, method: c.req.method }, "Unhandled error");
  return c.json(
    {
      error: "Internal server error",
    },
    500,
  );
}
