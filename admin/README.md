# Admin Monitoring

Quick admin-only monitoring setup using Metabase for cross-user insights.

## Quick Start

```bash
# From the admin/ directory
cd admin
./start-admin.sh
```

Access Metabase at: **http://localhost:3030**

## Database Connection

**First Time Setup:**
1. Open http://localhost:3030
2. Create admin account
3. Add database connection:
   - Database type: **PostgreSQL**
   - Host: **host.docker.internal** (or **cronicorn-db** if using main docker network)
   - Port: **5432**
   - Database: **db**
   - Username: **user**
   - Password: **password**

## Available Views

The database has 10 pre-built views for admin analytics:

| View | What It Shows |
|------|---------------|
| `admin_user_stats` | Users with job/endpoint counts |
| `admin_user_run_stats` | Execution stats per user (success rates, activity) |
| `admin_user_ai_stats` | AI token usage per user |
| `admin_daily_metrics` | Daily system metrics (last 90 days) |
| `admin_subscription_overview` | Revenue by tier and status |
| `admin_top_jobs` | Most active jobs (top 100) |
| `admin_error_analysis` | Recent errors (last 7 days) |
| `admin_user_activity` | User engagement/churn status |
| `admin_run_source_stats` | Baseline vs AI scheduling |
| `admin_apikey_stats` | API key usage |

## Example Queries

**Top AI token consumers:**
```sql
SELECT email, tier, tokens_last_30d
FROM admin_user_ai_stats
WHERE tokens_last_30d > 0
ORDER BY tokens_last_30d DESC
LIMIT 20;
```

**System health (24h):**
```sql
SELECT * FROM admin_daily_metrics
WHERE date >= CURRENT_DATE - 1;
```

**Active users by tier:**
```sql
SELECT tier, COUNT(*) 
FROM admin_user_activity
WHERE activity_status = 'active'
GROUP BY tier;
```

## Commands

```bash
./start-admin.sh     # Start Metabase
./stop-admin.sh      # Stop Metabase
./logs-admin.sh      # View logs
./reset-admin.sh     # Reset all data
./provision-metabase.ts  # Run idempotent setup (admin user + DB connection)
```

## Automated provisioning

After `./start-admin.sh`, run the provisioning helper to skip the UI wizard and ensure the analytics DB is wired:

```bash
cd admin
pnpm dlx tsx provision-metabase.ts
```

To override credentials/targets, set env vars before running. Examples:

```bash
# From repo root, reuse .env
pnpm exec dotenv -e .env -- pnpm dlx tsx admin/provision-metabase.ts

# Custom admin creds (run from admin/)
MB_ADMIN_EMAIL=me@example.com MB_ADMIN_PASSWORD='strongpass' pnpm dlx tsx provision-metabase.ts

# Point to a remote Metabase instance
MB_URL=https://metabase.mycompany.com pnpm dlx tsx provision-metabase.ts
```

Environment overrides (optional):

- Metabase URL: `MB_URL` (default `http://localhost:3030`)
- Admin credentials: `MB_ADMIN_EMAIL`, `MB_ADMIN_PASSWORD`
- Site name: `MB_SITE_NAME`
- Analytics DB connection: `MB_ANALYTICS_DB_HOST`, `MB_ANALYTICS_DB_PORT`, `MB_ANALYTICS_DB_NAME`, `MB_ANALYTICS_DB_USER`, `MB_ANALYTICS_DB_PASSWORD`, `MB_ANALYTICS_DB_DISPLAY_NAME`

The script is idempotent: it checks `/api/session/properties` to see if setup is needed, runs `/api/setup` once, logs in, and ensures the analytics database entry exists.

## Building dashboards (step-by-step, no guessing)

Goal: one dashboard "Admin Overview" in collection "Admin Insights" with clear layout and fixed visuals.

1) Prep
- Sign in (admin@example.com / devpassword123!).
- Ensure database `Cronicorn Analytics` is connected (Settings → Admin → Databases).
- Create collection "Admin Insights".

2) Create questions (New → Question → Native query). Save each into "Admin Insights". Use exactly these queries and visual types:

