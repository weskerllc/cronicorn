import { boolean, index, integer, jsonb, pgEnum, pgTable, pgView, QueryBuilder, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

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

  // Archive control (soft delete)
  archivedAt: timestamp("archived_at", { mode: "date" }),

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
  nextAnalysisAt: timestamp("next_analysis_at", { mode: "date" }), // AI-scheduled next analysis time
  endpointFailureCount: integer("endpoint_failure_count"), // Snapshot of failure count at analysis time
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

/**
 *
 * Admin Views
 */
const qb = new QueryBuilder();

export const adminUserStats = pgView("admin_user_stats").as(
  qb
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      subscription_status: user.subscriptionStatus,
      created_at: user.createdAt,
      is_anonymous: user.isAnonymous,
      subscription_ends_at: user.subscriptionEndsAt,
      total_jobs: sql<number>`count(distinct ${jobs.id})`.as("total_jobs"),
      total_endpoints: sql<number>`count(distinct ${jobEndpoints.id})`.as("total_endpoints"),
      active_endpoints: sql<number>`count(distinct case when ${jobEndpoints.archivedAt} is null then ${jobEndpoints.id} end)`.as("active_endpoints"),
      paused_endpoints: sql<number>`count(distinct case when ${jobEndpoints.pausedUntil} is not null and ${jobEndpoints.pausedUntil} > now() then ${jobEndpoints.id} end)`.as("paused_endpoints"),
    })
    .from(user)
    .leftJoin(jobs, sql`${jobs.userId} = ${user.id} and ${jobs.archivedAt} is null`)
    .leftJoin(jobEndpoints, sql`${jobEndpoints.jobId} = ${jobs.id}`)
    .groupBy(user.id, user.email, user.name, user.tier, user.subscriptionStatus, user.createdAt, user.isAnonymous, user.subscriptionEndsAt),
);

export const adminUserRunStats = pgView("admin_user_run_stats").as(
  qb
    .select({
      user_id: user.id,
      email: user.email,
      tier: user.tier,
      total_runs: sql<number>`count(${runs.id})`.as("total_runs"),
      successful_runs: sql<number>`count(case when ${runs.status} = 'success' then 1 end)`.as("successful_runs"),
      failed_runs: sql<number>`count(case when ${runs.status} = 'failed' then 1 end)`.as("failed_runs"),
      timeout_runs: sql<number>`count(case when ${runs.status} = 'timeout' then 1 end)`.as("timeout_runs"),
      success_rate_percent: sql<number>`round(100.0 * count(case when ${runs.status} = 'success' then 1 end) / nullif(count(${runs.id}), 0), 2)`.as("success_rate_percent"),
      avg_duration_ms: sql<number>`avg(${runs.durationMs})`.as("avg_duration_ms"),
      last_run_at: sql<Date | null>`max(${runs.startedAt})`.as("last_run_at"),
      active_days: sql<number>`count(distinct date(${runs.startedAt}))`.as("active_days"),
      runs_last_24h: sql<number>`count(case when ${runs.startedAt} >= now() - interval '24 hours' then 1 end)`.as("runs_last_24h"),
      runs_last_7d: sql<number>`count(case when ${runs.startedAt} >= now() - interval '7 days' then 1 end)`.as("runs_last_7d"),
      runs_last_30d: sql<number>`count(case when ${runs.startedAt} >= now() - interval '30 days' then 1 end)`.as("runs_last_30d"),
    })
    .from(user)
    .leftJoin(jobs, sql`${jobs.userId} = ${user.id}`)
    .leftJoin(jobEndpoints, sql`${jobEndpoints.jobId} = ${jobs.id}`)
    .leftJoin(runs, sql`${runs.endpointId} = ${jobEndpoints.id}`)
    .groupBy(user.id, user.email, user.tier),
);

