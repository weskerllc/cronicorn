---
id: use-cases
title: Use Cases & Examples
description: Real-world scenarios showing how Cronicorn adapts to your application needs
tags:
  - user
  - examples
sidebar_position: 3
mcp:
  uri: file:///docs/use-cases.md
  mimeType: text/markdown
  priority: 0.75
  lastModified: 2026-02-03T00:00:00Z
---

# Use Cases & Examples

Cronicorn's adaptive scheduling shines in scenarios where static cron jobs fall short. Here are real-world examples across different industries.

## E-Commerce: Flash Sale Monitoring

You're running a Black Friday sale and traffic spikes 5× normal volume. Your checkout system needs close monitoring, but you don't want to manually adjust schedules every hour.

**Setup:**

| Endpoint | Baseline | Purpose |
|----------|----------|---------|
| Traffic Monitor | Every 5 min | Track visitors and page load times |
| Order Processor Health | Every 3 min | Monitor checkout performance |
| Inventory Sync Check | Every 10 min | Ensure stock accuracy |

**What Happens:**

- **9am (sale starts)**: Traffic surges detected. AI tightens monitoring to every 30 seconds for the next hour.
- **10am (struggling)**: Slow pages detected. AI activates cache warm-up (one-shot) and increases monitoring.
- **11am (recovering)**: Performance stabilizes. AI gradually relaxes back to baseline over 30 minutes.
- **2pm (stable)**: All endpoints return to normal 3-10 minute intervals.

**Result**: Your team gets real-time visibility during the surge without manual schedule changes. The system backs off automatically when things stabilize.


## Marketing: Content Publishing & Engagement Tracking

You publish blog posts and want to monitor engagement closely for the first 24 hours, then back off to daily checks.

**Setup:**

| Endpoint | Baseline | Behavior |
|----------|----------|----------|
| Publish Post | Cron: "0 9 * * MON" | Publishes every Monday at 9am |
| Track Analytics | Every 30 min | Page views, time on page |
| Check Email Opens | Every hour | Newsletter engagement |
| Promote Top Posts | Paused | Activates when engagement crosses threshold |

**What Happens:**

- **Monday 9am**: Post publishes on schedule
- **9am-6pm**: AI tightens analytics tracking to every 5 minutes (fresh content gets attention)
- **Tuesday-Friday**: AI relaxes to hourly checks (engagement is stable)
- **Friday**: High engagement detected, AI activates promotional boost endpoint
- **Next Monday**: Analytics reset to baseline 30 min intervals

**Result**: You get real-time engagement data when it matters most, without paying for excessive API calls once traffic stabilizes.

## DevOps: Infrastructure Health & Auto-Remediation

Your SaaS platform runs background monitoring that should attempt automatic fixes before paging engineers at 2am.

**Setup:**

- **Health checks** run continuously: API latency, error rates, database connections, queue depth
- **Investigation endpoints** start paused: slow query logs, memory profilers, distributed traces
- **Remediation actions** fire as one-shots: restart unhealthy pods, flush caches, scale workers
- **Alerts** escalate intelligently: Slack ops → Slack support → PagerDuty on-call

**What Happens:**

1. Database latency increases above threshold
2. AI activates slow query investigation (was paused)
3. Investigation identifies problematic query
4. System fires one-shot remediation to kill long-running queries
5. If fixed: Alert sent to Slack, investigation pauses again
6. If not fixed after 3 attempts: Page on-call engineer

**Result**: Most issues self-heal without waking anyone up. Engineers only get paged when automation can't resolve the problem.

## Data Engineering: ETL Pipeline Coordination

You run nightly data syncs from Salesforce, transform the data, and load it into your warehouse. The transformation step should only run after extraction succeeds.

**Setup:**

| Endpoint | Schedule | Notes |
|----------|----------|-------|
| Extract from Salesforce | Cron: "0 2 * * *" | Daily at 2am |
| Transform Records | Paused | Activates only after extraction |
| Load to Warehouse | Paused | Activates after transformation |
| Check Pipeline Lag | Every 2 min | Monitors data freshness |

**What Happens:**

- **2:00am**: Salesforce extraction starts
- **2:15am**: Extraction completes successfully. AI activates transformation endpoint for immediate one-shot run.
- **2:20am**: Transformation finishes. AI activates warehouse load for one-shot run.
- **2:25am**: Full pipeline complete. Investigation endpoints pause until tomorrow.
- **If extraction fails**: Transformation and loading stay paused. Alert fires.

