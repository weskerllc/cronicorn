/**
 * Schema Utility Helpers
 *
 * Utilities to work with Zod schemas and reduce duplication between
 * MCP schema shapes and runtime validators.
 */

import type { ZodRawShape } from "zod";

import { z } from "zod";

/**
 * Extract the shape from a Zod object schema for use in MCP registration
 *
 * This allows you to define schemas once and use them for both
 * MCP registration and runtime validation.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string().min(1),
 *   age: z.number().optional(),
 * });
 *
 * registerApiTool(server, apiClient, {
 *   inputSchema: toShape(schema),
 *   inputValidator: schema,
 *   // ...
 * });
 * ```
 */
export function toShape<T extends z.ZodObject<ZodRawShape>>(schema: T): T["shape"] {
  return schema.shape;
}

/**
 * Create both a Zod object schema and its shape in one call
 *
 * @example
 * ```typescript
 * const [schema, shape] = createSchemaAndShape({
 *   name: z.string(),
 *   age: z.number().optional(),
 * });
 *
 * registerApiTool(server, apiClient, {
 *   inputSchema: shape,
 *   inputValidator: schema,
 *   // ...
 * });
 * ```
 */
export function createSchemaAndShape<T extends ZodRawShape>(
  shape: T,
): [z.ZodObject<T>, T] {
  const schema = z.object(shape);
  return [schema, shape];
}
