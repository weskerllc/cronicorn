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
 * JSON Schema for body structure.
 * Describes the expected shape of the request body with field descriptions.
 * AI agents use this schema to generate compliant bodies based on observations.
 * 
 * Example:
 * {
 *   "type": "object",
 *   "properties": {
 *     "status": {
 *       "type": "string",
 *       "enum": ["healthy", "degraded", "critical"],
 *       "description": "Current system health status based on error rate and latency"
 *     },
 *     "priority": {
 *       "type": "string",
 *       "description": "Alert priority level - should be 'high' if errors > 50, otherwise 'normal'"
 *     }
 *   },
 *   "required": ["status"]
 * }
 */
export type BodySchema = JsonValue;

/**
 * AI-generated body values with TTL.
 * AI observes endpoint responses and generates a body that conforms to bodySchema.
 */
export type AIBodyHint = {
  resolvedBody: JsonValue; // AI-generated body conforming to bodySchema
  expiresAt: Date; // When this hint expires
  reason?: string; // AI's reasoning for the generated values
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
  bodySchema?: BodySchema; // JSON Schema describing dynamic body structure (AI uses this to generate bodies)
  timeoutMs?: number;
  maxExecutionTimeMs?: number; // Expected max execution time for lock duration (default: 60000ms / 1 min)
  maxResponseSizeKb?: number; // Max response body size to store (default: 100 KB)

  // AI hints for dynamic body values (TTL-scoped)
  aiHintBodyResolved?: JsonValue; // AI-generated body conforming to bodySchema
  aiHintBodyExpiresAt?: Date; // When the AI body hint expires
  aiHintBodyReason?: string; // AI's reasoning for the generated values
};
