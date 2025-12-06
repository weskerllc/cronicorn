# Admin Monitoring - Available Metrics

Quick reference for all metrics available in the admin monitoring system.

## 📊 Metrics Overview

### User Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total Users | `admin_user_stats` | Count of all registered users |
| Users by Tier | `"user"` table | Free, Pro, Enterprise breakdown |
| New Signups (30d) | `"user"` table | Users created in last 30 days |
| Active Users | `admin_user_activity` | Users with activity in last 7 days |
| Inactive Users | `admin_user_activity` | Users without activity 7-30 days |
| Churned Users | `admin_user_activity` | Users inactive > 30 days |
| Anonymous Users | `"user"` table | Users with `is_anonymous = true` |

### Job & Endpoint Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total Jobs | `admin_user_stats` | All jobs across all users |
| Active Jobs | `jobs` table | Jobs with `status = 'active'` |
| Total Endpoints | `admin_user_stats` | All endpoints across all users |
| Active Endpoints | `admin_user_stats` | Non-archived, non-paused endpoints |
| Paused Endpoints | `admin_user_stats` | Endpoints with `paused_until > NOW()` |
| Archived Endpoints | `job_endpoints` | Endpoints with `archived_at != NULL` |
| Top Jobs by Activity | `admin_top_jobs` | Jobs ranked by run count |

### Run Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total Runs | `admin_user_run_stats` | All execution runs |
| Successful Runs | `admin_user_run_stats` | Runs with `status = 'success'` |
| Failed Runs | `admin_user_run_stats` | Runs with `status = 'failed'` |
| Timeout Runs | `admin_user_run_stats` | Runs with `status = 'timeout'` |
| Success Rate | `admin_user_run_stats` | % of successful runs |
| Runs Last 24h | `admin_user_run_stats` | Activity in last day |
| Runs Last 7d | `admin_user_run_stats` | Activity in last week |
| Runs Last 30d | `admin_user_run_stats` | Activity in last month |
| Average Duration | `admin_user_run_stats` | Mean execution time (ms) |
| Daily Run Volume | `admin_daily_metrics` | Runs per day (last 90 days) |
| Hourly Distribution | `runs` table | Runs by hour of day |

### AI Usage Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total AI Sessions | `admin_user_ai_stats` | All AI analysis sessions |
| Total Tokens Used | `admin_user_ai_stats` | Cumulative token consumption |
| Tokens Last 30d | `admin_user_ai_stats` | Recent token usage |
| Avg Tokens/Session | `admin_user_ai_stats` | Mean tokens per analysis |
| Avg Session Duration | `admin_user_ai_stats` | Mean analysis time (ms) |
| AI Sessions Last 24h | `admin_user_ai_stats` | Recent AI activity |
| AI Sessions Last 7d | `admin_user_ai_stats` | Weekly AI activity |
| AI Sessions Last 30d | `admin_user_ai_stats` | Monthly AI activity |
| AI by User Tier | Custom query | Token usage by subscription level |
| Daily AI Activity | `admin_daily_metrics` | AI sessions per day |

### Error & Health Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Error Count | `admin_error_analysis` | Total failed/timeout runs |
| Error Rate | `admin_daily_metrics` | % of runs that failed |
| Common Errors | `admin_error_analysis` | Most frequent error messages |
| Errors by Status Code | `admin_error_analysis` | HTTP status code breakdown |
| Affected Endpoints | `admin_error_analysis` | Endpoints with errors |
| Affected Users | `admin_error_analysis` | Users experiencing errors |
| System Success Rate | `admin_daily_metrics` | Overall success % |
| Endpoint Failure Count | `job_endpoints` | Consecutive failures per endpoint |

### Scheduling Source Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Baseline Runs | `admin_run_source_stats` | Runs from cron/interval schedule |
| AI-Scheduled Runs | `admin_run_source_stats` | Runs from AI adjustments |
| Manual Runs | `admin_run_source_stats` | Manually triggered runs |
| Source Distribution | `admin_run_source_stats` | % breakdown by source |
| Success by Source | `admin_run_source_stats` | Success rates per source type |