KPIs (keep as single-value cards):
- "KPI: Total runs 24h" → `select sum(total_runs) as total_runs_24h from admin_daily_metrics where date >= current_date - 1;` (visual: single value)
- "KPI: Success rate 24h" → `select round(avg(success_rate_percent),2) as success_rate_24h from admin_daily_metrics where date >= current_date - 1;` (single value, suffix "%")
- "KPI: Active endpoints 24h" → `select sum(active_endpoints) as active_endpoints_24h from admin_daily_metrics where date >= current_date - 1;` (single value)
- "KPI: AI tokens 30d" → `select coalesce(sum(total_tokens),0) as tokens_30d from admin_daily_metrics;` (single value)

Trends:
- "Trend: Runs success vs failed (90d)" → `select date, successful_runs, failed_runs from admin_daily_metrics order by date asc;` (visual: line/area with two series; x=date, y=counts)
- "Trend: Run sources (30d)" → `select date, source, run_count from admin_run_source_stats order by date asc;` (visual: stacked bar; x=date, y=run_count, stacked by source)
- "Trend: AI tokens (30d)" → `select date, total_tokens from admin_daily_metrics order by date asc;` (visual: line; x=date, y=total_tokens)
- "Trend: Success rate (90d)" → `select date, success_rate_percent from admin_daily_metrics order by date asc;` (visual: line; x=date, y=success_rate_percent; show y-axis as %)

Breakdowns (tables/charts):
- "Users by activity" → `select * from admin_user_activity order by days_since_last_activity asc nulls last;` (table; show columns email, tier, activity_status, days_since_last_activity, last_activity_date)
- "Top jobs (by runs)" → `select * from admin_top_jobs order by total_runs desc limit 25;` (table; show job_name, user_email, total_runs, successful_runs, failed_runs, last_run_at)
- "Errors last 7d" → `select * from admin_error_analysis order by date desc, error_count desc;` (table; show date, status_code, error_summary, error_count, affected_jobs, affected_users)
- "API keys status" → `select * from admin_apikey_stats;` (table; show api_key_name, email, tier, status, request_count, remaining, last_request, expires_at)
- "Subscriptions by status" → `select subscription_status, tier, user_count from admin_subscription_overview;` (visual: stacked bar; x=subscription_status, y=user_count, stack by tier)
- "AI usage by user (30d)" → `select email, tier, tokens_last_30d from admin_user_ai_stats order by tokens_last_30d desc;` (visual: bar; x=tokens_last_30d, y=email; color by tier)

3) Build the dashboard (New → Dashboard → "Admin Overview" in "Admin Insights")
- Row 1 (KPIs): add the four KPI cards side-by-side.
- Row 2 (Trends): place "Trend: Runs success vs failed", "Trend: Success rate", "Trend: AI tokens".
- Row 3 (Trend + breakdown): "Trend: Run sources (30d)" full width or two-thirds; alongside "Subscriptions by status".
- Row 4 (Tables): "Top jobs", "Users by activity".
- Row 5 (Tables): "Errors last 7d", "API keys status", "AI usage by user".

4) Filters (optional but recommended)
- Add a date filter mapped to the `date` field on: Trend cards, Errors table (map to date), Run sources, Success rate, AI tokens.
- Add a dropdown filter for `tier` mapped to: Users by activity, AI usage by user, Top jobs (via user tier), API keys status.

5) (Optional) Export for automation
- Use Metabase API to GET `/api/dashboard/:id` and `/api/card/:id` for these items, store JSON under `admin/metabase-export/`, and later import via script.

## Key Metrics

**Users**: Total, by tier, active, churned
**AI**: Token usage, sessions, costs per user
**Jobs**: Active endpoints, success rates
**Revenue**: Subscriptions, MRR by tier
**Errors**: Recent failures, affected resources

## Production Setup

For production, create a read-only database user:

```sql
CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO metabase_readonly;
```

Then use these credentials in Metabase instead of the default user.

## Troubleshooting

**Can't connect to database?**
- Use `host.docker.internal` for host (macOS/Windows)
- Use `172.17.0.1` for host (Linux)
- Or connect Metabase to main docker network

**Port conflict?**
- Set `METABASE_PORT=3031` before starting

**Reset everything:**
```bash
./reset-admin.sh
```
