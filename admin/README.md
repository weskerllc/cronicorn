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
```

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
