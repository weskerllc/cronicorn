/**
 * Jobs API Contracts
 *
 * Shared Zod schemas and TypeScript types for Jobs API endpoints.
 * Use these for:
 * - API route validation (server-side)
 * - Form validation (client-side with react-hook-form + zodResolver)
 * - Type-safe function parameters
 */

export * from "./schemas.js";
export * from "./types.js";

// Export base schemas for clients that don't need OpenAPI decorations
export * as base from "./schemas.base.js";
