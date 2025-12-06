# Database Migrations

This directory contains Drizzle ORM migrations for the Cronicorn database schema.

## Migration Files

Migrations are numbered sequentially (e.g., `0001_*.sql`, `0002_*.sql`) and are applied in order.

## Special Migrations

### 0018_admin_analytics_views.sql

This migration creates **read-only database views** for admin monitoring and analytics. These views:

- Do NOT modify the schema or add/remove tables
- Provide pre-aggregated queries for admin insights
- Are designed for use with Metabase or similar BI tools
- Can be safely dropped and recreated without data loss

The views created:
- `admin_user_stats` - User overview with counts
- `admin_user_run_stats` - Execution statistics per user
- `admin_user_ai_stats` - AI usage and token tracking
- `admin_apikey_stats` - API key usage
- `admin_daily_metrics` - System-wide daily aggregates
- `admin_subscription_overview` - Subscription tracking
- `admin_top_jobs` - Most active jobs
- `admin_run_source_stats` - Scheduling source analysis
- `admin_error_analysis` - Error tracking
- `admin_user_activity` - User engagement tracking

**Note**: Views query existing tables and do not store data. They are purely for convenience in analytics queries.

## Running Migrations

Migrations are automatically run by the migrator service in Docker:

```bash
# Development
pnpm db:migrate

# Production (via Docker)
docker compose up migrator
```

## Generating New Migrations

Use Drizzle Kit to generate migrations from schema changes:

```bash
pnpm db:generate
```

This will create a new migration file based on changes in `src/schema.ts`.
