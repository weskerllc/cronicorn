/**
 * Test helpers for API smoke tests.
 *
 * Provides utilities to create lightweight test apps for basic endpoint testing.
 * For these smoke tests, we test routes that don't require full auth/db setup.
 */
import type { Context } from "hono";

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

import { errorHandler } from "../lib/error-handler.js";
import { openapiConfig } from "../lib/openapi.js";

/**
 * Create minimal test app for smoke testing.
 *
 * Only includes routes that don't require auth or database:
 * - Health check
 * - OpenAPI documentation
 *
 * For protected routes (like /api/v1/jobs), we test auth rejection behavior
 * by checking that the auth middleware properly rejects unauthenticated requests.
 */
export async function createTestApp() {
    const app = new OpenAPIHono();

    app.onError(errorHandler);

    // Health check endpoint (no auth required)
    app.get("/health", (c: Context) => {
        return c.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // OpenAPI documentation
    app.doc("/api/openapi.json", openapiConfig);
    app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

    return app;
}
