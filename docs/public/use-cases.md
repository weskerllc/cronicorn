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

These examples show exactly how to configure endpoints for common scenarios. Each includes the JSON configuration, expected response body, and the AI's step-by-step decision process. Configurations use the JSON field names accepted by the Web UI, MCP Server, and HTTP API — see [Core Concepts](./core-concepts.md#endpoint-configuration-schema-json) for the full schema.

> **How to apply these examples:** The configurations shown below can be applied through any interface — the Web UI, MCP Server, or HTTP API. See [Core Concepts](./core-concepts.md#endpoint-configuration-schema-json) for details.

### Health Monitoring with Degraded State Detection

**Scenario**: Monitor a service and automatically increase polling from 5 minutes to 30 seconds when the HTTP response indicates a degraded state.

**Job:** `{ "name": "API Health Monitoring" }`

**Endpoint:**
```json
{
  "name": "api-health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 900000,
  "timeoutMs": 10000,
  "description": "Monitors API health. Poll more frequently (every 30 seconds) when status is degraded or error_rate_pct exceeds 5%. Return to baseline when status is healthy and error_rate_pct drops below 2%. If latency_ms exceeds 2000, tighten to 1-minute intervals."
}
```

**Response body your endpoint should return:**
```json
{
  "status": "degraded",
  "error_rate_pct": 8.5,
  "latency_ms": 1200,
  "healthy": false,
  "timestamp": "2026-02-03T12:05:00Z"
}
```

**AI behavior step-by-step:**
1. AI calls `get_latest_response()` → sees `status: "degraded"` and `error_rate_pct: 8.5`
2. AI calls `get_response_history(limit=5)` → confirms error_rate rising over multiple readings
3. AI reads description: "Poll more frequently when status is degraded or error_rate_pct exceeds 5%"
4. AI calls `propose_interval(intervalMs=30000, ttlMinutes=60, reason="Status degraded, error rate 8.5% exceeds 5% threshold")`
5. When status returns to healthy: AI calls `clear_hints()` → returns to 5-minute baseline

---

### Data Sync with Volume-Based Polling

**Scenario**: Sync data more frequently when there's a large backlog, relax when caught up.

```json
{
  "name": "data-sync-status",
  "url": "https://api.example.com/sync/status",
  "method": "GET",
  "baselineIntervalMs": 600000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 1800000,
  "timeoutMs": 15000,
  "description": "Checks data sync status. Poll every 30 seconds when records_pending exceeds 1000. Poll every 2 minutes when records_pending is 100-1000. Return to 10-minute baseline when records_pending drops below 100 (caught up). Monitor sync_rate_per_minute - if it drops below 50, tighten to track potential stall."
}
```

**Response body your endpoint should return:**
```json
{
  "records_pending": 15000,
  "sync_rate_per_minute": 500,
  "estimated_completion_minutes": 30,
  "status": "syncing",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**AI behavior step-by-step:**
1. AI calls `get_latest_response()` → sees `records_pending: 15000`
2. AI reads description: "Poll every 30 seconds when records_pending exceeds 1000"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="15000 records pending, above 1000 threshold")`
4. When caught up (`records_pending: 50`): AI calls `clear_hints()` → returns to 10-minute baseline

---

### Multi-Endpoint Recovery Workflow

**Scenario**: Health check detects errors and triggers automated recovery. Recovery respects cooldown. Returns to normal when service recovers.

**Job:** `{ "name": "Service Recovery Automation" }`

**Endpoints (both in the same job for sibling visibility):**

```json
{
  "name": "health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "timeoutMs": 10000,
  "description": "Monitors service health. When status is error or needs_recovery is true, the trigger-recovery sibling should run immediately. During errors, tighten monitoring to 30 seconds. Return to 5-minute baseline when status is ok and error_count is 0."
}
```

```json
{
  "name": "trigger-recovery",
  "url": "https://api.example.com/admin/restart",
  "method": "POST",
  "baselineIntervalMs": 86400000,
  "minIntervalMs": 300000,
  "timeoutMs": 30000,
  "description": "Recovery action that restarts the service. Only run when health-check sibling shows status error or needs_recovery is true. After triggering, wait at least 5 minutes (minInterval). Return to 24-hour baseline when health-check shows ok. Maximum 3 recovery attempts before pausing 1 hour."
}
```

**health-check response (error state):**
```json
{
  "status": "error",
  "error_count": 15,
  "last_error": "Connection refused",
  "needs_recovery": true,
  "timestamp": "2026-02-03T12:05:00Z"
}
```

**health-check response (after recovery):**
```json
{
  "status": "ok",
  "error_count": 0,
  "needs_recovery": false,
  "recovered_at": "2026-02-03T12:07:00Z",
  "timestamp": "2026-02-03T12:08:00Z"
}
```

**AI behavior step-by-step:**
1. AI analyzes health-check → calls `get_latest_response()` → sees `needs_recovery: true`
2. AI calls `get_sibling_latest_responses()` → sees trigger-recovery on 24h baseline
3. AI calls `propose_next_time()` on trigger-recovery for immediate run
4. AI calls `propose_interval(intervalMs=30000)` on health-check for close monitoring
5. After recovery: AI calls `clear_hints()` on both → returns to baseline schedules
6. If 3 recovery attempts fail: AI calls `pause_until(now + 1 hour)` on trigger-recovery

---

### System Load with Inverse Scaling

**Scenario**: Poll less frequently when system is under high load (to reduce overhead), more frequently when load is low.

```json
{
  "name": "system-load-monitor",
  "url": "https://api.example.com/metrics/load",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 10000,
  "maxIntervalMs": 300000,
  "timeoutMs": 10000,
  "description": "Monitors system load. INVERSE SCALING: when load is HIGH, poll LESS frequently to reduce overhead. When load is LOW, poll MORE frequently since the system has capacity. Rules: load_pct > 80 → poll every 5 minutes (minimal overhead). load_pct 50-80 → poll every 2-3 minutes. load_pct < 50 → poll every 30 seconds (system has capacity). If recommendation field says reduce_polling, always extend interval."
}
```

**Response body your endpoint should return:**
```json
{
  "load_pct": 85,
  "cpu_pct": 82,
  "memory_pct": 78,
  "recommendation": "reduce_polling",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**AI behavior step-by-step:**
1. AI calls `get_latest_response()` → sees `load_pct: 85` and `recommendation: "reduce_polling"`
2. AI reads description: "load_pct > 80 → poll every 5 minutes"
3. AI calls `propose_interval(intervalMs=300000, ttlMinutes=30, reason="Load at 85%, reducing polling to minimize overhead")`
4. When load drops to 35%: AI calls `propose_interval(intervalMs=30000, reason="Load at 35%, increasing polling - system has capacity")`

---

### Volatile System with Stability Focus

**Scenario**: Monitor volatile metrics without oscillating between extreme frequencies.

```json
{
  "name": "volatile-metrics",
  "url": "https://api.example.com/metrics",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 120000,
  "timeoutMs": 10000,
  "description": "Monitors volatile system metrics. STABILITY IS TOP PRIORITY. Rules: (1) Only use avg_5min and avg_1hr fields - never instant_value. (2) Only adjust for sustained trends visible in 3+ consecutive responses. (3) When trend is stable and within_normal_range is true, maintain current interval. (4) When uncertain, do nothing rather than oscillate."
}
```

Note the tight min/max ratio (30s to 120s = 4x). This bounds AI decisions to a narrow range, preventing oscillation even with volatile data.

**Response body your endpoint should return:**
```json
{
  "instant_value": 523,
  "avg_5min": 487,
  "avg_1hr": 502,
  "trend": "stable",
  "within_normal_range": true,
  "normal_range_min": 400,
  "normal_range_max": 600,
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**AI behavior step-by-step:**
1. AI calls `get_latest_response()` → sees `instant_value: 523` (high) but `avg_5min: 487` (normal)
2. AI reads description: "Only use avg_5min - never instant_value"
3. AI checks: `trend: "stable"`, `within_normal_range: true`
4. **No action** — maintains current interval despite the volatile instant_value
5. Only tightens when: `avg_5min` shows sustained rise, `trend: "rising"`, `within_normal_range: false`

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
