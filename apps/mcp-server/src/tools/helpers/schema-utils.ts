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
 * Handles both ZodObject and ZodIntersection types (from .and()).
 * For intersection types, it merges the shapes from both sides.
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
export function toShape<T extends z.ZodTypeAny>(
  schema: T,
): ZodRawShape {
  // Handle ZodIntersection (from .and())
  if (schema instanceof z.ZodIntersection) {
    const left = toShape(schema._def.left);
    const right = toShape(schema._def.right);
    return { ...left, ...right };
  }

  // Handle ZodEffects (from .refine(), .transform(), etc.)
  if (schema instanceof z.ZodEffects) {
    return toShape(schema._def.schema);
  }

  // Handle ZodObject (base case)
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  }

  // Fallback for other types - return empty shape
  return {};
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