export const adminUserAiStats = pgView("admin_user_ai_stats").as(
  qb
    .select({
      user_id: user.id,
      email: user.email,
      tier: user.tier,
      total_ai_sessions: sql<number>`count(${aiAnalysisSessions.id})`.as("total_ai_sessions"),
      total_tokens_used: sql<number>`sum(${aiAnalysisSessions.tokenUsage})`.as("total_tokens_used"),
      avg_tokens_per_session: sql<number>`avg(${aiAnalysisSessions.tokenUsage})`.as("avg_tokens_per_session"),
      avg_session_duration_ms: sql<number>`avg(${aiAnalysisSessions.durationMs})`.as("avg_session_duration_ms"),
      last_ai_analysis_at: sql<Date | null>`max(${aiAnalysisSessions.analyzedAt})`.as("last_ai_analysis_at"),
      ai_sessions_last_24h: sql<number>`count(case when ${aiAnalysisSessions.analyzedAt} >= now() - interval '24 hours' then 1 end)`.as("ai_sessions_last_24h"),
      ai_sessions_last_7d: sql<number>`count(case when ${aiAnalysisSessions.analyzedAt} >= now() - interval '7 days' then 1 end)`.as("ai_sessions_last_7d"),
      ai_sessions_last_30d: sql<number>`count(case when ${aiAnalysisSessions.analyzedAt} >= now() - interval '30 days' then 1 end)`.as("ai_sessions_last_30d"),
      tokens_last_30d: sql<number>`sum(case when ${aiAnalysisSessions.analyzedAt} >= now() - interval '30 days' then ${aiAnalysisSessions.tokenUsage} else 0 end)`.as("tokens_last_30d"),
    })
    .from(user)
    .leftJoin(jobs, sql`${jobs.userId} = ${user.id}`)
    .leftJoin(jobEndpoints, sql`${jobEndpoints.jobId} = ${jobs.id}`)
    .leftJoin(aiAnalysisSessions, sql`${aiAnalysisSessions.endpointId} = ${jobEndpoints.id}`)
    .groupBy(user.id, user.email, user.tier),
);

export const adminApikeyStats = pgView("admin_apikey_stats").as(
  qb
    .select({
      api_key_id: apiKey.id,
      api_key_name: apiKey.name,
      user_id: apiKey.userId,
      email: user.email,
      tier: user.tier,
      enabled: apiKey.enabled,
      rateLimitEnabled: apiKey.rateLimitEnabled,
      requestCount: apiKey.requestCount,
      remaining: apiKey.remaining,
      lastRequest: apiKey.lastRequest,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      status: sql<string>`case 
        when ${apiKey.expiresAt} is not null and ${apiKey.expiresAt} < now() then 'expired'
        when not ${apiKey.enabled} then 'disabled'
        else 'active'
      end`.as("status"),
    })
    .from(apiKey)
    .innerJoin(user, sql`${user.id} = ${apiKey.userId}`),
);

export const adminDailyMetrics = pgView("admin_daily_metrics").as(
  qb
    .select({
      date: sql`date(${runs.startedAt})`.as("date"),
      active_endpoints: sql<number>`count(distinct ${runs.endpointId})`.as("active_endpoints"),
      total_runs: sql<number>`count(${runs.id})`.as("total_runs"),
      successful_runs: sql<number>`count(case when ${runs.status} = 'success' then 1 end)`.as("successful_runs"),
      failed_runs: sql<number>`count(case when ${runs.status} = 'failed' then 1 end)`.as("failed_runs"),
      success_rate_percent: sql<number>`round(100.0 * count(case when ${runs.status} = 'success' then 1 end) / nullif(count(${runs.id}), 0), 2)`.as("success_rate_percent"),
      avg_duration_ms: sql<number>`avg(${runs.durationMs})`.as("avg_duration_ms"),
      ai_sessions: sql<number>`count(distinct ${aiAnalysisSessions.id})`.as("ai_sessions"),
      total_tokens: sql<number>`sum(${aiAnalysisSessions.tokenUsage})`.as("total_tokens"),
    })
    .from(runs)
    .leftJoin(aiAnalysisSessions, sql`date(${aiAnalysisSessions.analyzedAt}) = date(${runs.startedAt})`)
    .where(sql`${runs.startedAt} >= now() - interval '90 days'`)
    .groupBy(sql`date(${runs.startedAt})`)
    .orderBy(sql`date desc`),
);

export const adminSubscriptionOverview = pgView("admin_subscription_overview").as(
  qb
    .select({
      tier: user.tier,
      subscription_status: user.subscriptionStatus,
      user_count: sql<number>`count(*)`.as("user_count"),
      new_users_30d: sql<number>`count(case when ${user.createdAt} >= now() - interval '30 days' then 1 end)`.as("new_users_30d"),
      expired_subscriptions: sql<number>`count(case when ${user.subscriptionEndsAt} is not null and ${user.subscriptionEndsAt} < now() then 1 end)`.as("expired_subscriptions"),
      active_subscriptions: sql<number>`count(case when ${user.subscriptionEndsAt} is not null and ${user.subscriptionEndsAt} > now() then 1 end)`.as("active_subscriptions"),
    })
    .from(user)
    .groupBy(user.tier, user.subscriptionStatus)
    .orderBy(user.tier, user.subscriptionStatus),
);

