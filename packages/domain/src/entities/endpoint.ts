/**
 * Represents any valid JSON value.
 * Used for HTTP request bodies that will be serialized to JSON.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Template expression for dynamic body values.
 * Uses JSONPath-like syntax to reference data from response bodies.
 *
 * Examples:
 * - "{{$.self.latestResponse.status}}" - Latest response from this endpoint
 * - "{{$.sibling['monitoring'].latestResponse.priority}}" - Sibling endpoint response
 * - "{{$.now}}" - Current timestamp
 */
export type TemplateExpression = string;

/**
 * Body template with placeholders for dynamic values.
 * Placeholders are resolved at execution time using response data.
 */
export type BodyTemplate = JsonValue;

/**
 * AI hint for dynamic body values.
 * Contains resolved values for template placeholders with TTL.
 */
export type AIBodyHint = {
  resolvedBody: JsonValue; // Fully resolved body ready for execution
  expiresAt: Date; // When this hint expires
  reason?: string; // Why these values were chosen
};

/**
 * Core job endpoint entity.
 * Pure domain type with no adapter-specific fields.
 */
export type JobEndpoint = {
  // Identity
  id: string;
  jobId?: string; // Phase 3: Optional FK to parent Job (for organizational grouping)
  tenantId: string;
  name: string;
  description?: string; // Endpoint-specific context: behavior, thresholds, response schema, coordination logic

  // Baseline cadence (choose one)
  baselineCron?: string;
  baselineIntervalMs?: number;

  // AI hints (TTL-scoped)
  aiHintIntervalMs?: number;
  aiHintNextRunAt?: Date;
  aiHintExpiresAt?: Date;
  aiHintReason?: string;

  // Guardrails
  minIntervalMs?: number;
  maxIntervalMs?: number;

  // Pause control
  pausedUntil?: Date;

  // Archive control (soft delete)
  archivedAt?: Date;

  // Runtime state
  lastRunAt?: Date;
  nextRunAt: Date;
  failureCount: number;

  // Execution config (dispatcher may use these)
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: Record<string, string>;
  bodyJson?: JsonValue; // Static body (backward compatible)
  bodyTemplate?: BodyTemplate; // Dynamic body with template expressions (new)
  bodyTemplateSchema?: JsonValue; // JSON Schema for validating resolved body values
  timeoutMs?: number;
  maxExecutionTimeMs?: number; // Expected max execution time for lock duration (default: 60000ms / 1 min)
  maxResponseSizeKb?: number; // Max response body size to store (default: 100 KB)

  // AI hints for dynamic body values (TTL-scoped)
  aiHintBodyResolved?: JsonValue; // Resolved body from AI (overrides template evaluation)
  aiHintBodyExpiresAt?: Date; // When the AI body hint expires
  aiHintBodyReason?: string; // Why AI chose these values
};
