---
id: recipes
title: Recipes & Complete Examples
description: Complete examples for health monitoring, automated error recovery, data sync, response field parsing, oscillation prevention, and multi-endpoint coordination — with AI behavior walkthroughs
tags:
  - user
  - examples
  - recipes
  - cookbook
  - error-recovery
  - status-codes
  - health-monitoring
  - data-sync
  - coordination
  - degraded-state
sidebar_position: 4
mcp:
  uri: file:///docs/recipes.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-06T00:00:00Z
---

# Recipes & Complete Examples

Each recipe below is a **complete workflow**: configure the job and endpoints, design response bodies, and understand exactly what the AI does at each step.

## Before You Begin

Cronicorn is a **hosted scheduling service** — there are no config files to deploy, no SDK to import, and no scheduling code to write. To follow these recipes:

1. **Sign up** at cronicorn.com (or use a self-hosted instance)
2. **Create a Job** through the Web UI, MCP Server, or HTTP API
3. **Add Endpoints** with the configurations shown below
4. **AI runs automatically** — no per-endpoint AI setup required

The configurations below use the JSON format accepted by the Web UI, MCP Server, and HTTP API. See [Core Concepts](./core-concepts.md#endpoint-configuration-schema-json) for the full schema.

## Prerequisites

1. **Sign up** at cronicorn.com (or use a self-hosted instance)
2. **Get an API key** from Settings → API Keys in the Web UI
3. **Authenticate** using `x-api-key: YOUR_API_KEY` header (API) or OAuth device flow (MCP Server)
4. **Have an HTTP endpoint** that returns JSON with relevant metrics

All examples below use the HTTP API with cURL. The same configurations work via the [MCP Server](./mcp-server.md) tools and the Web UI forms. See [Code Examples](./code-examples.md) for JavaScript/TypeScript/Python.

## How Cronicorn Processes Response Bodies (The Mechanism)

**You write no parsing code, no rules engine, and no DSL.** Here is exactly what happens:

1. The **Scheduler** executes your endpoint (makes the HTTP request)
2. The **AI Planner** reads the HTTP response body (up to 500 characters of JSON or text)
3. The AI interprets field names and values against your endpoint's `description` text
4. The AI calls scheduling tools (`propose_interval`, `clear_hints`, `pause_until`, `propose_next_time`) based on its analysis
5. The **Governor** applies the AI's suggestion, clamped to your `minIntervalMs`/`maxIntervalMs` constraints

**Your three levers of control:**

| Lever | What It Does | Example |
|-------|-------------|---------|
| **`description` field** | Natural language rules the AI follows | "Poll every 30s when error_rate_pct > 5%. Return to baseline when < 2%." |
| **`minIntervalMs` / `maxIntervalMs`** | Hard guardrails the AI cannot override | min: 30000 (30s floor), max: 900000 (15min ceiling) |
| **Response body design** | The data the AI reads and interprets | `{ "error_rate_pct": 8.5, "status": "degraded" }` |

The description is your rules engine. The constraints are your safety net. The response body is your data contract.

**Edge cases:**
- If the response body is empty or malformed → AI falls back to HTTP status code and health metrics
- If a field referenced in the description is missing → AI uses available data and notes the absence
- If the AI proposes an interval outside constraints → Governor clamps it to min/max
- If AI is unavailable (quota, outage) → Scheduler continues on baseline schedule

---

## Recipe 1: Health Monitoring with Automatic Surge Detection

**Goal**: Monitor a service endpoint and automatically increase polling frequency from 5 minutes to 30 seconds when the HTTP response indicates a degraded state, then return to baseline when conditions normalize.

### Step 1: Create the Job and Endpoint via API

Create the job and add the endpoint using the HTTP API (the same fields work in the Web UI and MCP Server):

```bash
# Create the job
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Monitoring",
    "description": "Monitors production API health with adaptive frequency during incidents"
  }'
# Returns: { "id": "job_abc123", "name": "Production API Monitoring", ... }

# Add the health-check endpoint to the job
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-health-check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 900000,
    "timeoutMs": 10000,
    "description": "Monitors API health. Poll more frequently (every 30 seconds) when status is degraded or error_rate_pct exceeds 5%. Return to baseline (5 minutes) when status returns to healthy and error_rate_pct drops below 2%. If latency_ms exceeds 2000, tighten to 1-minute intervals to track recovery."
  }'
# Cronicorn immediately starts executing this endpoint every 5 minutes.
# The AI Planner automatically analyzes responses and adjusts frequency.
# No additional setup required — no code to write, no rules to configure.
```

### Step 2: Design Your Health Endpoint Response Body

Your `https://api.example.com/health` endpoint should return:

**When healthy:**
```json
{
  "status": "healthy",
  "error_rate_pct": 0.5,
  "latency_ms": 145,
  "active_connections": 230,
  "queue_depth": 45,
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**When degraded:**
```json
{
  "status": "degraded",
  "error_rate_pct": 8.5,
  "latency_ms": 1200,
  "active_connections": 890,
  "queue_depth": 500,
  "timestamp": "2026-02-03T12:05:00Z"
}
```

**When critical:**
```json
{
  "status": "critical",
  "error_rate_pct": 25.0,
  "latency_ms": 5000,
  "active_connections": 50,
  "queue_depth": 2000,
  "timestamp": "2026-02-03T12:10:00Z"
}
```

### What the AI Does

**During surge detection:**

1. AI calls `get_latest_response()` → sees `{ "status": "degraded", "error_rate_pct": 8.5 }`
2. AI calls `get_response_history(limit=5)` → sees error_rate climbing: 2.1 → 3.5 → 5.2 → 7.1 → 8.5
3. AI reads description: "Poll more frequently when status is degraded or error_rate_pct exceeds 5%"
4. AI calls `propose_interval(intervalMs=30000, ttlMinutes=60, reason="Error rate at 8.5%, status degraded - tightening to 30s")`
5. Governor applies: next run in 30 seconds (within min constraint of 30s)

**During recovery (return to baseline):**

1. AI calls `get_latest_response()` → sees `{ "status": "healthy", "error_rate_pct": 0.5 }`
2. AI calls `get_response_history(limit=5)` → sees error_rate declining: 8.5 → 5.2 → 2.1 → 0.8 → 0.5
3. AI reads description: "Return to baseline when status returns to healthy and error_rate_pct drops below 2%"
4. AI calls `clear_hints(reason="Error rate at 0.5%, status healthy - returning to baseline")`
5. Governor falls back to baseline: next run in 5 minutes

### Manual Override via API (Optional)

You can also programmatically trigger surge monitoring from an external system using the HTTP API:

```bash
# Tighten monitoring to every 30 seconds for 1 hour
curl -X POST https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/hints/interval \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "intervalMs": 30000,
    "ttlMinutes": 60,
    "reason": "Manual: incident detected by external monitoring"
  }'