### Subscription & Revenue Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total Subscribers | `admin_subscription_overview` | Users with active subscriptions |
| Free Tier Users | `admin_subscription_overview` | Users on free plan |
| Pro Tier Users | `admin_subscription_overview` | Users on pro plan |
| Enterprise Users | `admin_subscription_overview` | Users on enterprise plan |
| Active Subscriptions | `admin_subscription_overview` | Subscriptions not expired |
| Expired Subscriptions | `admin_subscription_overview` | Past end date subscriptions |
| New Subscribers (30d) | `admin_subscription_overview` | Recent upgrades |
| Subscription Status | `"user"` table | active/trialing/canceled/past_due |
| MRR Estimate | Custom query | Monthly recurring revenue |
| Expiring Soon | Custom query | Subscriptions ending in 7 days |

### API Key Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Total API Keys | `admin_apikey_stats` | All API keys across users |
| Active API Keys | `admin_apikey_stats` | Enabled, non-expired keys |
| Disabled Keys | `admin_apikey_stats` | Keys with `enabled = false` |
| Expired Keys | `admin_apikey_stats` | Keys past expiration date |
| Total Requests | `admin_apikey_stats` | Cumulative API calls |
| Rate Limited Keys | `admin_apikey_stats` | Keys with rate limiting enabled |
| Keys by User Tier | Custom query | API key usage by subscription |
| Recent API Activity | `admin_apikey_stats` | Keys with recent requests |

### Engagement Metrics

| Metric | Source View | Description |
|--------|-------------|-------------|
| Daily Active Users | Custom query | Unique users with runs per day |
| Weekly Active Users | Custom query | Unique users with runs per week |
| Monthly Active Users | Custom query | Unique users with runs per month |
| User Retention Rate | Custom query | % of cohort still active |
| Days Since Last Activity | `admin_user_activity` | Inactivity duration per user |
| Total Active Days | `admin_user_run_stats` | Days with at least one run |
| Activity Status | `admin_user_activity` | active/inactive/churned classification |
| Never Active Users | `admin_user_activity` | Signed up but never used |

### System Resource Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| Database Size | `pg_tables` | Total DB storage used |
| Table Sizes | `pg_tables` | Storage per table |
| Active Connections | `pg_stat_activity` | Current DB connections |
| Active Endpoints | `admin_daily_metrics` | Endpoints with recent runs |
| Avg Response Time | `admin_user_run_stats` | Mean endpoint response time |

## 🎯 Common Metric Combinations

### Executive Dashboard

```
Total Users
├── By Tier (pie chart)
├── New Last 30d (number)
└── Active Last 7d (number)

Total Runs
├── Success Rate (gauge)
├── Daily Trend (line chart)
└── By Source (stacked bar)

AI Token Usage
├── Total Last 30d (number)
├── By User (top 10 bar)
└── Daily Trend (line chart)

Revenue
├── Subscribers by Tier (bar chart)
├── MRR Estimate (number)
└── Churn Rate (number)
```

### Operations Dashboard

```
System Health
├── Success Rate 24h (gauge)
├── Active Endpoints (number)
├── Runs Last Hour (number)
└── Error Rate (gauge)

Recent Activity
├── Runs by Hour (bar chart)
├── Top Active Jobs (table)
└── Recent Errors (table)

Resource Usage
├── Database Size (number)
├── API Request Count (number)
└── AI Sessions (number)
```

### Growth Dashboard

```
User Growth
├── Signups Trend (line chart)
├── Activation Rate (gauge)
└── Retention by Cohort (line chart)

Feature Adoption
├── Jobs Created (trend)
├── Endpoints Created (trend)
├── AI Usage (trend)
└── API Keys Created (trend)

Engagement
├── DAU/WAU/MAU (numbers)
├── Activity Status (pie chart)
└── Days Since Last Activity (histogram)
```

### Cost Management Dashboard