**Result**: You coordinate complex dependencies without writing custom orchestration code. Each step waits for upstream success.

## SaaS Operations: Usage Monitoring & Billing

You need to track customer API usage hourly, send quota warnings at specific thresholds, and generate invoices monthly.

**Setup:**

- **Usage tracking**: Aggregate API calls every hour
- **Quota monitoring**: Check for overages every 10 minutes
- **Warning emails**: One-shot sends at 80%, 90%, 100% of quota
- **Invoice generation**: Cron runs on 1st of each month
- **Payment reminders**: Escalating sequence (3 days → 7 days → 14 days → 30 days overdue)

**What Happens:**

- **Throughout month**: Usage tracked hourly, quota checked every 10 min
- **Customer approaching limit**: AI fires one-shot warning emails at each threshold
- **1st of month at midnight**: Invoices generated for all accounts
- **Payment not received**: Reminder sequence starts automatically (paused between emails)
- **Payment received**: AI pauses further reminders

**Result**: Billing runs like clockwork with minimal manual intervention. Customers get timely warnings, and dunning sequences are fully automated.

## Web Scraping: Competitive Price Monitoring

You track competitor pricing across multiple sites, but need to respect their rate limits and adapt when they change.

**Setup:**

| Endpoint | Baseline | Constraints |
|----------|----------|-------------|
| Scrape Prices | Every 4 hours | Min: 30 min, Max: 12 hours |
| Validate Data | After each scrape | Checks for blocks/CAPTCHAs |
| Check Proxy Health | Every 5 min | Monitors rotating proxies |
| Alert Price Drop | Paused | Fires when competitor drops price |

**What Happens:**

- **Normal operation**: Scraping every 4 hours
- **Rate limit warning detected**: AI backs off to every 6 hours for next day
- **Competitor sale detected**: AI tightens to every 30 minutes (respects min interval)
- **CAPTCHA encountered**: Validation fails, AI pauses scraping for 2 hours
- **Proxy recovery**: Health check passes, AI resumes scraping

**Result**: You adapt to site changes automatically. Scrapers respect rate limits, pause when blocked, and intensify during competitor sales.

## Configuration Examples

These examples show exactly how to configure endpoints with descriptions for common scenarios.

### Health Monitoring with Degraded State Detection

**Scenario**: Monitor a service and poll faster when degraded.

```
Endpoint: "api-health-check"
  URL: https://api.example.com/health
  Baseline: 5 minutes (300000ms)
  Min: 30 seconds (30000ms)
  Max: 15 minutes (900000ms)

  Description:
  "Monitors API health. Poll more frequently when status is degraded
  or error_rate exceeds 5%. Return to baseline when metrics normalize.
  If latency_ms exceeds 2000, investigate more closely."
```

**Response body:**
```json
{
  "status": "degraded",
  "error_rate_pct": 8.5,
  "latency_ms": 1200,
  "healthy": false
}
```

**AI behavior**: Sees `status: degraded` and `error_rate_pct: 8.5` → tightens to 30 seconds.

---

### Data Sync with Volume-Based Polling

**Scenario**: Sync data more frequently when there's a backlog.

```
Endpoint: "data-sync-status"
  URL: https://api.example.com/sync/status
  Baseline: 10 minutes (600000ms)
  Min: 30 seconds (30000ms)
  Max: 30 minutes (1800000ms)

  Description:
  "Checks data sync status. Poll frequently when records_pending is high
  (more than 1000). Slow down when caught up (under 100 pending).
  Include estimated completion time in response."
```

**Response body:**
```json
{
  "records_pending": 15000,
  "sync_rate_per_minute": 500,
  "estimated_completion_minutes": 30,
  "status": "syncing"
}
```

**AI behavior**: Sees large backlog → tightens polling. Sees caught up → returns to baseline.

---

### Multi-Endpoint Recovery Workflow

**Scenario**: Health check triggers recovery action when errors detected.

