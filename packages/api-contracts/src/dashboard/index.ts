/**
 * Dashboard API Contracts
 *
 * Shared Zod schemas and TypeScript types for Dashboard API endpoints.
 * Use these for:
 * - API route validation (server-side)
 * - Type-safe dashboard service implementations
 * - Client-side query response typing
 */

// Export base schemas for clients that don't need OpenAPI decorations
export * as base from "./schemas.base.js";
export * from "./schemas.js";

export * from "./types.js";
