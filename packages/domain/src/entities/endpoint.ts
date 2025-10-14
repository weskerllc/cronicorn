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
 * Core job endpoint entity.
 * Pure domain type with no adapter-specific fields.
 */
export type JobEndpoint = {
  // Identity
  id: string;
  jobId?: string; // Phase 3: Optional FK to parent Job (for organizational grouping)
  tenantId: string;
  name: string;

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

  // Runtime state
  lastRunAt?: Date;
  nextRunAt: Date;
  failureCount: number;

  // Execution config (dispatcher may use these)
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: Record<string, string>;
  bodyJson?: JsonValue;
  timeoutMs?: number;
};