# Return to baseline by clearing hints
curl -X DELETE https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/hints \
  -H "x-api-key: YOUR_API_KEY"
```

### Writing the Description for Degraded State Detection

The `description` field is the primary way you control AI behavior. Here's how to write effective descriptions for health monitoring:

**Good description (specific thresholds, both directions):**
```
"Monitors API health. Poll every 30 seconds when status is degraded or error_rate_pct exceeds 5%.
Return to baseline when status returns to healthy and error_rate_pct drops below 2%.
If latency_ms exceeds 2000, tighten to 1-minute intervals."
```

**Bad description (vague, no recovery condition):**
```
"Monitors API health. Poll faster when things look bad."
```

**Why the good version works:**
- Names specific response body fields (`status`, `error_rate_pct`, `latency_ms`)
- Provides exact thresholds (5%, 2%, 2000ms) not vague terms like "high"
- Specifies both tightening AND recovery conditions
- References specific interval values (30s, 1min)

### Exactly Which Response Body Fields Trigger Adaptive Behavior

The AI parses your response body fields and compares them against the thresholds in your `description`. Here is the exact mapping for this recipe:

| Response Body Field | Degradation Threshold | AI Action When Exceeded | Recovery Threshold | AI Action on Recovery |
|---|---|---|---|---|
| `status` | `"degraded"` or `"critical"` | `propose_interval(30000)` — 30s polling | `"healthy"` | `clear_hints()` — return to 5min baseline |
| `error_rate_pct` | > 5% (from description) | `propose_interval(30000)` — 30s polling | < 2% (from description) | `clear_hints()` — return to baseline |
| `latency_ms` | > 2000 (from description) | `propose_interval(60000)` — 1min polling | < 2000 | Maintains current or returns to baseline |

**No additional configuration beyond the `description` field is needed.** The AI automatically reads the response body for every execution, parses the JSON fields, and compares values against the thresholds you wrote in the description. You do not need to enable a feature flag, write parsing code, or configure a rules engine.

### Error Handling

What happens when edge cases occur:

- **Health endpoint returns HTTP 500** → Failure count increments, exponential backoff applies automatically (no description needed). AI also sees the failure and may tighten monitoring.
- **Response body is empty** → AI uses HTTP status code and execution metadata (duration, failure count) to make decisions.
- **`status` field is missing from response** → AI notes the absence and makes decisions based on available fields (`error_rate_pct`, `latency_ms`, etc.).
- **Response body exceeds 500 characters** → Truncated. Keep response bodies concise with the most important fields first.

### Verifying AI Decisions

Check what the AI decided and why using the analysis sessions API:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/analysis-sessions?limit=5"
```

Look for:
- `reasoning` — The AI's explanation of what it saw and why it acted
- `toolsCalled` — Which scheduling tools the AI invoked (`propose_interval`, `clear_hints`, etc.)
- `actionsApplied` — The actual parameter values used

---

## Recipe 2: Automated Error Recovery with Status Code Handling

> This recipe is also available as a standalone guide: [Automated Error Recovery](./automated-error-recovery.md)

**Goal**: Set up a job where a health endpoint detects errors (including specific HTTP status codes like 500/503), triggers an automated recovery action, respects a cooldown period, and returns to normal polling once the service recovers.

### How HTTP Status Codes Affect Scheduling

Before setting up, understand how Cronicorn handles status codes:

| Status Code | Result | Failure Count | Effect |
|-------------|--------|---------------|--------|
| 2xx | Success | Resets to 0 | Normal scheduling continues |
| 3xx | Success | Resets to 0 | Follows redirects |
| 4xx | Failure | Increments +1 | Exponential backoff applies |
| 5xx | Failure | Increments +1 | Exponential backoff applies |
| Timeout | Failure | Increments +1 | Exponential backoff applies |

When failures occur, exponential backoff multiplies the baseline interval:

