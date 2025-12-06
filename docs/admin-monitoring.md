# Admin Monitoring with Metabase

This document describes how to set up and use the admin monitoring dashboard for gaining insights across all users in your Cronicorn instance.

## Overview

The admin monitoring solution uses **Metabase**, an open-source business intelligence tool, to provide comprehensive analytics across all users without requiring any code changes to the application.

### Key Features

- ✅ **Zero code impact**: Runs as a separate Docker container
- ✅ **Read-only database access**: Safe to use in production
- ✅ **Comprehensive metrics**: Users, jobs, runs, AI usage, and more
- ✅ **Custom dashboards**: Build visualizations for your specific needs
- ✅ **SQL queries**: Direct access to pre-built analytics views
- ✅ **Optional service**: Only runs when explicitly started

## Quick Start

### Development Environment

1. **Start the database and Metabase**:
   ```bash
   docker compose -f docker-compose.dev.yml --profile admin up -d
   ```

2. **Access Metabase**:
   Open http://localhost:3030 in your browser

3. **Initial Setup** (first time only):
   - Choose "Let's get started"
   - Create admin account (save these credentials!)
   - Select "I'll add my data later"
   - Click "Take me to Metabase"

4. **Add Database Connection**:
   - Click the gear icon (Settings) → Admin Settings → Databases → Add database
   - Select **PostgreSQL** as database type
   - Configure connection:
     ```
     Display name: Cronicorn
     Host: cronicorn-dev-db (or localhost if running locally)
     Port: 5432
     Database name: db
     Username: user
     Password: password
     ```
   - Click "Save"

### Production Environment

1. **Update your `.env` file** (optional):
   ```bash
   # Metabase port (default: 3030)
   METABASE_PORT=3030
   
   # Optional: Set admin email for notifications
   # METABASE_ADMIN_EMAIL=admin@yourdomain.com
   ```

2. **Start services with admin profile**:
   ```bash
   docker compose --profile admin up -d
   ```

3. **Setup read-only database user** (recommended for production):
   ```sql
   -- Connect to your database and run:
   CREATE USER metabase_readonly WITH PASSWORD 'secure_password_here';
   GRANT CONNECT ON DATABASE db TO metabase_readonly;
   GRANT USAGE ON SCHEMA public TO metabase_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;
   GRANT SELECT ON ALL VIEWS IN SCHEMA public TO metabase_readonly;
   
   -- Grant access to future tables/views
   ALTER DEFAULT PRIVILEGES IN SCHEMA public 
     GRANT SELECT ON TABLES TO metabase_readonly;
   ```

4. **Configure Metabase to use the read-only user**:
   - In Metabase: Settings → Admin Settings → Databases → Cronicorn → Edit
   - Update username to `metabase_readonly`
   - Update password to the secure password you set
   - Save changes

## Pre-built Analytics Views

The system includes several database views specifically designed for admin monitoring. These views aggregate data efficiently and are ready to use in Metabase.

### Available Views

1. **`admin_user_stats`**: User overview with job and endpoint counts
   - Total/active/paused endpoints per user
   - User tier and subscription status
   - Account creation date

2. **`admin_user_run_stats`**: Execution statistics per user
   - Total runs, success/failure counts
   - Success rate percentage
   - Average duration
   - Activity metrics (last 24h, 7d, 30d)

3. **`admin_user_ai_stats`**: AI usage analytics per user
   - Total AI sessions and tokens consumed
   - Average tokens per session
   - Recent activity (24h, 7d, 30d)
   - Token usage in last 30 days

4. **`admin_apikey_stats`**: API key usage tracking
   - Request counts per key
   - Rate limit status
   - Key expiration tracking

5. **`admin_daily_metrics`**: System-wide daily aggregates
   - Active endpoints per day
   - Total runs and success rates
   - AI sessions and token usage
   - Last 90 days of data

6. **`admin_subscription_overview`**: Revenue and subscription tracking
   - User counts by tier and status
   - New users in last 30 days
   - Active vs expired subscriptions

7. **`admin_top_jobs`**: Most active jobs across all users
   - Top 100 jobs by run count
   - Success/failure statistics
   - User and tier information

8. **`admin_run_source_stats`**: Baseline vs AI-scheduled runs
   - Run source distribution over time
   - Success rates by source type

9. **`admin_error_analysis`**: Error tracking and debugging
   - Error counts by type and date
   - Affected endpoints, jobs, and users
   - Last 7 days of errors

10. **`admin_user_activity`**: User engagement and churn analysis
    - Last activity date per user
    - Days since last activity
    - Activity status classification (active/inactive/churned/never_active)

## Building Your First Dashboard

### Example: User Overview Dashboard

1. **Create a new dashboard**:
   - Click "+ New" → Dashboard
   - Name it "User Overview"

2. **Add user count card**:
   - Click "+" → Question → Simple question
   - Select "Cronicorn" database → "Admin User Stats" table
   - Summarize: Count → Save as "Total Users"
   - Add to dashboard

3. **Add users by tier chart**:
   - New Question → Simple question
   - Table: Admin User Stats
   - Summarize: Count, Group by: Tier
   - Visualization: Bar chart
   - Save as "Users by Tier" → Add to dashboard

4. **Add recent activity**:
   - New Question → Simple question
   - Table: Admin User Run Stats
   - Show: Email, Runs Last 24h, Runs Last 7d, Success Rate Percent
   - Filter: Runs Last 24h > 0
   - Sort by: Runs Last 24h descending
   - Save as "Most Active Users (24h)" → Add to dashboard

