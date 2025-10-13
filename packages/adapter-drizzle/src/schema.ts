import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Job endpoints table.
 *
 * Maps to JobEndpoint domain entity with adapter-specific fields:
 * - _locked_until: Pessimistic lock timestamp (adapter implementation detail)
 */
export const jobEndpoints = pgTable("job_endpoints", {
  // Identity
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),

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

  // Adapter-specific (not in domain entity)
  _lockedUntil: timestamp("_locked_until", { mode: "date" }),
});

/**
 * Runs table.
 * Tracks execution history for observability and debugging.
 */
export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id").notNull().references(() => jobEndpoints.id),
  status: text("status").notNull(), // "running" | "success" | "failed" | "canceled"
  attempt: integer("attempt").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
});

export type JobEndpointRow = typeof jobEndpoints.$inferSelect;
export type JobEndpointInsert = typeof jobEndpoints.$inferInsert;
export type RunRow = typeof runs.$inferSelect;
export type RunInsert = typeof runs.$inferInsert;

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
});

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
