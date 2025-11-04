import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import { createApp } from "./app.js";
import { seedAdminUser } from "./auth/seed-admin.js";
import { loadConfig } from "./lib/config.js";
import { createDatabase } from "./lib/db.js";
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

  const { app: apiApp, auth } = await createApp(db, config);

  // Seed admin user if configured (for CI/testing environments)
  await seedAdminUser(config, db, auth);

  // Create root app to handle both static files and API routes
  const app = new Hono();

  // Serve static files at root level (before API routes)
  app.use("/img/*", serveStatic({ root: "./public" }));

  // Mount API app at /api
  app.route("/", apiApp);

  serve({
    fetch: app.fetch,
    port: config.PORT,
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Shutting down gracefully",
      signal,
    }));

    // Close database pool
    await db.$client.end();

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Shutdown complete",
    }));

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // console.log(JSON.stringify({
  //   timestamp: new Date().toISOString(),
  //   level: "info",
  //   message: "API server started",
  //   port: config.PORT,
  //   urls: {
  //     health: `http://localhost:${config.PORT}/health`,
  //     docs: `http://localhost:${config.PORT}/api/docs`,
  //     openapi: `http://localhost:${config.PORT}/api/openapi.json`,
  //     auth: `http://localhost:${config.PORT}/api/auth`,
  //     jobs: `http://localhost:${config.PORT}/api/v1/jobs`,
  //   },
  // }));
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
