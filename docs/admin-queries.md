# Admin Query Reference

Quick reference for common administrative queries in Metabase. These queries can be used directly in Metabase's SQL editor or adapted for your needs.

## User Analytics

### All Users Overview
```sql
SELECT * FROM admin_user_stats
ORDER BY created_at DESC;
```

### Active Users (Last 7 Days)
```sql
SELECT 
  email,
  tier,
  total_runs,
  successful_runs,
  runs_last_7d,
  success_rate_percent
FROM admin_user_run_stats
WHERE runs_last_7d > 0
ORDER BY runs_last_7d DESC;
```

### New Signups This Month
```sql
SELECT 
  email,
  name,
  tier,
  created_at
FROM "user"
WHERE created_at >= DATE_TRUNC('month', NOW())
ORDER BY created_at DESC;
```

### Users by Tier
```sql
SELECT 
  tier,
  COUNT(*) as user_count,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_last_30d
FROM "user"
GROUP BY tier
ORDER BY tier;
```

## AI Usage Analytics

### Top AI Token Consumers (Last 30 Days)
```sql
SELECT 
  email,
  tier,
  tokens_last_30d,
  ai_sessions_last_30d,
  ROUND(tokens_last_30d::numeric / NULLIF(ai_sessions_last_30d, 0), 2) as avg_tokens_per_session
FROM admin_user_ai_stats
WHERE tokens_last_30d > 0
ORDER BY tokens_last_30d DESC
LIMIT 20;
```

### AI Token Usage Trend (Daily)
```sql
SELECT 
  DATE(ais.analyzed_at) as date,
  COUNT(*) as sessions,
  SUM(ais.token_usage) as total_tokens,
  AVG(ais.token_usage) as avg_tokens_per_session
FROM ai_analysis_sessions ais
WHERE ais.analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(ais.analyzed_at)
ORDER BY date DESC;
```

### AI Usage by User Tier
```sql
SELECT 
  u.tier,
  COUNT(DISTINCT ais.id) as total_sessions,
  SUM(ais.token_usage) as total_tokens,
  AVG(ais.token_usage) as avg_tokens_per_session
FROM ai_analysis_sessions ais
JOIN job_endpoints je ON je.id = ais.endpoint_id
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
WHERE ais.analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY u.tier
ORDER BY total_tokens DESC;
```

## Job & Endpoint Analytics

### Top Active Endpoints
```sql
SELECT 
  je.name as endpoint_name,
  j.name as job_name,
  u.email as user_email,
  u.tier,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successes,
  ROUND(100.0 * COUNT(CASE WHEN r.status = 'success' THEN 1 END) / NULLIF(COUNT(r.id), 0), 2) as success_rate
FROM job_endpoints je
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
LEFT JOIN runs r ON r.endpoint_id = je.id 
  AND r.started_at >= NOW() - INTERVAL '7 days'
WHERE je.archived_at IS NULL
GROUP BY je.id, je.name, j.name, u.email, u.tier
HAVING COUNT(r.id) > 0
ORDER BY total_runs DESC
LIMIT 50;
```

### Endpoints with Low Success Rates
```sql
SELECT 
  je.name as endpoint_name,
  j.name as job_name,
  u.email as user_email,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successes,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failures,
  ROUND(100.0 * COUNT(CASE WHEN r.status = 'success' THEN 1 END) / NULLIF(COUNT(r.id), 0), 2) as success_rate
FROM job_endpoints je
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
JOIN runs r ON r.endpoint_id = je.id
WHERE r.started_at >= NOW() - INTERVAL '7 days'
  AND je.archived_at IS NULL
GROUP BY je.id, je.name, j.name, u.email
HAVING COUNT(r.id) >= 10
  AND 100.0 * COUNT(CASE WHEN r.status = 'success' THEN 1 END) / COUNT(r.id) < 80
ORDER BY success_rate ASC
LIMIT 20;
```

