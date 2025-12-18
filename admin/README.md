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

## Prebuilt views

We removed the shared analytics views and the migration that created them. Use raw SQL directly in Metabase against the base tables (`user`, `jobs`, `job_endpoints`, `runs`, `ai_analysis_sessions`, `apikey`). No extra migrations are required beyond the normal app schema.

## Example Queries

**Top AI token consumers (30d):**
```sql
select u.email, u.tier, coalesce(sum(a.token_usage) filter (where a.analyzed_at >= now() - interval '30 days'), 0) as tokens_last_30d
from "user" u
left join jobs j on j.user_id = u.id
left join job_endpoints je on je.job_id = j.id
left join ai_analysis_sessions a on a.endpoint_id = je.id
group by u.email, u.tier
having coalesce(sum(a.token_usage) filter (where a.analyzed_at >= now() - interval '30 days'), 0) > 0
order by tokens_last_30d desc
limit 20;
```

**System health (24h):**
```sql
select
   count(*) as total_runs,
   count(*) filter (where status = 'success') as successful_runs,
   count(*) filter (where status = 'failed') as failed_runs,
   round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 2) as success_rate_percent,
   count(distinct endpoint_id) as active_endpoints
from runs
where started_at >= now() - interval '24 hours';
```

**Active users by tier:**
```sql
select tier, count(*)
from "user"
where id in (
   select distinct u.id
   from "user" u
   join jobs j on j.user_id = u.id
   join job_endpoints je on je.job_id = j.id
   join runs r on r.endpoint_id = je.id
   where r.started_at >= now() - interval '7 days'
)
group by tier;
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

2) Create questions (New → Question → Native query). Save each into "Admin Insights". Use exactly these queries and visual types (all run against base tables, no views needed):

KPIs (single-value):
- "KPI: Total runs 24h"
```sql
select count(*) as total_runs_24h
from runs
where started_at >= now() - interval '24 hours';
```
- "KPI: Success rate 24h"
```sql
select round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 2) as success_rate_24h
from runs
where started_at >= now() - interval '24 hours';
```
- "KPI: Active endpoints 24h"
```sql
select count(distinct endpoint_id) as active_endpoints_24h
from runs
where started_at >= now() - interval '24 hours';
```
- "KPI: AI tokens 30d"
```sql
select coalesce(sum(token_usage), 0) as tokens_30d
from ai_analysis_sessions
where analyzed_at >= now() - interval '30 days';
```

Trends:
- "Trend: Runs success vs failed (90d)"
```sql
select date(started_at) as date,
   count(*) filter (where status = 'success') as successful_runs,
   count(*) filter (where status = 'failed') as failed_runs
from runs
where started_at >= now() - interval '90 days'
group by date(started_at)
order by date asc;
```
- "Trend: Run sources (30d)"
```sql
select date(started_at) as date,
   coalesce(source, 'unknown') as source,
   count(*) as run_count
from runs
where started_at >= now() - interval '30 days'
group by date(started_at), coalesce(source, 'unknown')
order by date asc;
```
- "Trend: AI tokens (30d)"
```sql
select date(analyzed_at) as date,
   sum(token_usage) as total_tokens
from ai_analysis_sessions
where analyzed_at >= now() - interval '30 days'
group by date(analyzed_at)
order by date asc;
```
- "Trend: Success rate (90d)"
```sql
select date(started_at) as date,
   round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 2) as success_rate_percent
from runs
where started_at >= now() - interval '90 days'
group by date(started_at)
order by date asc;
```

Breakdowns:
- "Users by activity" (table; show email, tier, activity_status, days_since_last_activity, last_activity_date)
```sql
select
   u.email,
   u.tier,
   u.subscription_status,
   u.created_at as signup_date,
   max(r.started_at) as last_activity_date,
   extract(day from now() - max(r.started_at)) as days_since_last_activity,
   count(distinct date(r.started_at)) as total_active_days,
   case
      when max(r.started_at) is null then 'never_active'
      when max(r.started_at) >= now() - interval '7 days' then 'active'
      when max(r.started_at) >= now() - interval '30 days' then 'inactive'
      else 'churned'
   end as activity_status
from "user" u
left join jobs j on j.user_id = u.id
left join job_endpoints je on je.job_id = j.id
left join runs r on r.endpoint_id = je.id
group by u.email, u.tier, u.subscription_status, u.created_at
order by last_activity_date desc nulls last;
```

- "Top jobs (by runs)" (table; show job_name, user_email, total_runs, successful_runs, failed_runs, last_run_at)
```sql
select
   j.id as job_id,
   j.name as job_name,
   u.email as user_email,
   count(r.id) as total_runs,
   count(r.id) filter (where r.status = 'success') as successful_runs,
   count(r.id) filter (where r.status = 'failed') as failed_runs,
   max(r.started_at) as last_run_at
from jobs j
join "user" u on u.id = j.user_id
left join job_endpoints je on je.job_id = j.id
left join runs r on r.endpoint_id = je.id
where j.archived_at is null
group by j.id, j.name, u.email
order by total_runs desc
limit 25;
```

- "Errors last 7d" (table; show date, status_code, error_summary, error_count, affected_jobs, affected_users)
```sql
select
   date(r.started_at) as date,
   r.status_code,
   left(r.error_message, 100) as error_summary,
   count(*) as error_count,
   count(distinct je.job_id) as affected_jobs,
   count(distinct j.user_id) as affected_users
from runs r
join job_endpoints je on je.id = r.endpoint_id
join jobs j on j.id = je.job_id
where r.status in ('failed', 'timeout')
   and r.started_at >= now() - interval '7 days'
group by date(r.started_at), r.status_code, left(r.error_message, 100)
order by date desc, error_count desc;
```

- "API keys status" (table; show api_key_name, email, tier, status, request_count, remaining, last_request, expires_at)
```sql
select
   ak.name as api_key_name,
   u.email,
   u.tier,
   case
      when ak.expires_at is not null and ak.expires_at < now() then 'expired'
      when not ak.enabled then 'disabled'
      else 'active'
   end as status,
   ak.request_count,
   ak.remaining,
   ak.last_request,
   ak.expires_at
from apikey ak
join "user" u on u.id = ak.user_id;
```

- "Subscriptions by status" (stacked bar; x=subscription_status, y=user_count, stack by tier)
```sql
select subscription_status, tier, count(*) as user_count
from "user"
group by subscription_status, tier;
```

- "AI usage by user (30d)" (bar; x=tokens_last_30d, y=email, color by tier)
```sql
select
   u.email,
   u.tier,
   coalesce(sum(a.token_usage) filter (where a.analyzed_at >= now() - interval '30 days'), 0) as tokens_last_30d
from "user" u
left join jobs j on j.user_id = u.id
left join job_endpoints je on je.job_id = j.id
left join ai_analysis_sessions a on a.endpoint_id = je.id
group by u.email, u.tier
order by tokens_last_30d desc;
```

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
