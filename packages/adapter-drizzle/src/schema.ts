import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Job status enum - provides type safety at both compile-time and runtime.
 */
export const jobStatusEnum = pgEnum("job_status", ["active", "paused", "archived"]);

/**
 * Auth table.
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  tier: text("tier").notNull().default("free"), // "free" | "pro" | "enterprise"

  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
  subscriptionEndsAt: timestamp("subscription_ends_at", { mode: "date" }),
});

/**
 * Jobs table (Phase 3).
 * Organizational container for related endpoints.
 */
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }), // Single-user ownership (MVP simplification)
  name: text("name").notNull(),
  description: text("description"),
  status: jobStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  archivedAt: timestamp("archived_at", { mode: "date" }),
});

/**
 * Job endpoints table.
 *
 * Maps to JobEndpoint domain entity with adapter-specific fields:
 * - _locked_until: Pessimistic lock timestamp (adapter implementation detail)
 */
export const jobEndpoints = pgTable("job_endpoints", {
  // Identity
  id: text("id").primaryKey(),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }), // Phase 3: FK to jobs table (nullable for backward compat)
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"), // Endpoint-specific context: behavior, thresholds, response schema, coordination logic

  // Baseline cadence (choose one)
  baselineCron: text("baseline_cron"),
  baselineIntervalMs: integer("baseline_interval_ms"),

  // AI hints (TTL-scoped)
  aiHintIntervalMs: integer("ai_hint_interval_ms"),
  aiHintNextRunAt: timestamp("ai_hint_next_run_at", { mode: "date" }),
  aiHintExpiresAt: timestamp("ai_hint_expires_at", { mode: "date" }),
  aiHintReason: text("ai_hint_reason"),

  // Guardrails
  minIntervalMs: integer("min_interval_ms"),
  maxIntervalMs: integer("max_interval_ms"),

  // Pause control
  pausedUntil: timestamp("paused_until", { mode: "date" }),

  // Runtime state
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  nextRunAt: timestamp("next_run_at", { mode: "date" }).notNull(),
  failureCount: integer("failure_count").notNull().default(0),

  // Execution config (dispatcher may use these)
  url: text("url"),
  method: text("method"), // "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  headersJson: jsonb("headers_json").$type<Record<string, string>>(),
  bodyJson: jsonb("body_json").$type<import("@cronicorn/domain").JsonValue>(),
  timeoutMs: integer("timeout_ms"),
  maxExecutionTimeMs: integer("max_execution_time_ms"), // Expected max execution time for lock duration
  maxResponseSizeKb: integer("max_response_size_kb"), // Max response body size to store (default: 100 KB)

  // Adapter-specific (not in domain entity)
  _lockedUntil: timestamp("_locked_until", { mode: "date" }),
}, table => ({
  jobIdIdx: index("job_endpoints_job_id_idx").on(table.jobId),
  nextRunAtIdx: index("job_endpoints_next_run_at_idx").on(table.nextRunAt),
}));

/**
 * Runs table.
 * Tracks execution history for observability and debugging.
 */
export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id").notNull().references(() => jobEndpoints.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "running" | "success" | "failed" | "canceled"
  attempt: integer("attempt").notNull(),
  source: text("source"), // Phase 3: What triggered this run (baseline, AI hint, manual, etc.)
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  responseBody: jsonb("response_body").$type<import("@cronicorn/domain").JsonValue>(), // Response data from endpoint (if JSON and within size limit)
  statusCode: integer("status_code"), // HTTP status code (200, 404, 500, etc.)
}, table => ({
  endpointIdIdx: index("runs_endpoint_id_idx").on(table.endpointId),
  startedAtIdx: index("runs_started_at_idx").on(table.startedAt),
  statusIdx: index("runs_status_idx").on(table.status),
  // Composite index for common dashboard queries
  endpointStartedIdx: index("runs_endpoint_started_idx").on(table.endpointId, table.startedAt),
}));

export type JobRow = typeof jobs.$inferSelect;
export type JobInsert = typeof jobs.$inferInsert;
export type JobEndpointRow = typeof jobEndpoints.$inferSelect;
export type JobEndpointInsert = typeof jobEndpoints.$inferInsert;
export type RunRow = typeof runs.$inferSelect;
export type RunInsert = typeof runs.$inferInsert;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const apiKey = pgTable("apikey", {
  id: text("id").primaryKey(),
  name: text("name"),
  start: text("start"), // Starting characters for display in UI
  prefix: text("prefix"), // API Key prefix (plain text)
  key: text("key").notNull(), // Hashed API key
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer("refill_interval"), // Interval to refill key in ms
  refillAmount: integer("refill_amount"), // Amount to refill remaining count
  lastRefillAt: timestamp("last_refill_at", { mode: "date" }),
  enabled: boolean("enabled").notNull().default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(false),
  rateLimitTimeWindow: integer("rate_limit_time_window"), // Time window in ms
  rateLimitMax: integer("rate_limit_max"), // Max requests in time window
  requestCount: integer("request_count").notNull().default(0),
  remaining: integer("remaining"), // Remaining requests (null = unlimited)
  lastRequest: timestamp("last_request", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  permissions: text("permissions"), // JSON string of permissions
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Any additional metadata
});

/**
 * AI Analysis Sessions table.
 * Tracks AI planner decisions for debugging, cost tracking, and observability.
 */
export const aiAnalysisSessions = pgTable("ai_analysis_sessions", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id").notNull().references(() => jobEndpoints.id, { onDelete: "cascade" }),
  analyzedAt: timestamp("analyzed_at", { mode: "date" }).notNull(),
  toolCalls: jsonb("tool_calls").$type<Array<{ tool: string; args: unknown; result: unknown }>>(), // Tools called during analysis
  reasoning: text("reasoning"), // AI's explanation/decision
  tokenUsage: integer("token_usage"), // Total tokens consumed
  durationMs: integer("duration_ms"), // Analysis duration
}, table => ({
  endpointIdIdx: index("ai_sessions_endpoint_id_idx").on(table.endpointId),
  analyzedAtIdx: index("ai_sessions_analyzed_at_idx").on(table.analyzedAt),
}));

/**
 * Device Authorization tables (Better Auth OAuth Device Flow).
 * Better Auth automatically creates and manages these tables.
 * We define them here for Drizzle type safety and migration tracking.
 */
export const deviceCodes = pgTable("device_codes", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull().unique(),
  userCode: text("user_code").notNull().unique(),
  clientId: text("client_id"),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "denied" | "expired"
  lastPolledAt: timestamp("last_polled_at", { mode: "date" }),
  pollingInterval: integer("polling_interval"), // Polling interval in milliseconds
  scope: text("scope"), // OAuth scope
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  deviceCodeId: text("device_code_id").references(() => deviceCodes.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
