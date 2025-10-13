import { JobsManager } from "@cronicorn/services/jobs";

import type { Env } from "./lib/config.js";

import { createAuth } from "./auth/config.js";
import jobs from "./jobs/jobs.index.js";
import { createTransactionProvider, type Database } from "./lib/db.js";
import { errorHandler } from "./lib/error-handler.js";
import configureOpenAPI from "./lib/openapi.js";
import { type AppOpenAPI, createRouter } from "./types.js";

export async function createApp(db: Database, config: Env) {
    // Initialize Better Auth (pass Drizzle instance, not raw pool)
    const auth = createAuth(config, db);

    // Create singletons (instantiate once, reuse for all requests)
    const txProvider = createTransactionProvider(db);
    const jobsManager = new JobsManager(txProvider);

    // Create main OpenAPI app
    // eslint-disable-next-line ts/consistent-type-assertions
    const app = createRouter().basePath("/api") as AppOpenAPI;

    // Global error handler
    app.onError(errorHandler);

    // Attach singletons to context (no per-request instantiation)
    app.use("*", async (c, next) => {
        c.set("jobsManager", jobsManager);
        c.set("auth", auth);
        await next();
    });

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
    const routes = [
        jobs,
    ] as const;

    routes.forEach((route) => {
        app.route("/", route);
    });

    // OpenAPI documentation
    configureOpenAPI(app, config.API_URL);

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

    return app;
}
