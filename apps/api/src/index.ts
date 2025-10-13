import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

import { createAuth } from "./auth/config.js";
import { createJobsRouter } from "./jobs/routes.js";
import { loadConfig } from "./lib/config.js";
import { createDatabase } from "./lib/db.js";
import { errorHandler } from "./lib/error-handler.js";
import { openapiConfig } from "./lib/openapi.js";

/**
 * API Composition Root
 *
 * Wires all components together for the HTTP API server.
 * This is the main entry point for the API application.
 */

async function main() {
  // Load and validate configuration
  const config = loadConfig();

  // Setup database connection
  const db = createDatabase(config);

  // Initialize Better Auth
  const auth = createAuth(config, db.$client);

  // Create main OpenAPI app
  const app = new OpenAPIHono();

  // Global error handler
  app.onError(errorHandler);

  // Health check endpoint (no auth required)
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mount Better Auth routes
  // Better Auth provides: /api/auth/sign-in/social/github, /api/auth/callback/github, etc.
  app.on(["GET", "POST"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
  });

  // Mount job routes (protected by auth middleware)
  const jobsRouter = createJobsRouter(db, auth);
  app.route("/api/v1", jobsRouter);

  // OpenAPI documentation
  app.doc("/api/openapi.json", openapiConfig);

  // Swagger UI
  app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

  // Start server
  const port = config.PORT;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "API server starting",
    port,
    env: config.NODE_ENV,
  }));

  serve({
    fetch: app.fetch,
    port,
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "API server started",
    port,
    urls: {
      health: `http://localhost:${port}/health`,
      docs: `http://localhost:${port}/api/docs`,
      openapi: `http://localhost:${port}/api/openapi.json`,
      auth: `http://localhost:${port}/api/auth`,
      jobs: `http://localhost:${port}/api/v1/jobs`,
    },
  }));
}

// Top-level error handler for startup failures
main().catch((err) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "fatal",
    message: "API server failed to start",
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));
  process.exit(1);
});
