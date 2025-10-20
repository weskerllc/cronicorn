/**
 * Type-safe API RPC Client
 *
 * Uses Hono RPC to provide end-to-end type safety between API and web app.
 * Only imports the TYPE of the API, maintaining architectural boundaries.
 */

import type { ErrorSchema } from "@cronicorn/api/client";

import apiClient from "@cronicorn/api/client";

export type { ErrorSchema };
export default apiClient("/");
