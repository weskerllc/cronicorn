/**
 * @cronicorn/services - Framework-agnostic Business Logic
 *
 * Reusable service layer that can be consumed by:
 * - REST API (Hono)
 * - MCP Server (Model Context Protocol)
 * - CLI tools
 * - Background workers
 *
 * Services orchestrate domain logic + adapters without knowing
 * about HTTP, JSON-RPC, or other transport details.
 */

export * from "./dashboard/manager.js";
export * from "./dashboard/types.js";
export * from "./jobs/manager.js";
export * from "./notifications/manager.js";
export * from "./notifications/types.js";
export * from "./subscriptions/errors.js";
export * from "./subscriptions/manager.js";
export * from "./subscriptions/types.js";
