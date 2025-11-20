/**
 * Template evaluator for dynamic body values.
 * Resolves template expressions like "{{$.self.latestResponse.status}}"
 */

import type { JsonValue } from "../entities/endpoint.js";
import type { EvaluationResult, TemplateContext } from "./types.js";

/**
 * Regular expression to match template expressions.
 * Format: {{$.path.to.value}}
 */
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Evaluate a single template expression against the context.
 *
 * @param expression - The expression to evaluate (e.g., "$.self.latestResponse.status")
 * @param context - The context data
 * @returns The resolved value or undefined if not found
 */
function evaluateExpression(expression: string, context: TemplateContext): JsonValue | undefined {
  const trimmed = expression.trim();

  // Handle special cases
  if (trimmed === "$.now") {
    return context.now;
  }

  // Parse JSONPath-like expression
  // Format: $.self.latestResponse.field or $.sibling['name'].latestResponse.field
  if (!trimmed.startsWith("$.")) {
    return undefined;
  }

  const path = trimmed.substring(2); // Remove "$."
  const parts = path.split(".");

  if (parts.length === 0) {
    return undefined;
  }

  // Start with context root
  // eslint-disable-next-line ts/no-explicit-any
  let current: any = context;

  // Navigate through path
  for (const part of parts) {
    // Handle array access like sibling['endpoint-name']
    const arrayMatch = part.match(/^(\w+)\['([^']+)'\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      if (typeof current !== "object" || current === null || Array.isArray(current)) {
        return undefined;
      }
      current = current[key];
      if (typeof current !== "object" || current === null || Array.isArray(current)) {
        return undefined;
      }
      current = current[index];
    }
    else {
      // Regular property access
      if (typeof current !== "object" || current === null || Array.isArray(current)) {
        return undefined;
      }
      current = current[part];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  // eslint-disable-next-line ts/consistent-type-assertions
  return current as JsonValue;
}

/**
 * Evaluate a template value recursively.
 * Handles strings with template expressions, objects, and arrays.
 *
 * @param value - The value to evaluate (may contain templates)
 * @param context - The context data
 * @returns The resolved value
 */
function evaluateValue(value: JsonValue, context: TemplateContext): JsonValue {
  // Handle string templates
  if (typeof value === "string") {
    // Check if the entire string is a template expression
    const fullMatch = value.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      const expression = fullMatch[1];
      const result = evaluateExpression(expression, context);
      // Return the resolved value (can be any JSON type)
      return result !== undefined ? result : value;
    }

    // Handle string interpolation (multiple templates in a string)
    const result = value.replace(TEMPLATE_PATTERN, (match, expression) => {
      const resolved = evaluateExpression(expression, context);
      return resolved !== undefined ? String(resolved) : match;
    });
    return result;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => evaluateValue(item, context));
  }

  // Handle objects
  if (typeof value === "object" && value !== null) {
    const result: Record<string, JsonValue> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = evaluateValue(val, context);
    }
    return result;
  }

  // Return primitives as-is
  return value;
}

/**
 * Evaluate a body template against the given context.
 * Resolves all template expressions in the template structure.
 *
 * @param template - The body template with template expressions
 * @param context - The context data for evaluation
 * @returns Evaluation result with resolved body or error
 */
export function evaluateBodyTemplate(
  template: JsonValue,
  context: TemplateContext,
): EvaluationResult {
  try {
    const resolved = evaluateValue(template, context);
    return {
      success: true,
      value: resolved,
    };
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a value contains any template expressions.
 *
 * @param value - The value to check
 * @returns True if the value contains template expressions
 */
export function hasTemplateExpressions(value: JsonValue): boolean {
  if (typeof value === "string") {
    return TEMPLATE_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(hasTemplateExpressions);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(hasTemplateExpressions);
  }

  return false;
}