### Paused Endpoints
```sql
SELECT 
  je.name as endpoint_name,
  j.name as job_name,
  u.email as user_email,
  je.paused_until,
  je.last_run_at
FROM job_endpoints je
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
WHERE je.paused_until IS NOT NULL 
  AND je.paused_until > NOW()
  AND je.archived_at IS NULL
ORDER BY je.paused_until;
```

## Run Analytics

### Run Volume Trend (Daily)
```sql
SELECT * FROM admin_daily_metrics
ORDER BY date DESC
LIMIT 30;
```

### Runs by Source (Baseline vs AI)
```sql
SELECT * FROM admin_run_source_stats
ORDER BY date DESC, source;
```

### Average Run Duration by Endpoint
```sql
SELECT 
  je.name as endpoint_name,
  j.name as job_name,
  u.email as user_email,
  COUNT(r.id) as total_runs,
  ROUND(AVG(r.duration_ms)) as avg_duration_ms,
  ROUND(MIN(r.duration_ms)) as min_duration_ms,
  ROUND(MAX(r.duration_ms)) as max_duration_ms
FROM runs r
JOIN job_endpoints je ON je.id = r.endpoint_id
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
WHERE r.started_at >= NOW() - INTERVAL '7 days'
  AND r.duration_ms IS NOT NULL
GROUP BY je.id, je.name, j.name, u.email
HAVING COUNT(r.id) >= 10
ORDER BY avg_duration_ms DESC
LIMIT 30;
```

### Hourly Run Distribution (Last 24h)
```sql
SELECT 
  EXTRACT(HOUR FROM r.started_at) as hour,
  COUNT(*) as run_count,
  COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successes,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failures
FROM runs r
WHERE r.started_at >= NOW() - INTERVAL '24 hours'
GROUP BY EXTRACT(HOUR FROM r.started_at)
ORDER BY hour;
```

## Error Analysis

### Recent Errors
```sql
SELECT * FROM admin_error_analysis
ORDER BY date DESC, error_count DESC
LIMIT 50;
```

### Most Common Error Messages
```sql
SELECT 
  LEFT(error_message, 100) as error_summary,
  status_code,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT endpoint_id) as affected_endpoints,
  MAX(started_at) as last_occurred
FROM runs
WHERE status IN ('failed', 'timeout')
  AND started_at >= NOW() - INTERVAL '7 days'
  AND error_message IS NOT NULL
GROUP BY LEFT(error_message, 100), status_code
ORDER BY occurrence_count DESC
LIMIT 20;
```

### Endpoints with Highest Failure Rates
```sql
SELECT 
  je.name as endpoint_name,
  je.url,
  u.email as user_email,
  je.failure_count,
  COUNT(r.id) as recent_runs,
  COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as recent_failures
FROM job_endpoints je
JOIN jobs j ON j.id = je.job_id
JOIN "user" u ON u.id = j.user_id
LEFT JOIN runs r ON r.endpoint_id = je.id 
  AND r.started_at >= NOW() - INTERVAL '24 hours'
WHERE je.archived_at IS NULL
  AND je.failure_count > 0
GROUP BY je.id, je.name, je.url, u.email, je.failure_count
ORDER BY je.failure_count DESC, recent_failures DESC
LIMIT 30;
```

## Subscription & Revenue

### Subscription Overview
```sql
SELECT * FROM admin_subscription_overview
ORDER BY tier, subscription_status;
```

### Active Subscriptions by Tier
```sql
SELECT 
  tier,
  COUNT(*) as active_subscribers,
  COUNT(CASE WHEN subscription_ends_at > NOW() + INTERVAL '7 days' THEN 1 END) as renewing_soon
FROM "user"
WHERE subscription_status = 'active'
  AND subscription_ends_at > NOW()
GROUP BY tier
ORDER BY tier;
```

### Subscriptions Expiring Soon (Next 7 Days)
```sql
SELECT 
  email,
  name,
  tier,
  subscription_status,
  subscription_ends_at,
  EXTRACT(DAY FROM subscription_ends_at - NOW()) as days_until_expiry
FROM "user"
WHERE subscription_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND subscription_status = 'active'
ORDER BY subscription_ends_at;
```

