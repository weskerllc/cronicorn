# Admin Monitoring - Quick Start Guide

Get admin insights across all users in 3 minutes.

## 🚀 Quick Start (3 Steps)

### Step 1: Start Metabase

```bash
pnpm admin:start
```

Or using Docker directly:
```bash
docker compose --profile admin up -d
```

### Step 2: Open Metabase

Visit: **http://localhost:3030**

On first visit, you'll see the setup wizard:
1. Click "Let's get started"
2. Create your admin account (save these credentials!)
3. Skip the "Tell us about yourself" step
4. Click "I'll add my data later"
5. Click "Take me to Metabase"

### Step 3: Connect to Database

1. Click the **gear icon** (⚙️) in top right → "Admin Settings"
2. Click "Databases" in left sidebar
3. Click "Add database" button
4. Configure:

   **Development**:
   ```
   Database type: PostgreSQL
   Display name: Cronicorn
   Host: cronicorn-dev-db
   Port: 5432
   Database name: db
   Username: user
   Password: password
   ```

   **Production** (recommended: use read-only user):
   ```
   Database type: PostgreSQL
   Display name: Cronicorn
   Host: cronicorn-db
   Port: 5432
   Database name: db
   Username: metabase_readonly
   Password: <your secure password>
   ```

5. Click "Save"

## 📊 Your First Query

1. Click "+ New" in top right
2. Select "SQL query"
3. Paste this query:

```sql
SELECT * FROM admin_user_stats
ORDER BY total_endpoints DESC
LIMIT 10;
```

4. Click "Get Answer"
5. Save as "Top 10 Users by Endpoints"

## 🎯 Pre-Built Views

Explore these ready-to-use views (no SQL needed):

| View Name | What It Shows |
|-----------|---------------|
| `admin_user_stats` | Users with job/endpoint counts |
| `admin_user_run_stats` | Execution stats per user |
| `admin_user_ai_stats` | AI token usage per user |
| `admin_daily_metrics` | Daily system metrics (last 90 days) |
| `admin_subscription_overview` | Revenue by tier and status |
| `admin_top_jobs` | Most active jobs (top 100) |
| `admin_error_analysis` | Recent errors (last 7 days) |
| `admin_user_activity` | User engagement/churn analysis |

## 📈 Example Dashboards

### Executive Dashboard

Create a new dashboard with these cards:

**1. Total Users**
```sql
SELECT COUNT(*) FROM "user";
```

**2. Users by Tier**
```sql
SELECT tier, COUNT(*) as count
FROM "user"
GROUP BY tier;
```
*Visualization: Pie chart*

**3. Active Users (Last 7 Days)**
```sql
SELECT COUNT(DISTINCT user_id)
FROM admin_user_run_stats
WHERE runs_last_7d > 0;
```

**4. System Success Rate**
```sql
SELECT 
  ROUND(AVG(success_rate_percent), 2) as avg_success_rate
FROM admin_daily_metrics
WHERE date >= NOW() - INTERVAL '7 days';
```

**5. AI Token Usage (Last 30 Days)**
```sql
SELECT SUM(tokens_last_30d) as total_tokens
FROM admin_user_ai_stats;
```

### Operations Dashboard

**1. Runs Today**
```sql
SELECT total_runs 
FROM admin_daily_metrics 
WHERE date = CURRENT_DATE;
```

**2. Active Endpoints**
```sql
SELECT COUNT(*) 
FROM job_endpoints 
WHERE archived_at IS NULL 
  AND (paused_until IS NULL OR paused_until < NOW());
```

**3. Error Rate (Last 24h)**
```sql
SELECT 
  COUNT(CASE WHEN status = 'failed' THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM runs
WHERE started_at >= NOW() - INTERVAL '24 hours';
```

**4. Recent Errors**
```sql
SELECT * FROM admin_error_analysis
WHERE date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY date DESC, error_count DESC
LIMIT 10;
```

## 🛑 Stop Metabase

When you're done:

```bash
pnpm admin:stop
```

Or:
```bash
docker compose down metabase
```

## 🔍 View Logs

```bash
pnpm admin:logs
```

## 🔄 Reset Everything

To start fresh (deletes all Metabase data):

```bash
bash scripts/admin-monitoring.sh reset
```

## 📚 Learn More

- **Full guide**: [docs/admin-monitoring.md](./admin-monitoring.md)
- **Query examples**: [docs/admin-queries.md](./admin-queries.md)
- **Metabase docs**: https://www.metabase.com/docs/

## 🔐 Production Setup

For production, create a read-only database user:

```sql
-- Connect to your database
CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE db TO metabase_readonly;
GRANT USAGE ON SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO metabase_readonly;

-- For future tables/views
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO metabase_readonly;
```

Then use these credentials in Metabase connection settings.

## 🆘 Troubleshooting

**Can't connect to database?**
- Check database is running: `docker compose ps`
- Verify credentials match your `.env` file
- Use correct hostname: `cronicorn-dev-db` (dev) or `cronicorn-db` (prod)

**Metabase won't start?**
- Check port 3030 is available: `lsof -i :3030`
- View logs: `pnpm admin:logs`
- Try reset: `bash scripts/admin-monitoring.sh reset`

**Slow queries?**
- Use the pre-built views instead of raw tables
- Add date filters to limit data scanned
- Enable caching in Metabase settings

## 💡 Tips

1. **Save frequently used queries** as "Questions" for quick access
2. **Create dashboards** by combining multiple questions
3. **Set up alerts** on critical metrics (success rate, errors, etc.)
4. **Use date filters** to improve query performance
5. **Schedule reports** instead of manual checking

---

**That's it!** You now have full admin monitoring with zero code changes. 🎉

For advanced features and more examples, see the [full documentation](./admin-monitoring.md).