| Failure Count | Multiplier | 5-min baseline becomes |
|---------------|------------|----------------------|
| 0 | 1x | 5 minutes |
| 1 | 2x | 10 minutes |
| 2 | 4x | 20 minutes |
| 3 | 8x | 40 minutes |
| 4 | 16x | 80 minutes |
| 5+ | 32x (cap) | 160 minutes |

A single 2xx response resets the failure count to 0 and restores normal scheduling immediately.

### Step 1: Create the Job and Endpoints via API

Create a single job with TWO endpoints — placing them in the same job gives the AI **sibling visibility**, so it can coordinate between them:

```bash
# Create the job (container for both endpoints)
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Service Recovery Automation",
    "description": "Monitors service health and triggers automated recovery when errors are detected"
  }'
# Returns: { "id": "job_abc123", ... }

# Add the health-check endpoint
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "health-check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "timeoutMs": 10000,
    "description": "Monitors service health. When status is error, needs_recovery is true, or HTTP response returns 5xx status codes, the trigger-recovery sibling endpoint should run immediately via one-shot. During errors, tighten monitoring to every 30 seconds to track recovery progress. Return to 5-minute baseline when status returns to ok and error_count drops to 0."
  }'
# Returns: { "id": "ep_health123", ... }

# Add the recovery endpoint (same job = sibling of health-check)
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trigger-recovery",
    "url": "https://api.example.com/admin/restart",
    "method": "POST",
    "baselineIntervalMs": 86400000,
    "minIntervalMs": 300000,
    "timeoutMs": 30000,
    "description": "Recovery action that restarts the service. Should only run when health-check sibling shows status error or needs_recovery is true. After triggering, wait at least 5 minutes (minInterval) before allowing another attempt. If recovery succeeds (health-check returns to ok), return to 24-hour baseline. Maximum 3 recovery attempts before pausing for 1 hour to avoid recovery loops."
  }'
# Returns: { "id": "ep_recovery456", ... }
# Both endpoints are now siblings in the same job.
# The AI automatically uses get_sibling_latest_responses() to coordinate between them.
```

### Step 2: Design Your Response Bodies

**Health check endpoint (`GET /health`) - when healthy:**
```json
{
  "status": "ok",
  "error_count": 0,
  "needs_recovery": false,
  "uptime_seconds": 86400,
  "last_restart_at": "2026-02-02T12:00:00Z",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**Health check endpoint - when failing (or when HTTP returns 500/503):**
```json
{
  "status": "error",
  "error_count": 15,
  "last_error": "Connection refused on port 8080",
  "needs_recovery": true,
  "last_restart_at": "2026-02-02T12:00:00Z",
  "timestamp": "2026-02-03T12:05:00Z"
}
```

**Recovery endpoint (`POST /admin/restart`) - success:**
```json
{
  "action": "restart",
  "result": "initiated",
  "restart_time": "2026-02-03T12:06:00Z",
  "estimated_recovery_seconds": 30,
  "attempt_number": 1
}
```

**Health check endpoint - after recovery:**
```json
{
  "status": "ok",
  "error_count": 0,
  "needs_recovery": false,
  "uptime_seconds": 120,
  "last_restart_at": "2026-02-03T12:06:00Z",
  "recovered_at": "2026-02-03T12:06:30Z",
  "timestamp": "2026-02-03T12:07:00Z"
}
```

### What the AI Does

**When errors are detected:**

1. AI analyzes health-check → calls `get_latest_response()`
2. Sees `{ "status": "error", "needs_recovery": true }`
3. Reads description: "trigger-recovery sibling should run immediately"
4. Calls `get_sibling_latest_responses()` → sees trigger-recovery on 24h baseline
5. Calls `propose_next_time()` on trigger-recovery for immediate execution
6. Calls `propose_interval(intervalMs=30000, ttlMinutes=60)` on health-check for close monitoring
7. Reasoning: "Service errors detected, triggering recovery and tightening health monitoring"

**When recovery succeeds:**

1. AI analyzes health-check → calls `get_latest_response()`
2. Sees `{ "status": "ok", "error_count": 0, "recovered_at": "..." }`
3. Calls `get_response_history(limit=5)` → confirms sustained recovery
4. Calls `clear_hints()` on health-check → returns to 5-minute baseline
5. Reasoning: "Service recovered, clearing hints to return to baseline monitoring"

**If recovery fails (multiple attempts):**

1. AI analyzes health-check → sees ongoing errors after recovery attempt
2. Calls `get_sibling_latest_responses()` → sees trigger-recovery has run 3 times recently
3. Reads description: "Maximum 3 recovery attempts before pausing for 1 hour"
4. Calls `pause_until(now + 1 hour)` on trigger-recovery
5. Keeps health-check on tight monitoring to detect external intervention
6. Reasoning: "3 recovery attempts failed, pausing recovery to avoid loops"

### Reset Failures via API (Optional)

If exponential backoff has kicked in and you want to reset programmatically:

```bash
curl -X POST https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/reset-failures \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Recipe 3: Data Volume-Based Frequency Adjustment

**Goal**: Create a data synchronization job that polls more frequently when there is a large data backlog (high `records_pending`), and relaxes to baseline when the data is caught up.

### Step 1: Create the Job and Endpoint via API