### Monthly Recurring Revenue (MRR) Estimate
```sql
-- Note: Update prices based on your actual pricing
SELECT 
  tier,
  COUNT(*) as subscribers,
  CASE tier
    WHEN 'pro' THEN COUNT(*) * 20  -- Assuming $20/month
    WHEN 'enterprise' THEN COUNT(*) * 100  -- Assuming $100/month
    ELSE 0
  END as estimated_mrr
FROM "user"
WHERE subscription_status = 'active'
  AND subscription_ends_at > NOW()
GROUP BY tier
ORDER BY tier;
```

## User Activity & Churn

### User Activity Status
```sql
SELECT * FROM admin_user_activity
ORDER BY last_activity_date DESC NULLS LAST;
```

### Inactive Users (No Activity in 30 Days)
```sql
SELECT 
  email,
  tier,
  days_since_last_activity,
  last_activity_date
FROM admin_user_activity
WHERE activity_status IN ('inactive', 'churned')
  AND tier != 'free'  -- Focus on paying customers
ORDER BY days_since_last_activity DESC;
```

### User Retention by Cohort (Monthly)
```sql
SELECT 
  DATE_TRUNC('month', u.created_at) as signup_month,
  COUNT(DISTINCT u.id) as total_signups,
  COUNT(DISTINCT CASE 
    WHEN r.started_at >= NOW() - INTERVAL '30 days' 
    THEN u.id 
  END) as still_active,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN r.started_at >= NOW() - INTERVAL '30 days' THEN u.id END) 
    / NULLIF(COUNT(DISTINCT u.id), 0),
    2
  ) as retention_rate
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN runs r ON r.endpoint_id = je.id
WHERE u.created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', u.created_at)
ORDER BY signup_month DESC;
```

## System Health

### Overall System Health (Last 24h)
```sql
SELECT 
  COUNT(DISTINCT endpoint_id) as active_endpoints,
  COUNT(*) as total_runs,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
  COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_runs,
  ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
  ROUND(AVG(duration_ms)) as avg_duration_ms
FROM runs
WHERE started_at >= NOW() - INTERVAL '24 hours';
```

### Database Size
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Top Resource Consumers
```sql
SELECT 
  u.email,
  u.tier,
  COUNT(DISTINCT j.id) as job_count,
  COUNT(DISTINCT je.id) as endpoint_count,
  COUNT(r.id) as run_count_30d,
  SUM(COALESCE(ais.token_usage, 0)) as token_usage_30d
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
LEFT JOIN runs r ON r.endpoint_id = je.id 
  AND r.started_at >= NOW() - INTERVAL '30 days'
LEFT JOIN ai_analysis_sessions ais ON ais.endpoint_id = je.id 
  AND ais.analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.tier
ORDER BY run_count_30d DESC
LIMIT 20;
```

## API Usage

### API Key Activity
```sql
SELECT * FROM admin_apikey_stats
ORDER BY request_count DESC;
```

### Most Active API Keys (Last 30 Days)
```sql
SELECT 
  ak.name as key_name,
  u.email,
  ak.request_count,
  ak.last_request,
  ak.enabled,
  ak.rate_limit_enabled
FROM apikey ak
JOIN "user" u ON u.id = ak.user_id
WHERE ak.last_request >= NOW() - INTERVAL '30 days'
ORDER BY ak.request_count DESC
LIMIT 20;
```

## Tips for Using These Queries

1. **Copy and paste** any query into Metabase's SQL editor
2. **Modify date ranges** by changing `INTERVAL '30 days'` to your desired period
3. **Add filters** by adding `AND` conditions to the `WHERE` clause
4. **Save frequently used queries** as Metabase "Questions"
5. **Create dashboards** by combining multiple saved questions
6. **Set up alerts** on critical metrics (e.g., success rate drops below 95%)

## Performance Notes

- Queries use pre-built views when possible for better performance
- For large datasets, limit results with `LIMIT` clause
- Use appropriate date filters to reduce data scanned
- Consider adding database indexes for custom queries that run frequently
