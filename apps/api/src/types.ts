import type { Clock, Cron, PaymentProvider } from "@cronicorn/domain";
import type { DashboardManager, SubscriptionsManager } from "@cronicorn/services";
import type { JobsManager } from "@cronicorn/services/jobs";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";

import { OpenAPIHono } from "@hono/zod-openapi";
import { defaultHook } from "stoker/openapi";

import type { Auth } from "./auth/config.js";
import type { AuthContext } from "./auth/types.js";
import type { Env } from "./lib/config.js";
import type { Database } from "./lib/db.js";

export type AppBindings = {
  Variables: {
    db: Database;
    clock: Clock;
    cron: Cron;
    auth: Auth;
    config: Env;
    withJobsManager: <T extends Response>(fn: (manager: JobsManager) => Promise<T>) => Promise<T>;
    withDashboardManager: <T extends Response>(fn: (manager: DashboardManager) => Promise<T>) => Promise<T>;
    // Stripe services
    subscriptionsManager: SubscriptionsManager;
    paymentProvider: PaymentProvider;
    webhookSecret: string;
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