```bash
# Create the job
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Sync Monitor",
    "description": "Monitors data synchronization status and adapts polling based on pending record volume"
  }'
# Returns: { "id": "job_abc123", ... }

# Add the sync status endpoint
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sync-status",
    "url": "https://api.example.com/sync/status",
    "method": "GET",
    "baselineIntervalMs": 600000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 1800000,
    "timeoutMs": 15000,
    "description": "Checks data sync status. Adjust polling frequency based on records_pending volume: when records_pending exceeds 1000, poll every 30 seconds to track sync progress closely. When records_pending is between 100-1000, poll every 2 minutes. When records_pending drops below 100 (caught up), return to 10-minute baseline. Also monitor sync_rate_per_minute - if it drops below 50, investigate by tightening interval."
  }'
# Cronicorn immediately starts polling every 10 minutes.
# AI reads the records_pending field from responses and adjusts frequency automatically.
```

### Step 2: Design Your Sync Status Response Body

**Large backlog:**
```json
{
  "records_pending": 15000,
  "records_synced_total": 250000,
  "sync_rate_per_minute": 500,
  "estimated_completion_minutes": 30,
  "status": "syncing",
  "last_sync_at": "2026-02-03T12:00:00Z",
  "timestamp": "2026-02-03T12:01:00Z"
}
```

**Moderate backlog:**
```json
{
  "records_pending": 500,
  "records_synced_total": 264500,
  "sync_rate_per_minute": 480,
  "estimated_completion_minutes": 1,
  "status": "syncing",
  "last_sync_at": "2026-02-03T12:28:00Z",
  "timestamp": "2026-02-03T12:29:00Z"
}
```

**Caught up:**
```json
{
  "records_pending": 12,
  "records_synced_total": 265000,
  "sync_rate_per_minute": 0,
  "estimated_completion_minutes": 0,
  "status": "idle",
  "last_sync_at": "2026-02-03T12:30:00Z",
  "timestamp": "2026-02-03T12:40:00Z"
}
```

**Sync stalled (rate dropped):**
```json
{
  "records_pending": 8000,
  "records_synced_total": 257000,
  "sync_rate_per_minute": 10,
  "estimated_completion_minutes": 800,
  "status": "degraded",
  "error": "Upstream API rate limited",
  "last_sync_at": "2026-02-03T12:15:00Z",
  "timestamp": "2026-02-03T12:20:00Z"
}
```

### What the AI Does

**When backlog is detected:**

1. AI calls `get_latest_response()` → sees `{ "records_pending": 15000, "status": "syncing" }`
2. AI reads description: "when records_pending exceeds 1000, poll every 30 seconds"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="15000 records pending, above 1000 threshold - tightening to 30s")`
4. Governor applies: next run in 30 seconds

**When backlog clears:**

1. AI calls `get_latest_response()` → sees `{ "records_pending": 12, "status": "idle" }`
2. AI calls `get_response_history(limit=5)` → sees pending count dropping: 5000 → 2000 → 500 → 50 → 12
3. AI reads description: "when records_pending drops below 100, return to 10-minute baseline"
4. AI calls `clear_hints(reason="Records pending at 12, below 100 threshold - returning to baseline")`
5. Governor falls back to 10-minute baseline

**When sync rate drops:**

1. AI calls `get_latest_response()` → sees `{ "sync_rate_per_minute": 10, "status": "degraded" }`
2. AI reads description: "if sync_rate_per_minute drops below 50, investigate by tightening interval"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=15, reason="Sync rate dropped to 10/min, investigating")`

### Error Handling

What happens when edge cases occur:

- **Sync-status endpoint returns HTTP 500** → Failure count increments, exponential backoff applies. AI detects the failure and may tighten monitoring to track recovery.
- **`records_pending` field is missing** → AI falls back to other available fields (`status`, `sync_rate_per_minute`) and the HTTP status code.
- **Response body is malformed (not valid JSON)** → AI uses HTTP status code and execution metadata only. The endpoint is still tracked normally.
- **Sync rate drops to 0** → AI reads the `status: "degraded"` and `sync_rate_per_minute: 0` fields, tightens polling per the description.

### Verifying AI Decisions

Check what the AI decided and why:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/analysis-sessions?limit=5"
```

Look for `reasoning` to see the AI's interpretation of `records_pending` values and `toolsCalled` to see which scheduling tools were invoked.

### Adjust Frequency Programmatically (Optional)

You can also use an external script to adjust sync frequency based on external metrics via the HTTP API:

```bash
#!/bin/bash
# Adjust sync monitoring based on external data volume metrics
PENDING=$(curl -s https://api.example.com/sync/status | jq '.records_pending')

if (( PENDING > 5000 )); then
  curl -X POST https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/hints/interval \
    -H "x-api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "intervalMs": 30000,
      "ttlMinutes": 30,
      "reason": "Large backlog detected ('"$PENDING"' records pending)"
    }'
elif (( PENDING < 100 )); then
  curl -X DELETE https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/hints \
    -H "x-api-key: YOUR_API_KEY"
fi
```

---

## Recipe 4: Response Field Parsing with Dynamic Rules

**Goal**: Define endpoints where specific fields in the HTTP response body drive the AI's scheduling decisions — effectively creating "rules" through natural language descriptions that parse response fields.

In Cronicorn, **descriptions are your rules engine**. You write natural language that tells the AI which response body fields to monitor and what actions to take based on their values. The AI reads the response body, interprets the fields, and applies the scheduling tools accordingly.

### How AI Response Body Parsing Works

In Cronicorn, **you don't write parsing code**. The AI Planner automatically:
1. Reads the HTTP response body (up to 500 characters, JSON or plain text)
2. Interprets field names and values based on your endpoint's `description`
3. Compares values against thresholds you specify in the description
4. Calls scheduling tools (`propose_interval`, `clear_hints`, etc.) based on its analysis

Your job is to: (a) return useful fields in your response body, and (b) tell the AI what those fields mean via the `description`.

### Step 1: Create the Job and Endpoint via API

```bash
# Create the job
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart Queue Monitor",
    "description": "Monitors queue metrics and adapts scheduling based on response body field values"
  }'
