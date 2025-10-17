/**
 * RPC Client Type Export
 *
 * This file exports ONLY the type of the API router for use in client applications.
 * No runtime dependencies are exported, maintaining hexagonal architecture boundaries.
 *
 * ```
 */

import { hc } from "hono/client";

import jobs from "./routes/jobs/jobs.index.js";
import subscriptions from "./routes/subscriptions/subscriptions.index.js";
import { type AppOpenAPI, createRouter } from "./types.js";

function registerClientRoutes(app: AppOpenAPI) {
    return app
        .route("/", jobs)
        .route("/", subscriptions);
}

// stand alone router type used for api client
const router = registerClientRoutes(
    createRouter().basePath("/api"),
);
// eslint-disable-next-line ts/no-redeclare
type router = typeof router;

// create instance to inline type in build
// https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended

// eslint-disable-next-line unused-imports/no-unused-vars
const client = hc<router>("");
type Client = typeof client;

export default (...args: Parameters<typeof hc>): Client =>
    hc<router>(...args);

export type ErrorSchema = {
    error: {
        issues: {
            code: string;
            path: (string | number)[];
            message?: string | undefined;
        }[];
        name: string;
    };
    success: boolean;
};
