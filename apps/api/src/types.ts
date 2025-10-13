import type { JobsManager } from "@cronicorn/services/jobs";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";

import { OpenAPIHono } from "@hono/zod-openapi";
import { defaultHook } from "stoker/openapi";

import type { Auth } from "./auth/config.js";
import type { AuthContext } from "./auth/types.js";
import type { createTransactionProvider } from "./lib/db";

export type AppBindings = {
    Variables: {
        jobsManager: JobsManager;
        auth: Auth;
        // Set by requireAuth middleware
        session?: AuthContext["session"];
        userId?: string;
    };
    Bindings: {
        AUTH_SECRET: string;
        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;
        DATABASE_URL: string;
    };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppBindings, {}, string>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

export function createRouter() {
    return new OpenAPIHono<AppBindings>({
        strict: false,
        defaultHook,
    });
}