# Returns: { "id": "job_abc123", ... }

# Add the endpoint with field-parsing description
# The description tells the AI exactly which fields to read and what thresholds to use.
# The AI parses the response body automatically — no parsing code to write.
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "queue-metrics",
    "url": "https://api.example.com/queue/metrics",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 15000,
    "maxIntervalMs": 900000,
    "timeoutMs": 10000,
    "description": "Monitors queue processing metrics. Parse the response body fields as follows: (1) If queue_depth exceeds queue_warning_threshold, tighten polling to every 30 seconds. (2) If queue_depth exceeds queue_max, tighten to every 15 seconds (minInterval). (3) If processing_rate_per_min drops below 50, tighten to 1 minute to monitor for stalls. (4) If error_rate_pct exceeds 5, tighten to 30 seconds. (5) If all metrics are within normal ranges (queue_depth < queue_warning_threshold, error_rate_pct < 2, processing_rate_per_min > 100), return to 5-minute baseline. Use the trend field to avoid overreacting to momentary spikes - only act on sustained changes."
  }'
# Cronicorn starts executing every 5 minutes.
# The AI reads queue_depth, processing_rate_per_min, error_rate_pct, and trend
# from the response body and adjusts polling frequency based on the description rules.
```

### Step 2: Design Response Body with Parseable Fields

```json
{
  "queue_depth": 250,
  "queue_max": 1000,
  "queue_warning_threshold": 500,
  "processing_rate_per_min": 150,
  "error_rate_pct": 1.2,
  "avg_latency_ms": 45,
  "consumers_active": 8,
  "trend": "stable",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

### What the AI Does (Field-by-Field Parsing)

**Normal operation (all fields within range):**

1. AI calls `get_latest_response()` → sees queue_depth=250, queue_warning_threshold=500
2. AI reads description: "If all metrics are within normal ranges... return to 5-minute baseline"
3. Checks: 250 < 500 (ok), error_rate_pct 1.2 < 2 (ok), processing_rate 150 > 100 (ok)
4. No action needed → maintains baseline

**Queue depth crosses warning threshold:**

1. AI calls `get_latest_response()` → sees `{ "queue_depth": 750, "queue_warning_threshold": 500 }`
2. AI reads description: "If queue_depth exceeds queue_warning_threshold, tighten polling to every 30 seconds"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="Queue depth 750 exceeds warning threshold 500")`

**Multiple fields trigger at once:**

1. AI calls `get_latest_response()` → sees `{ "queue_depth": 950, "queue_max": 1000, "error_rate_pct": 8.5 }`
2. AI reads description: both queue_max threshold and error_rate threshold exceeded
3. AI calls `propose_interval(intervalMs=15000, ttlMinutes=15, reason="Queue near max (950/1000) and error rate high (8.5%) - maximum monitoring")`

**Recovery after threshold clearing:**

1. AI calls `get_latest_response()` → sees `{ "queue_depth": 100, "error_rate_pct": 0.5, "trend": "stable" }`
2. AI calls `get_response_history(limit=5)` → confirms sustained improvement
3. AI reads description: "If all metrics are within normal ranges... return to 5-minute baseline"
4. AI calls `clear_hints(reason="All metrics normal - queue 100, error rate 0.5%, trend stable")`

### More Field-Parsing Description Examples

**CPU load with inverse scaling (poll LESS under load):**

```json
{
  "name": "system-load-monitor",
  "url": "https://api.example.com/metrics/load",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 10000,
  "maxIntervalMs": 300000,
  "description": "Monitors system load. INVERSE SCALING: when cpu_pct is HIGH, poll LESS frequently to reduce overhead. Parse response fields: (1) cpu_pct > 80: extend to 5 minutes (reduce load). (2) cpu_pct 50-80: maintain 2-3 minute interval. (3) cpu_pct < 50: tighten to 30 seconds (system has capacity). (4) If recommendation field is reduce_polling, always extend interval. (5) If memory_pct > 90, pause for 5 minutes regardless of CPU."
}
```

**Response body:**
```json
{
  "cpu_pct": 85,
  "memory_pct": 78,
  "load_avg_1m": 4.2,
  "load_avg_5m": 3.8,
  "recommendation": "reduce_polling",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**Payment processor with amount-based monitoring:**

```json
{
  "name": "payment-monitor",
  "url": "https://api.example.com/payments/status",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 10000,
  "maxIntervalMs": 600000,
  "description": "Monitors payment processing. Parse response fields: (1) If failed_transactions > 0, tighten to 10 seconds immediately. (2) If pending_amount_usd > 100000, tighten to 30 seconds (high-value transactions pending). (3) If processing_lag_seconds > 60, tighten to 15 seconds. (4) If all fields normal (failed_transactions=0, pending_amount_usd < 10000, processing_lag_seconds < 10), return to 1-minute baseline."
}
```

---

## Recipe 5: Oscillation Prevention for Volatile Systems

**Goal**: Monitor a system with highly volatile HTTP response patterns and prevent the adaptive scheduling from oscillating between extreme frequencies — maintaining stability while still responding to genuine state changes.

### Step 1: Create the Job and Endpoint via API

```bash
# Create the job
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Volatile System Monitor",
    "description": "Monitors volatile system metrics with stability-focused adaptive scheduling"
  }'
# Returns: { "id": "job_abc123", ... }

# Add the endpoint with anti-oscillation configuration.
# Key: tight min/max ratio (30s-120s = 4x range) + stability-focused description.
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "volatile-metrics",
    "url": "https://api.example.com/metrics",
    "method": "GET",
    "baselineIntervalMs": 60000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 120000,
    "timeoutMs": 10000,
    "description": "Monitors volatile system metrics. STABILITY IS THE TOP PRIORITY. Do NOT overreact to momentary spikes or drops in values. Rules for adaptation: (1) ONLY use the smoothed avg_5min and avg_1hr fields, NEVER use instant_value for decisions. (2) Only adjust interval for SUSTAINED state changes visible across at least 3 consecutive responses. (3) When trend field is stable, maintain current interval regardless of individual metric values. (4) When within_normal_range is true, always return to baseline. (5) Only tighten interval when avg_5min shows a clear directional trend AND avg_1hr confirms it. (6) When uncertain, ALWAYS maintain the current interval - do nothing rather than oscillate."
  }'
# The tight 4x constraint ratio (30s min, 120s max) bounds AI decisions.
# Even with volatile data, scheduling stays within a narrow range.
```

### Constraint Ratio Guide

The min/max ratio directly controls how much the AI can swing:

| Volatility Level | Min Interval | Max Interval | Ratio | Description |
|------------------|--------------|--------------|-------|-------------|
| Low (stable) | 10s | 10min | 60x | Wide range for stable systems |
| Medium | 30s | 5min | 10x | Most common starting point |
| High | 30s | 2min | 4x | Volatile systems, tight bounds |
| Extreme | 1min | 2min | 2x | Minimal AI freedom, maximum stability |

With a 2x ratio (like our recipe above: 30s min, 120s max), even aggressive AI decisions stay bounded within a narrow range.

### Step 2: Design Your Response Body for Stability

**Critical: Include smoothed values, not just instantaneous readings:**

```json
{
  "instant_value": 523,
  "avg_5min": 487,
  "avg_15min": 492,
  "avg_1hr": 502,
  "std_dev_5min": 45.2,
  "trend": "stable",
  "within_normal_range": true,
  "normal_range_min": 400,
  "normal_range_max": 600,
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**When a genuine state change occurs (sustained):**
```json
{
  "instant_value": 850,
  "avg_5min": 780,
  "avg_15min": 650,
  "avg_1hr": 520,
  "std_dev_5min": 85.0,
  "trend": "rising",
  "within_normal_range": false,
  "normal_range_min": 400,
  "normal_range_max": 600,
  "timestamp": "2026-02-03T12:30:00Z"
}
```

**When a transient spike occurs (should NOT trigger change):**
```json
{
  "instant_value": 950,
  "avg_5min": 510,
  "avg_15min": 498,
  "avg_1hr": 502,
  "std_dev_5min": 120.0,
  "trend": "stable",
  "within_normal_range": true,
  "normal_range_min": 400,
  "normal_range_max": 600,
  "timestamp": "2026-02-03T12:15:00Z"
}
```

### What the AI Does

**Transient spike (no oscillation):**

1. AI calls `get_latest_response()` → sees `{ "instant_value": 950, "avg_5min": 510, "trend": "stable", "within_normal_range": true }`
2. AI reads description: "ONLY use smoothed avg_5min and avg_1hr fields, NEVER use instant_value"
3. AI checks: avg_5min=510 (normal), trend="stable", within_normal_range=true
4. AI reads description: "When within_normal_range is true, always return to baseline"
5. **No action** — maintains current interval despite extreme instant_value
6. Reasoning: "Transient spike in instant_value (950) but smoothed metrics stable (avg_5min=510)"

**Genuine state change:**

1. AI calls `get_latest_response()` → sees `{ "avg_5min": 780, "trend": "rising", "within_normal_range": false }`
2. AI calls `get_response_history(limit=5)` → confirms sustained rise: 510 → 580 → 650 → 720 → 780
3. AI reads description: "Only tighten when avg_5min shows clear directional trend AND avg_1hr confirms"
4. AI checks: avg_5min=780 (rising across 5 readings), avg_1hr=520 (starting to rise)
5. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="Sustained rise in avg_5min from 510 to 780, trend rising, outside normal range")`
6. Governor applies: 30 seconds (the minimum, within the tight 30s-120s range)

**Recovery after genuine change:**

1. AI calls `get_latest_response()` → sees `{ "avg_5min": 490, "trend": "stable", "within_normal_range": true }`
2. AI calls `get_response_history(limit=5)` → confirms sustained return: 780 → 620 → 540 → 500 → 490
3. AI reads description: "When within_normal_range is true, always return to baseline"
4. AI calls `clear_hints(reason="Metrics returned to normal range, avg_5min at 490, trend stable")`

### Debugging Oscillation via API (Optional)

If you observe oscillation in an existing setup, you can investigate using the HTTP API:

```bash
# Check if constraints are set
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.cronicorn.com/api/jobs/JOB_ID/endpoints/ENDPOINT_ID

# Review AI analysis sessions to see reasoning
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/analysis-sessions?limit=10"

# Tighten constraints if range is too wide
curl -X PATCH https://api.cronicorn.com/api/jobs/JOB_ID/endpoints/ENDPOINT_ID \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "minIntervalMs": 30000,
    "maxIntervalMs": 120000,
    "description": "...(add stability language)..."
  }'
```

---

## Recipe 6: Multi-Endpoint Cascading Coordination

**Goal**: Set up multiple interdependent HTTP jobs where endpoints coordinate their execution based on cascading response data, with one endpoint's response influencing the scheduling of others — without creating conflicting AI decisions.

### Step 1: Create the Job and All Endpoints via API

Create ONE job with THREE endpoints. Placing them in the same job enables **sibling visibility** — the AI can call `get_sibling_latest_responses()` to read data from other endpoints and coordinate the pipeline:

```bash
# Create the job (container for the entire pipeline)
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ETL Pipeline",
    "description": "Extract-Transform-Load pipeline where each stage depends on the previous stage completing successfully. Stages coordinate via response body signals."
  }'
# Returns: { "id": "job_abc123", ... }

# Add Extract endpoint (upstream — runs on cron schedule)
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "extract-data",
    "url": "https://api.example.com/etl/extract",
    "method": "POST",
    "baselineCron": "0 2 * * *",
    "timeoutMs": 120000,
    "description": "Extracts customer data from upstream API daily at 2 AM. After successful extraction, the response body will contain ready_for_transform=true and a batch_id. The transform-data sibling endpoint should check for this signal before processing."
  }'
# Returns: { "id": "ep_extract123", ... }

# Add Transform endpoint (midstream — polls and waits for extract signal)
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "transform-data",
    "url": "https://api.example.com/etl/transform",
    "method": "POST",
    "baselineIntervalMs": 60000,
    "minIntervalMs": 30000,
    "timeoutMs": 120000,
    "description": "Transforms extracted data. Check extract-data sibling response: only process when ready_for_transform is true and batch_id is newer than our last processed batch_id. After successful transformation, set ready_for_load=true so the load-data sibling can proceed. If waiting for data (no new batch), maintain 1-minute baseline. When actively processing a batch, tighten to 30 seconds to track progress."
  }'
# Returns: { "id": "ep_transform456", ... }

# Add Load endpoint (downstream — polls and waits for transform signal)
curl -X POST https://api.cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "load-data",
    "url": "https://api.example.com/etl/load",
    "method": "POST",
    "baselineIntervalMs": 60000,
    "minIntervalMs": 30000,
    "timeoutMs": 180000,
    "description": "Loads transformed data to production database. Check transform-data sibling response: only process when ready_for_load is true and batch_id matches current batch. After successful load, set pipeline_complete=true. If waiting for transform (no new batch ready), maintain 1-minute baseline to check periodically."
  }'
# Returns: { "id": "ep_load789", ... }
# All three endpoints are siblings in the same job.
# The AI coordinates them using get_sibling_latest_responses().
# No orchestration code to write — the AI handles dependency coordination.
```

### Error Handling in Pipelines

If any stage fails:
- **HTTP 4xx/5xx or timeout**: The failed endpoint enters exponential backoff (baseline × 2^failures, capped at 32×). Downstream stages see no new `ready_for_*` signal, so they stay on baseline and wait.
- **AI intervention**: The AI Planner detects the failure pattern, can override backoff with a tighter hint to retry sooner, or pause the endpoint if failures persist.
- **Manual recovery**: Use the API to reset failures and clear hints:

```bash
# Reset the failed endpoint's backoff
curl -X POST https://api.cronicorn.com/api/endpoints/ep_extract123/reset-failures \
  -H "x-api-key: YOUR_API_KEY"

# Or manually trigger a one-shot retry
curl -X POST https://api.cronicorn.com/api/endpoints/ep_extract123/hints/oneshot \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nextRunAt": "2026-02-03T02:30:00Z",
    "ttlMinutes": 30,
    "reason": "Manual retry after fixing upstream API"
  }'
```

### Race Condition Prevention

Cronicorn prevents race conditions at multiple levels:
- **Atomic job claiming**: The Scheduler uses database-level atomic operations to claim endpoints for execution. No two scheduler instances can execute the same endpoint simultaneously.
- **Batch ID idempotency**: Each pipeline stage checks the batch_id from its upstream sibling. If it already processed that batch, it skips execution — preventing duplicate work.
- **AI analysis serialization**: Each endpoint gets analyzed independently. The AI reads sibling state but only modifies the endpoint it's currently analyzing.

### Step 2: Design Cascading Response Bodies

**Extract endpoint response (after success):**
```json
{
  "stage": "extract",
  "batch_id": "2026-02-03",
  "extracted_count": 5000,
  "completed_at": "2026-02-03T02:15:00Z",
  "ready_for_transform": true,
  "status": "success"
}
```

**Transform endpoint response (waiting):**
```json
{
  "stage": "transform",
  "last_processed_batch_id": "2026-02-02",
  "status": "waiting",
  "waiting_for": "extract batch 2026-02-03"
}
```

**Transform endpoint response (processing):**
```json
{
  "stage": "transform",
  "batch_id": "2026-02-03",
  "transformed_count": 3200,
  "total_count": 5000,
  "progress_pct": 64,
  "status": "processing"
}
```

**Transform endpoint response (complete):**
```json
{
  "stage": "transform",
  "batch_id": "2026-02-03",
  "transformed_count": 5000,
  "completed_at": "2026-02-03T02:30:00Z",
  "ready_for_load": true,
  "status": "success"
}
```

**Load endpoint response (complete):**
```json
{
  "stage": "load",
  "batch_id": "2026-02-03",
  "loaded_count": 5000,
  "completed_at": "2026-02-03T02:45:00Z",
  "pipeline_complete": true,
  "status": "success"
}
```

### What the AI Does (Cascading Coordination)

**Step A: Extract completes at 2:15 AM**

1. AI analyzes transform-data → calls `get_sibling_latest_responses()`
2. Finds extract-data response: `{ "batch_id": "2026-02-03", "ready_for_transform": true }`
3. Checks transform-data's last response: `{ "last_processed_batch_id": "2026-02-02" }`
4. Sees new batch available (2026-02-03 > 2026-02-02)
5. Calls `propose_next_time(now, reason="New batch 2026-02-03 ready for transform")`
6. Calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="Processing batch - tight monitoring")`

**Step B: Transform completes at 2:30 AM**

1. AI analyzes load-data → calls `get_sibling_latest_responses()`
2. Finds transform-data response: `{ "batch_id": "2026-02-03", "ready_for_load": true }`
3. Checks load-data's last response: `{ "last_processed_batch_id": "2026-02-02" }`
4. Sees new batch available
5. Calls `propose_next_time(now, reason="Transformed batch 2026-02-03 ready to load")`

**Step C: Pipeline complete at 2:45 AM**

1. AI analyzes all endpoints → sees `pipeline_complete: true`
2. Clears hints on transform-data and load-data
3. All endpoints return to baseline schedules until tomorrow's extraction

### Preventing Conflicting Decisions

For a detailed explanation of how conflict resolution works, see [Coordinating Multiple Endpoints — Conflict Resolution](./technical/coordinating-multiple-endpoints.md#how-conflict-resolution-works).

To avoid conflicting AI decisions across interdependent endpoints:

1. **Use clear ownership signals**: Each endpoint's description says exactly which sibling it depends on
2. **Use batch IDs for idempotency**: Endpoints know which batch they last processed, preventing duplicate work
3. **Use `ready_for_*` flags**: Explicit signals instead of implicit state inference
4. **One-directional dependencies**: Extract → Transform → Load (no circular dependencies)
5. **AI analyzes independently**: Each endpoint gets its own analysis, but reads sibling signals to coordinate

### Cross-Job Coordination (When Endpoints Are in Different Jobs)

If endpoints are in separate jobs, they can't use `get_sibling_latest_responses()`. Instead, embed dependency status in the response body:

**Job 1: Upstream Service**

```json
{ "name": "Upstream Service", "description": "Monitors upstream API health" }
```

```json
{
  "name": "upstream-health",
  "url": "https://upstream.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 60000,
  "timeoutMs": 10000,
  "description": "Monitors upstream service health. Response includes service_status field used by downstream consumers in other jobs."
}
```

**Job 2: Downstream Consumer** (embeds upstream check in its response)

```json
{ "name": "Downstream Consumers", "description": "Processes data from upstream, embeds upstream health in responses for cross-job coordination" }
```

```json
{
  "name": "data-processor",
  "url": "https://downstream.example.com/process",
  "method": "POST",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 60000,
  "description": "Processes data from upstream service. The response body includes upstream_status from upstream health check. When upstream_status is unavailable, pause for 15 minutes. When upstream_status returns to healthy, resume processing immediately."
}
```

**Downstream response (upstream healthy):**
```json
{
  "processed_count": 100,
  "upstream_status": "healthy",
  "upstream_checked_at": "2026-02-03T14:30:00Z",
  "status": "success"
}
```

**Downstream response (upstream down):**
```json
{
  "processed_count": 0,
  "upstream_status": "unavailable",
  "upstream_checked_at": "2026-02-03T14:35:00Z",
  "error": "Upstream service returned 503",
  "status": "error"
}
```

AI sees `upstream_status: "unavailable"` → calls `pause_until(now + 15 minutes, reason="Upstream unavailable")`.

---

## Key Principles Across All Recipes

1. **Descriptions are your rules engine**: Write natural language that tells the AI which fields to monitor and what actions to take at specific thresholds
2. **Response bodies are your data contract**: Structure them with the metrics, signals, and thresholds the AI needs to make decisions
3. **Min/max constraints are your safety bounds**: They hard-limit how far the AI can swing, regardless of what it proposes
4. **Batch IDs prevent duplicate work**: Include them in pipeline coordination patterns
5. **`ready_for_*` flags signal dependencies**: Explicit coordination signals between endpoints
6. **Smoothed averages prevent oscillation**: Return averaged values for volatile metrics
7. **TTLs auto-revert to baseline**: Hints expire automatically, so the system always returns to a known state

---

## See Also

- **[API Reference](./api-reference.md)** - Complete HTTP API documentation
- **[Core Concepts](./core-concepts.md)** - Understanding jobs, endpoints, and descriptions
- **[How AI Adaptation Works](./technical/how-ai-adaptation-works.md)** - AI tools and decision framework
- **[Configuration & Constraints](./technical/configuration-and-constraints.md)** - Setting up min/max intervals
- **[Coordinating Multiple Endpoints](./technical/coordinating-multiple-endpoints.md)** - Advanced coordination patterns
- **[Use Cases](./use-cases.md)** - Industry-specific scenarios
