# Admin Monitoring Architecture

This document explains how the admin monitoring solution integrates with Cronicorn without affecting the application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cronicorn Application                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │   Web    │  │   API    │  │ Scheduler │  │AI Planner │  │
│  │  (5173)  │  │  (3333)  │  │           │  │           │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
│       │             │               │              │         │
│       └─────────────┴───────────────┴──────────────┘         │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │ Write Operations
                           ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  │    Database     │
                  │     (5432)      │
                  └────────┬────────┘
                           │ Read-Only
                           │ Queries
                           ▼
                  ┌─────────────────┐
                  │    Metabase     │
                  │  (Admin Only)   │
                  │     (3030)      │
                  └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Admin Users  │
                    │  (Browser)   │
                    └──────────────┘
```

## Key Design Principles

### 1. **Zero Application Impact**

Metabase runs as a completely separate service:
- No code changes to existing application
- No new dependencies in application packages
- No performance impact on user-facing features
- Can be stopped/started independently

### 2. **Optional Service**

Uses Docker Compose profiles:
```bash
# Normal startup (no Metabase)
docker compose up -d

# With admin monitoring
docker compose --profile admin up -d
```

### 3. **Read-Only Access**

Recommended production setup:
```sql
CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
```

Metabase cannot:
- Modify application data
- Delete records
- Update configurations
- Affect application performance

### 4. **Pre-Built Analytics**

Database views provide optimized queries:
- Aggregated at database level
- No N+1 query problems
- Efficient indexes on base tables
- Cached by Metabase

## Data Flow

### Application Operations (Unchanged)

```
User Request → Web UI → API → Database → Response
      │
      └→ Creates/Updates: users, jobs, endpoints, runs, ai_sessions
```

### Admin Monitoring (New, Isolated)

```
Admin → Metabase → Read-Only Query → Database Views → Dashboard
                                          │
                                          └→ Aggregates: users, runs, sessions
```

## Components

### 1. Docker Services

**Production (`docker-compose.yml`)**:
```yaml
services:
  # ... existing services (api, scheduler, etc.)
  
  metabase:
    image: metabase/metabase:v0.51.0
    profiles: [admin]  # Only starts with --profile admin
    ports: ["3030:3000"]
```

**Development (`docker-compose.dev.yml`)**:
Similar configuration with development-specific settings.

### 2. Database Views

**Location**: `packages/adapter-drizzle/migrations/0018_admin_analytics_views.sql`

**Purpose**: Pre-built, optimized queries for common admin needs

**Examples**:
- `admin_user_stats`: User counts and activity
- `admin_user_run_stats`: Execution metrics per user
- `admin_user_ai_stats`: AI token usage
- `admin_daily_metrics`: System-wide daily aggregates

**Benefits**:
- Single source of truth for metrics
- Optimized SQL executed at database level
- Easy to query from Metabase
- Can be updated via migrations

### 3. Helper Scripts

**`scripts/admin-monitoring.sh`**:
- Start/stop Metabase
- View logs
- Check status
- Reset data

**NPM Commands** (`package.json`):
```json
{
  "scripts": {
    "admin:start": "bash scripts/admin-monitoring.sh start",
    "admin:stop": "bash scripts/admin-monitoring.sh stop",
    "admin:logs": "bash scripts/admin-monitoring.sh logs",
    "admin:status": "bash scripts/admin-monitoring.sh status"
  }
}
```

### 4. Documentation

| File | Purpose |
|------|---------|
| `admin-monitoring-quickstart.md` | 3-minute setup guide |
| `admin-monitoring.md` | Comprehensive reference |
| `admin-queries.md` | SQL query examples |
| `admin-monitoring-architecture.md` | This document |

## Security Model

### Development

**Database Connection**:
- Host: `cronicorn-dev-db` (Docker network)
- Port: `5432`
- User: `user` (full access for convenience)

**Access Control**:
- Metabase admin account required
- No authentication on database (local dev only)

### Production

**Database Connection** (Recommended):
- Host: `cronicorn-db` (Docker network)
- Port: `5432`
- User: `metabase_readonly` (SELECT only)

**Access Control**:
- Metabase admin account required
- Read-only database user
- Network-level restrictions (optional)
- HTTPS only (recommended)

**User Creation**:
```sql
CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE db TO metabase_readonly;
GRANT USAGE ON SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO metabase_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO metabase_readonly;
```

## Performance Considerations

### Database Views

**Efficient Design**:
- Use JOINs at database level (not application)
- Leverage PostgreSQL query planner
- Aggregate data in SQL, not application code
- Existing indexes on base tables

**Example** (`admin_user_stats`):
```sql
-- Efficient: Single query with aggregations
SELECT 
  u.id,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT je.id) as total_endpoints