### Example SQL Queries

You can also write custom SQL queries in Metabase:

**Total AI token usage by user in the last 30 days**:
```sql
SELECT 
  email,
  tier,
  tokens_last_30d,
  ai_sessions_last_30d
FROM admin_user_ai_stats
WHERE tokens_last_30d > 0
ORDER BY tokens_last_30d DESC
LIMIT 20;
```

**Daily active users trend**:
```sql
SELECT 
  DATE(r.started_at) as date,
  COUNT(DISTINCT j.user_id) as active_users
FROM runs r
JOIN job_endpoints je ON je.id = r.endpoint_id
JOIN jobs j ON j.id = je.job_id
WHERE r.started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(r.started_at)
ORDER BY date;
```

**Revenue by tier (users with active subscriptions)**:
```sql
SELECT 
  tier,
  COUNT(*) as subscriber_count,
  COUNT(CASE WHEN subscription_ends_at > NOW() THEN 1 END) as currently_active
FROM "user"
WHERE subscription_status = 'active'
GROUP BY tier;
```

## Common Dashboard Ideas

### Executive Dashboard
- Total users (by tier)
- Monthly recurring revenue
- Daily/weekly active users
- System health (success rates)
- Top users by activity

### Operations Dashboard
- Active endpoints count
- Run success rate (24h, 7d)
- Error analysis
- AI token consumption
- API rate limit usage

### Growth Dashboard
- New signups trend
- User activation rate
- Feature adoption (jobs, endpoints, AI)
- Churn analysis

### Cost Management Dashboard
- AI token usage by user
- API request volumes
- Resource utilization trends
- Cost per tier analysis

## Best Practices

### Performance

1. **Use pre-built views**: The analytics views are optimized for performance
2. **Limit date ranges**: Query recent data (30-90 days) for faster results
3. **Cache results**: Set appropriate cache durations in Metabase (15-30 minutes)
4. **Schedule reports**: Use Metabase's scheduling instead of live queries

### Security

1. **Use read-only database user**: Never give Metabase write access
2. **Restrict Metabase access**: Only admin team should have Metabase login
3. **Enable HTTPS**: In production, access Metabase via HTTPS only
4. **Regular backups**: Backup Metabase's configuration database

### Maintenance

1. **Monitor Metabase logs**: Check for slow queries or errors
2. **Update Metabase**: Keep the image version current
3. **Review dashboards**: Remove unused dashboards and queries
4. **Optimize queries**: Profile slow queries and add indexes if needed

## Troubleshooting

### Cannot connect to database

**Problem**: Metabase shows "connection refused" error

**Solutions**:
- Ensure database container is running: `docker compose ps`
- Check database host name matches compose service name
- Verify network connectivity between containers
- Check credentials match your `.env` file

### Slow queries

**Problem**: Dashboards take too long to load

**Solutions**:
- Use the pre-built views instead of joining raw tables
- Add date filters to limit data scanned
- Enable caching in Metabase (Settings → Admin → Caching)
- Consider adding database indexes for custom queries

### Metabase won't start

**Problem**: Container restarts or fails to start

**Solutions**:
- Check logs: `docker compose logs metabase`
- Ensure port 3030 is available: `lsof -i :3030`
- Verify volume permissions: `ls -la ../files/metabase-data/`
- Clear data and restart: `docker compose down -v && docker compose --profile admin up -d`

## Stopping Metabase

When you don't need admin monitoring:

**Development**:
```bash
docker compose -f docker-compose.dev.yml down metabase
```

**Production**:
```bash
docker compose down metabase
```

To remove all data and start fresh:
```bash
docker compose down
rm -rf ../files/metabase-data/
docker compose --profile admin up -d
```

## Advanced: Integrating with External Tools

### Embedding Dashboards

Metabase supports embedding dashboards in other applications:
1. Settings → Admin → Embedding
2. Enable embedding and generate a secret key
3. Use the Metabase embedding SDK or iframe

### API Access

Metabase provides a REST API for programmatic access:
- Documentation: https://www.metabase.com/docs/latest/api-documentation
- Use for automated reports, alerts, or custom integrations

### Alerts and Notifications

Set up automated alerts for critical metrics:
1. Open a question/chart
2. Click the bell icon
3. Configure alert conditions
4. Set up email/Slack notifications

## Additional Resources

- **Metabase Documentation**: https://www.metabase.com/docs/latest/
- **Metabase Learn**: https://www.metabase.com/learn/
- **SQL Tutorial**: https://www.metabase.com/learn/sql-questions/
- **Dashboard Best Practices**: https://www.metabase.com/learn/dashboards/

## Support

For issues specific to:
- **Metabase setup**: Check Metabase documentation
- **Database views**: Review the migration file `0018_admin_analytics_views.sql`
- **Docker configuration**: Check `docker-compose.yml` and `docker-compose.dev.yml`
- **Application data**: Refer to the main Cronicorn documentation

## Security Note

⚠️ **Important**: Admin monitoring provides access to data across ALL users. Only give Metabase access to trusted administrators. In production:

1. Use a separate read-only database user
2. Enable authentication/authorization
3. Use HTTPS only
4. Regularly review access logs
5. Keep Metabase updated
6. Consider network-level restrictions (firewall, VPN)