export const adminTopJobs = pgView("admin_top_jobs").as(
  qb
    .select({
      job_id: jobs.id,
      job_name: jobs.name,
      user_id: jobs.userId,
      user_email: user.email,
      tier: user.tier,
      job_status: jobs.status,
      endpoint_count: sql<number>`count(distinct ${jobEndpoints.id})`.as("endpoint_count"),
      total_runs: sql<number>`count(${runs.id})`.as("total_runs"),
      successful_runs: sql<number>`count(case when ${runs.status} = 'success' then 1 end)`.as("successful_runs"),
      failed_runs: sql<number>`count(case when ${runs.status} = 'failed' then 1 end)`.as("failed_runs"),
      last_run_at: sql<Date | null>`max(${runs.startedAt})`.as("last_run_at"),
      created_at: jobs.createdAt,
    })
    .from(jobs)
    .innerJoin(user, sql`${user.id} = ${jobs.userId}`)
    .leftJoin(jobEndpoints, sql`${jobEndpoints.jobId} = ${jobs.id}`)
    .leftJoin(runs, sql`${runs.endpointId} = ${jobEndpoints.id}`)
    .where(sql`${jobs.archivedAt} is null`)
    .groupBy(jobs.id, jobs.name, jobs.userId, user.email, user.tier, jobs.status, jobs.createdAt)
    .orderBy(sql`count(${runs.id}) desc`)
    .limit(100),
);

export const adminRunSourceStats = pgView("admin_run_source_stats").as(
  qb
    .select({
      date: sql`date(${runs.startedAt})`.as("date"),
      source: runs.source,
      run_count: sql<number>`count(*)`.as("run_count"),
      successful_runs: sql<number>`count(case when ${runs.status} = 'success' then 1 end)`.as("successful_runs"),
      failed_runs: sql<number>`count(case when ${runs.status} = 'failed' then 1 end)`.as("failed_runs"),
    })
    .from(runs)
    .where(sql`${runs.startedAt} >= now() - interval '30 days' and ${runs.source} is not null`)
    .groupBy(sql`date(${runs.startedAt})`, runs.source)
    .orderBy(sql`date desc`, runs.source),
);

export const adminErrorAnalysis = pgView("admin_error_analysis").as(
  qb
    .select({
      date: sql`date(${runs.startedAt})`.as("date"),
      statusCode: runs.statusCode,
      error_summary: sql<string>`left(${runs.errorMessage}, 100)`.as("error_summary"),
      error_count: sql<number>`count(*)`.as("error_count"),
      affected_endpoints: sql<number>`count(distinct ${runs.endpointId})`.as("affected_endpoints"),
      affected_jobs: sql<number>`count(distinct ${jobEndpoints.jobId})`.as("affected_jobs"),
      affected_users: sql<number>`count(distinct ${jobs.userId})`.as("affected_users"),
    })
    .from(runs)
    .innerJoin(jobEndpoints, sql`${jobEndpoints.id} = ${runs.endpointId}`)
    .innerJoin(jobs, sql`${jobs.id} = ${jobEndpoints.jobId}`)
    .innerJoin(user, sql`${user.id} = ${jobs.userId}`)
    .where(sql`${runs.status} in ('failed', 'timeout') and ${runs.startedAt} >= now() - interval '7 days'`)
    .groupBy(sql`date(${runs.startedAt})`, runs.statusCode, sql`left(${runs.errorMessage}, 100)`)
    .orderBy(sql`date desc`, sql`count(*) desc`)
    .limit(100),
);

export const adminUserActivity = pgView("admin_user_activity").as(
  qb
    .select({
      user_id: user.id,
      email: user.email,
      tier: user.tier,
      subscription_status: user.subscriptionStatus,
      signup_date: user.createdAt,
      last_activity_date: sql<Date | null>`max(${runs.startedAt})`.as("last_activity_date"),
      days_since_last_activity: sql<number>`extract(day from now() - max(${runs.startedAt}))`.as("days_since_last_activity"),
      total_active_days: sql<number>`count(distinct date(${runs.startedAt}))`.as("total_active_days"),
      activity_status: sql<string>`case
        when max(${runs.startedAt}) >= now() - interval '7 days' then 'active'
        when max(${runs.startedAt}) >= now() - interval '30 days' then 'inactive'
        when max(${runs.startedAt}) is null then 'never_active'
        else 'churned'
      end`.as("activity_status"),
    })
    .from(user)
    .leftJoin(jobs, sql`${jobs.userId} = ${user.id}`)
    .leftJoin(jobEndpoints, sql`${jobEndpoints.jobId} = ${jobs.id}`)
    .leftJoin(runs, sql`${runs.endpointId} = ${jobEndpoints.id}`)
    .groupBy(user.id, user.email, user.tier, user.subscriptionStatus, user.createdAt)
    .orderBy(sql`max(${runs.startedAt}) desc nulls last`),
);