FROM "user" u
LEFT JOIN jobs j ON j.user_id = u.id
LEFT JOIN job_endpoints je ON je.job_id = j.id
GROUP BY u.id;
```

### Metabase Caching

Configure in Metabase:
- Cache duration: 15-30 minutes
- Reduces database load
- Acceptable staleness for admin metrics

### Query Optimization

**Best Practices**:
1. Use pre-built views instead of raw tables
2. Add date filters to limit data scanned
3. Use `LIMIT` for large result sets
4. Schedule reports instead of live queries

**Example**:
```sql
-- Good: Filtered, limited
SELECT * FROM admin_user_run_stats
WHERE runs_last_7d > 0
ORDER BY runs_last_7d DESC
LIMIT 20;

-- Avoid: Full table scan
SELECT * FROM runs;
```

## Scaling Considerations

### Small Deployments (< 1000 users)

Current setup works perfectly:
- Views are fast enough
- Metabase handles load easily
- No special configuration needed

### Medium Deployments (1000-10,000 users)

Recommendations:
- Enable Metabase caching (15-30 min)
- Add database indexes for custom queries
- Use date filters on large result sets
- Consider materialized views for heavy queries

### Large Deployments (> 10,000 users)

Consider:
- **Materialized Views**: Refresh hourly/daily
- **Separate Analytics Database**: Replicate for read-only queries
- **Data Warehouse**: ETL to Snowflake/BigQuery
- **Dedicated Metabase Server**: More resources

**Materialized View Example**:
```sql
CREATE MATERIALIZED VIEW admin_user_stats_mv AS
SELECT * FROM admin_user_stats;

-- Refresh daily
REFRESH MATERIALIZED VIEW admin_user_stats_mv;
```

## Maintenance

### Regular Tasks

**Weekly**:
- Review slow queries in Metabase
- Check for unused dashboards
- Monitor disk space (Metabase data)

**Monthly**:
- Update Metabase image version
- Review and optimize custom queries
- Clean up old dashboard versions

**As Needed**:
- Add indexes for frequently used filters
- Update views for new metrics
- Create new dashboards for new features

### Backup Strategy

**Metabase Configuration**:
- Stored in volume: `metabase-data`
- Backup: `docker run --rm -v metabase-data:/data -v $(pwd):/backup alpine tar czf /backup/metabase-backup.tar.gz /data`
- Restore: `docker run --rm -v metabase-data:/data -v $(pwd):/backup alpine tar xzf /backup/metabase-backup.tar.gz -C /`

**Database Views**:
- Defined in migrations
- Recreated on fresh deployments
- No separate backup needed

## Troubleshooting

### Metabase Won't Start

**Check**:
1. Port 3030 available: `lsof -i :3030`
2. Database is running: `docker compose ps db`
3. Volume permissions: `ls -la ../files/metabase-data/`
4. Logs: `pnpm admin:logs`

**Fix**:
```bash
# Reset Metabase
bash scripts/admin-monitoring.sh reset
pnpm admin:start
```

### Cannot Connect to Database

**Check**:
1. Hostname correct: `cronicorn-dev-db` or `cronicorn-db`
2. Credentials match `.env` file
3. Database accepts connections
4. Network connectivity

**Test**:
```bash
# From Metabase container
docker exec -it cronicorn-metabase nc -zv cronicorn-dev-db 5432
```

### Slow Queries

**Diagnose**:
1. Check query plan: `EXPLAIN ANALYZE <query>`
2. Look for missing indexes
3. Check data volume

**Fix**:
1. Use pre-built views
2. Add date filters
3. Enable caching
4. Add indexes if needed

## Migration Path

### From Development to Production

1. **Test in Development**:
   ```bash
   pnpm admin:start
   # Create dashboards and test queries
   ```

2. **Export Metabase Settings**:
   - Settings → Admin → Data Model → Export
   - Save dashboard URLs or screenshots

3. **Create Read-Only User**:
   ```sql
   CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
   ```

4. **Deploy to Production**:
   ```bash
   docker compose --profile admin up -d
   # Access at production URL
   # Recreate dashboards or import settings
   ```

### To Alternative BI Tools

If you prefer a different tool:

1. **Use Existing Views**: All views work with any SQL-compatible tool
2. **Export Queries**: Copy SQL from Metabase
3. **Replicate Dashboards**: Use saved queries as reference
4. **Update Documentation**: Document new tool setup

**Compatible Tools**:
- Grafana (with PostgreSQL plugin)
- Apache Superset
- Redash
- Tableau
- Power BI
- Any tool with PostgreSQL connector

## Summary

The admin monitoring solution provides:

✅ **Zero impact** on application code
✅ **Optional** - only runs when needed
✅ **Secure** - read-only database access
✅ **Efficient** - pre-built optimized views
✅ **Flexible** - works with any BI tool
✅ **Maintainable** - simple architecture
✅ **Scalable** - can grow with your needs

All without changing a single line of application code! 🎉
