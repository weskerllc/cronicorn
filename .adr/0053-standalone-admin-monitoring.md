# Standalone Admin Monitoring with Metabase

**Date:** 2024-12-06
**Status:** Accepted

## Context

There was a need for cross-user admin analytics to track system-wide metrics such as:

1. **User Metrics**: Total users, activity by tier, signups, churn analysis
2. **AI Usage**: Token consumption per user, AI session tracking, cost monitoring
3. **Job & Endpoint Activity**: Success rates, execution volume, most active jobs
4. **Revenue Tracking**: Subscriptions by tier, MRR estimates, renewal tracking
5. **System Health**: Error rates, performance metrics, affected resources

The key requirements were:
- **Zero impact** on existing application code and infrastructure
- **Admin-only** access (not for end users)
- **Not over-engineered** - leverage existing open-source tools
- **Separate workspace** - keep admin tooling isolated from main app
- **Low maintenance** - minimal ongoing effort required

Early iterations integrated monitoring into the main docker-compose files and had extensive documentation (62KB across 6 files), which violated the principle of keeping admin tooling separate and non-cluttering.

## Decision

We implemented a **completely standalone admin monitoring solution** using Metabase as a separate service:

### Architecture

```
Application (unchanged) → PostgreSQL ← Metabase (standalone, optional)
```

### Implementation

**1. Isolated Admin Directory**
- All admin monitoring lives in `admin/` directory
- Completely separate from main application infrastructure
- No changes to main docker-compose files, .env.example, or package.json

**2. Standalone Docker Compose**
- `admin/docker-compose.admin.yml` - Independent compose file
- Connects to existing Cronicorn database (read-only recommended)
- Uses external network reference to main Cronicorn network
- Metabase uses embedded H2 database for its own configuration

**3. Simple Management Scripts**
- `start-admin.sh` - Start Metabase
- `stop-admin.sh` - Stop Metabase  
- `logs-admin.sh` - View logs
- `reset-admin.sh` - Reset all data

**4. Database Analytics Views (Migration 0018)**

Created 10 optimized PostgreSQL views for common admin queries:

| View | Purpose |
|------|---------|
| `admin_user_stats` | User counts with job/endpoint aggregates |
| `admin_user_run_stats` | Execution statistics per user |
| `admin_user_ai_stats` | AI token usage and session tracking |
| `admin_daily_metrics` | System-wide daily aggregates (90 days) |
| `admin_subscription_overview` | Revenue and subscription tracking |
| `admin_top_jobs` | Most active jobs (top 100) |
| `admin_run_source_stats` | Baseline vs AI scheduling analysis |
| `admin_error_analysis` | Error tracking (last 7 days) |
| `admin_user_activity` | User engagement and churn status |
| `admin_apikey_stats` | API key usage tracking |

These views:
- Provide pre-aggregated data for performance
- Use database-level joins and aggregations
- Are read-only and safe for production
- Can be queried directly from Metabase

**5. Concise Documentation**
- Single `admin/README.md` (2.7KB) with setup and key queries
- Removed 62KB of extensive documentation from initial implementation
- Focused on getting started quickly

### Technology Choice: Metabase

Selected Metabase (open-source BI tool) because:
- ✅ Zero application code changes required
- ✅ Self-hosted (data stays local, no external dependencies)
- ✅ User-friendly interface for non-technical users
- ✅ Direct PostgreSQL connection (read-only)
- ✅ Built-in visualization and dashboard capabilities
- ✅ Active community (50k+ GitHub stars)
- ✅ Free and open-source

Alternatives considered:
- ❌ Custom Admin API - Would require code changes and maintenance
- ❌ Grafana - More complex setup, less user-friendly for business metrics
- ❌ Cloud BI tools - Ongoing costs, data leaves infrastructure

## Consequences

### Positive

1. **Zero Application Impact**: No changes to docker-compose.yml, .env.example, or package.json
2. **Complete Isolation**: Admin monitoring in separate directory, won't clutter main app
3. **Easy to Remove**: Can delete `admin/` directory with no impact on application
4. **Low Maintenance**: Metabase is self-managing, views auto-update with data
5. **Production Ready**: Supports read-only database users for security
6. **Scalable**: Works from 10 to 10,000+ users with same setup
7. **Extensible**: Easy to add new views or custom queries as needed

### Neutral

1. **Separate Startup**: Admin monitoring requires explicit `cd admin && ./start-admin.sh`
2. **Database Views**: Migration 0018 creates views but they're read-only and harmless
3. **External Network**: Requires main Cronicorn stack to be running first

### Negative

1. **Manual Setup**: First-time database connection configuration in Metabase UI
2. **Network Configuration**: May need host.docker.internal or network settings depending on OS
3. **Extra Container**: Adds one more Docker container when running (but optional)

## Usage

```bash
# Start admin monitoring
cd admin
./start-admin.sh

# Access Metabase
open http://localhost:3030

# Example query
SELECT email, tier, tokens_last_30d
FROM admin_user_ai_stats
WHERE tokens_last_30d > 0
ORDER BY tokens_last_30d DESC
LIMIT 20;

# Stop when done
./stop-admin.sh
```

## Security Considerations

**Development**: Uses default database credentials for convenience

**Production**: Recommended setup with read-only user:
```sql
CREATE USER metabase_readonly WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO metabase_readonly;
```

## Implementation Files

- `admin/` - New standalone directory
  - `README.md` - Setup and usage guide
  - `docker-compose.admin.yml` - Standalone compose file
  - `start-admin.sh`, `stop-admin.sh`, `logs-admin.sh`, `reset-admin.sh` - Management scripts
- `packages/adapter-drizzle/migrations/0018_admin_analytics_views.sql` - Database views

## References

- Metabase: https://www.metabase.com/
- Admin monitoring discussion: [issue context]
- Commits: 3222d7a, fc650cc