```
AI Costs
├── Total Tokens (number)
├── Tokens by User (table)
├── Tokens by Tier (bar chart)
└── Daily Token Trend (line chart)

API Costs
├── Total Requests (number)
├── Requests by User (table)
└── Rate Limit Usage (gauge)

Infrastructure
├── Active Endpoints (number)
├── Daily Runs (trend)
└── Database Growth (line chart)
```

## 📈 Metric Calculation Examples

### Success Rate
```sql
ROUND(
  100.0 * successful_runs / NULLIF(total_runs, 0),
  2
) as success_rate_percent
```

### Monthly Recurring Revenue (Example)
```sql
CASE tier
  WHEN 'pro' THEN COUNT(*) * 20
  WHEN 'enterprise' THEN COUNT(*) * 100
  ELSE 0
END as estimated_mrr
```

### Activity Status
```sql
CASE
  WHEN last_activity >= NOW() - INTERVAL '7 days' THEN 'active'
  WHEN last_activity >= NOW() - INTERVAL '30 days' THEN 'inactive'
  WHEN last_activity IS NULL THEN 'never_active'
  ELSE 'churned'
END as activity_status
```

### User Retention
```sql
ROUND(
  100.0 * users_still_active / NULLIF(total_signups, 0),
  2
) as retention_rate
```

## 🔍 Filtering Options

Most views and queries support filtering by:

| Filter | Example | Purpose |
|--------|---------|---------|
| Date Range | `WHERE date >= NOW() - INTERVAL '30 days'` | Limit to recent data |
| User Tier | `WHERE tier = 'pro'` | Focus on specific plan |
| Job ID | `WHERE job_id = 'xyz'` | Analyze specific job |
| Endpoint ID | `WHERE endpoint_id = 'abc'` | Analyze specific endpoint |
| Status | `WHERE status = 'failed'` | Focus on errors |
| Source | `WHERE source = 'ai-interval'` | AI vs baseline |
| Subscription Status | `WHERE subscription_status = 'active'` | Active subscribers |
| Activity Status | `WHERE activity_status = 'churned'` | At-risk users |

## 📊 Time Granularities

Available time groupings:

| Granularity | SQL | Use Case |
|-------------|-----|----------|
| Hourly | `DATE_TRUNC('hour', timestamp)` | Last 24-48 hours |
| Daily | `DATE(timestamp)` | Last 30-90 days |
| Weekly | `DATE_TRUNC('week', timestamp)` | Last 3-6 months |
| Monthly | `DATE_TRUNC('month', timestamp)` | Last 1-2 years |

## 🎯 Key Performance Indicators (KPIs)

### Product Health
- System Success Rate > 95%
- Average Response Time < 5000ms
- Error Rate < 5%
- Active Endpoints > 0

### User Engagement
- DAU/MAU Ratio > 20%
- Churn Rate < 5%
- Average Active Days > 10
- Never Active Rate < 30%

### Business Metrics
- Monthly Subscriber Growth > 0%
- MRR Growth > 0%
- Trial Conversion Rate > 10%
- Free-to-Paid Conversion > 5%

### AI Efficiency
- Tokens per Session < 1000
- AI Session Success Rate > 90%
- AI-Scheduled Run Success > Baseline
- Token Cost per User < Target

## 💡 Tips for Metric Analysis

1. **Compare Periods**: Always compare metrics to previous period (WoW, MoM)
2. **Segment by Tier**: Look for differences between free/pro/enterprise
3. **Track Trends**: Single numbers are less useful than trends
4. **Set Baselines**: Establish normal ranges for each metric
5. **Create Alerts**: Set thresholds for critical metrics
6. **Review Regularly**: Weekly for operations, monthly for growth
7. **Document Changes**: Note when you make product/pricing changes
8. **Use Percentages**: Absolute numbers don't scale, percentages do

## 📚 Related Documentation

- **Quick Start**: [admin-monitoring-quickstart.md](./admin-monitoring-quickstart.md)
- **Query Examples**: [admin-queries.md](./admin-queries.md)
- **Full Guide**: [admin-monitoring.md](./admin-monitoring.md)
- **Architecture**: [admin-monitoring-architecture.md](./admin-monitoring-architecture.md)
