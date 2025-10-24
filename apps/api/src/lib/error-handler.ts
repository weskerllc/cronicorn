import type { Context } from "hono";

import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

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

  // Domain-specific errors (extend as needed)
  // For now, keeping it simple - domain errors should be wrapped in HTTPException
  // or caught and translated in route handlers

  // Fallback: log and return generic 500
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err.message,
    },
    500,
  );
}