```
Job: "Service Health Monitor"

Endpoint 1: "health-check"
  URL: https://api.example.com/health
  Baseline: 5 minutes (300000ms)
  Min: 30 seconds (30000ms)

  Description:
  "Monitors service health. When errors are detected or status is 'error',
  the trigger-recovery endpoint should run immediately. After recovery
  triggers, continue monitoring to verify service restoration."

Endpoint 2: "trigger-recovery"
  URL: https://api.example.com/admin/restart
  Method: POST
  Baseline: 24 hours (86400000ms)
  Min: 5 minutes (300000ms)

  Description:
  "Recovery action that restarts the service. Should only run when
  health-check shows errors. After triggering, wait at least 5 minutes
  before allowing another recovery attempt."
```

**health-check response:**
```json
{
  "status": "error",
  "error_count": 15,
  "last_error": "Connection refused",
  "needs_recovery": true
}
```

**AI behavior**: Sees `needs_recovery: true` in health-check → triggers recovery endpoint → waits for cooldown.

---

### System Load with Inverse Scaling

**Scenario**: Poll less frequently when system is under high load.

```
Endpoint: "system-load-monitor"
  URL: https://api.example.com/metrics/load
  Baseline: 1 minute (60000ms)
  Min: 10 seconds (10000ms)
  Max: 5 minutes (300000ms)

  Description:
  "Monitors system load. INVERSE SCALING: when load is HIGH, poll LESS
  frequently to reduce overhead. When load is LOW, poll MORE frequently
  since the system has capacity.
  - Load > 80%: poll every 5 minutes (minimal)
  - Load 50-80%: poll every 2-3 minutes
  - Load < 50%: poll every 30 seconds (aggressive)"
```

**Response body:**
```json
{
  "load_pct": 85,
  "cpu_pct": 82,
  "memory_pct": 78,
  "recommendation": "reduce_polling"
}
```

**AI behavior**: Sees high load → extends interval to reduce overhead.

---

### Volatile System with Stability Focus

**Scenario**: Monitor volatile metrics without overreacting.

```
Endpoint: "volatile-metrics"
  URL: https://api.example.com/metrics
  Baseline: 1 minute (60000ms)
  Min: 30 seconds (30000ms)
  Max: 2 minutes (120000ms)

  Description:
  "Monitors volatile system metrics. Data fluctuates frequently.
  PRIORITIZE STABILITY - don't overreact to momentary spikes.
  Only adjust for sustained state changes (5+ minutes).
  When uncertain, maintain current interval.
  Response includes smoothed averages - use those, not instant values."
```

**Response body:**
```json
{
  "instant_value": 523,
  "avg_5min": 487,
  "avg_1hr": 502,
  "trend": "stable",
  "within_normal_range": true
}
```

**AI behavior**: Sees `trend: stable` and smoothed averages → maintains current interval.

---

## Common Patterns

### Adaptive Monitoring Frequency

Start with a baseline, tighten when issues detected, relax when stable:

```
Baseline: Every 5 minutes
During issues: Every 30 seconds (respects min interval)
When stable: Every 15 minutes (respects max interval)
```

### Conditional Endpoint Activation

Keep expensive operations paused until needed:

```
Investigation endpoints: Paused by default
Activate: When health checks fail
Deactivate: When issues resolve or timeout expires
```

### One-Shot Actions with Cooldowns

Fire immediate actions that shouldn't repeat too quickly:

```
Cache warm-up: Fire once now, don't repeat for 15 minutes
Alert escalation: Send once, pause for 1 hour before next
Scale workers: Trigger immediately, cooldown for 20 minutes
```

### Calendar-Based + Adaptive Hybrid

Use cron for time-sensitive tasks, intervals for everything else:

```
Daily reports: Cron "0 9 * * *" (always 9am)
Monitoring: Interval 300000ms (adapts between min/max)
Monthly billing: Cron "0 0 1 * *" (1st of month)
```

## When to Use Cronicorn

**Great fit:**
- You adjust cron schedules manually based on metrics
- You need backoff logic after failures
- You want tight monitoring during critical periods
- You coordinate multiple dependent endpoints
- You respect rate limits that vary by usage

**Probably overkill:**
- Simple daily backup at 2am (basic cron is fine)
- Completely static schedules that never change
- Sub-second precision required (use a real-time system)

---

## See Also

- **[Quick Start](./quick-start.md)** - Create your first job
- **[Core Concepts](./core-concepts.md)** - Understanding scheduling fundamentals
- **[Coordinating Multiple Endpoints](./technical/coordinating-multiple-endpoints.md)** - Advanced workflow patterns
