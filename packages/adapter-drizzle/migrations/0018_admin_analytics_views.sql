-- Migration: Create admin analytics views for Metabase
-- Purpose: Provide read-only views for cross-user admin monitoring without code changes

-- View: User statistics overview
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  u.id,
  u.email,
  u.name,
  u.tier,
  u.subscription_status,
  u.created_at,
  u.is_anonymous,
  u.subscription_ends_at,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT je.id) as total_endpoints,
  COUNT(DISTINCT CASE WHEN je.archived_at IS NULL THEN je.id END) as active_endpoints,
  COUNT(DISTINCT CASE WHEN je.paused_until IS NOT NULL AND je.paused_until > NOW() THEN je.id END) as paused_endpoints
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id AND j.archived_at IS NULL
LEFT JOIN job_endpoints je ON je.job_id = j.id
GROUP BY u.id, u.email, u.name, u.tier, u.subscription_status, u.created_at, u.is_anonymous, u.subscription_ends_at;

-- View: Run statistics per user
CREATE OR REPLACE VIEW admin_user_run_stats AS
SELECT
  u.id as user_id,
  u.email,
  u.tier,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
  COUNT(CASE WHEN r.status = 'timeout' THEN 1 END) as timeout_runs,
  ROUND(
    100.0 * COUNT(CASE WHEN r.status = 'success' THEN 1 END) / NULLIF(COUNT(r.id), 0),
    2
  ) as success_rate_percent,
  AVG(r.duration_ms) as avg_duration_ms,
  MAX(r.started_at) as last_run_at,
  COUNT(DISTINCT DATE(r.started_at)) as active_days,
  COUNT(CASE WHEN r.started_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as runs_last_24h,
  COUNT(CASE WHEN r.started_at >= NOW() - INTERVAL '7 days' THEN 1 END) as runs_last_7d,
  COUNT(CASE WHEN r.started_at >= NOW() - INTERVAL '30 days' THEN 1 END) as runs_last_30d
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN runs r ON r.endpoint_id = je.id
GROUP BY u.id, u.email, u.tier;

-- View: AI session statistics per user
CREATE OR REPLACE VIEW admin_user_ai_stats AS
SELECT
  u.id as user_id,
  u.email,
  u.tier,
  COUNT(ais.id) as total_ai_sessions,
  SUM(ais.token_usage) as total_tokens_used,
  AVG(ais.token_usage) as avg_tokens_per_session,
  AVG(ais.duration_ms) as avg_session_duration_ms,
  MAX(ais.analyzed_at) as last_ai_analysis_at,
  COUNT(CASE WHEN ais.analyzed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as ai_sessions_last_24h,
  COUNT(CASE WHEN ais.analyzed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as ai_sessions_last_7d,
  COUNT(CASE WHEN ais.analyzed_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ai_sessions_last_30d,
  SUM(CASE WHEN ais.analyzed_at >= NOW() - INTERVAL '30 days' THEN ais.token_usage ELSE 0 END) as tokens_last_30d
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN ai_analysis_sessions ais ON ais.endpoint_id = je.id
GROUP BY u.id, u.email, u.tier;

-- View: API key usage statistics
CREATE OR REPLACE VIEW admin_apikey_stats AS
SELECT
  ak.id as api_key_id,
  ak.name as api_key_name,
  ak.user_id,
  u.email,
  u.tier,
  ak.enabled,
  ak.rate_limit_enabled,
  ak.request_count,
  ak.remaining,
  ak.last_request,
  ak.created_at,
  ak.expires_at,
  CASE 
    WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN 'expired'
    WHEN NOT ak.enabled THEN 'disabled'
    ELSE 'active'
  END as status
FROM apikey ak
JOIN "user" u ON u.id = ak.user_id;

-- View: System-wide daily metrics
CREATE OR REPLACE VIEW admin_daily_metrics AS
SELECT
  DATE(r.started_at) as date,
  COUNT(DISTINCT r.endpoint_id) as active_endpoints,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
  ROUND(
    100.0 * COUNT(CASE WHEN r.status = 'success' THEN 1 END) / NULLIF(COUNT(r.id), 0),
    2
  ) as success_rate_percent,
  AVG(r.duration_ms) as avg_duration_ms,
  COUNT(DISTINCT ais.id) as ai_sessions,
  SUM(ais.token_usage) as total_tokens
FROM runs r
LEFT JOIN ai_analysis_sessions ais ON DATE(ais.analyzed_at) = DATE(r.started_at)
WHERE r.started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(r.started_at)
ORDER BY date DESC;

-- View: Subscription revenue overview
CREATE OR REPLACE VIEW admin_subscription_overview AS
SELECT
  tier,
  subscription_status,
  COUNT(*) as user_count,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
  COUNT(CASE WHEN subscription_ends_at IS NOT NULL AND subscription_ends_at < NOW() THEN 1 END) as expired_subscriptions,
  COUNT(CASE WHEN subscription_ends_at IS NOT NULL AND subscription_ends_at > NOW() THEN 1 END) as active_subscriptions
FROM "user"
GROUP BY tier, subscription_status
ORDER BY tier, subscription_status;

-- View: Most active jobs across all users
CREATE OR REPLACE VIEW admin_top_jobs AS
SELECT
  j.id as job_id,
  j.name as job_name,
  j.user_id,
  u.email as user_email,
  u.tier,
  j.status as job_status,
  COUNT(DISTINCT je.id) as endpoint_count,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
  MAX(r.started_at) as last_run_at,
  j.created_at
FROM jobs j
JOIN "user" u ON u.id = j.user_id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN runs r ON r.endpoint_id = je.id
WHERE j.archived_at IS NULL
GROUP BY j.id, j.name, j.user_id, u.email, u.tier, j.status, j.created_at
ORDER BY total_runs DESC
LIMIT 100;

-- View: Run source distribution (baseline vs AI)
CREATE OR REPLACE VIEW admin_run_source_stats AS
SELECT
  DATE(r.started_at) as date,
  r.source,
  COUNT(*) as run_count,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs
FROM runs r
WHERE r.started_at >= NOW() - INTERVAL '30 days'
  AND r.source IS NOT NULL
GROUP BY DATE(r.started_at), r.source
ORDER BY date DESC, source;

-- View: Error analysis
CREATE OR REPLACE VIEW admin_error_analysis AS
SELECT
  DATE(r.started_at) as date,
  r.status_code,
  LEFT(r.error_message, 100) as error_summary,
  COUNT(*) as error_count,
  COUNT(DISTINCT r.endpoint_id) as affected_endpoints,
  COUNT(DISTINCT je.job_id) as affected_jobs,
  COUNT(DISTINCT u.id) as affected_users
FROM runs r
JOIN job_endpoints je ON je.id = r.endpoint_id
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
WHERE r.status IN ('failed', 'timeout')
  AND r.started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(r.started_at), r.status_code, LEFT(r.error_message, 100)
ORDER BY date DESC, error_count DESC
LIMIT 100;

-- View: User activity summary (for churn analysis)
CREATE OR REPLACE VIEW admin_user_activity AS
SELECT
  u.id as user_id,
  u.email,
  u.tier,
  u.subscription_status,
  u.created_at as signup_date,
  MAX(r.started_at) as last_activity_date,
  EXTRACT(DAY FROM NOW() - MAX(r.started_at)) as days_since_last_activity,
  COUNT(DISTINCT DATE(r.started_at)) as total_active_days,
  CASE
    WHEN MAX(r.started_at) >= NOW() - INTERVAL '7 days' THEN 'active'
    WHEN MAX(r.started_at) >= NOW() - INTERVAL '30 days' THEN 'inactive'
    WHEN MAX(r.started_at) IS NULL THEN 'never_active'
    ELSE 'churned'
  END as activity_status
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN runs r ON r.endpoint_id = je.id
GROUP BY u.id, u.email, u.tier, u.subscription_status, u.created_at
ORDER BY last_activity_date DESC NULLS LAST;

-- Grant read-only access to these views
-- Note: In production, create a separate read-only user for Metabase
-- Example: CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE db TO metabase_readonly;
-- GRANT USAGE ON SCHEMA public TO metabase_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
-- GRANT SELECT ON admin_user_stats, admin_user_run_stats, admin_user_ai_stats, 
--   admin_apikey_stats, admin_daily_metrics, admin_subscription_overview, 
--   admin_top_jobs, admin_run_source_stats, admin_error_analysis, admin_user_activity 
--   TO metabase_readonly;
