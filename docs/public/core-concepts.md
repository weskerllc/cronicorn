---
id: core-concepts
title: Core Concepts
description: Key terminology for using Cronicorn
tags:
  - user
  - assistant
  - essential
sidebar_position: 2
mcp:
  uri: file:///docs/core-concepts.md
  mimeType: text/markdown
  priority: 0.95
  lastModified: 2026-02-03T00:00:00Z
---

# Core Concepts

Understand the key concepts for working with Cronicorn.

## What is Cronicorn?

Cronicorn is a **hosted scheduling service** that replaces traditional cron with adaptive, AI-powered HTTP job scheduling. It is not a library, not an SDK, and there are no configuration files to deploy. You configure everything through the service — there is no code to write.

**How it works:**

1. **You create a Job** — a container for related endpoints
2. **You add Endpoints** — HTTP requests (URL, method, schedule) with optional natural language descriptions
3. **Cronicorn executes them** — the Scheduler worker makes the HTTP calls on schedule
4. **AI adapts automatically** — the AI Planner analyzes responses and adjusts frequency based on your descriptions. No per-endpoint AI setup required — it runs automatically for all endpoints.
5. **You monitor results** — view run history, AI decisions, and scheduling changes

**What you DON'T do:**
- Write scheduling code, polling loops, or rules (the AI interprets your descriptions)
- Create configuration files or deploy anything (everything is stored in the service database)
- Import an SDK or library (Cronicorn is a hosted service, not a package you install)
- Parse response bodies yourself (the AI reads and interprets them automatically)
- Set up the AI separately (it runs automatically for all endpoints when enabled)

## Three Interfaces

You can manage Cronicorn through three interfaces — **all configurations shown in these docs can be applied through any of them**:

- **Web UI** — The primary interface for most users. Create jobs, add endpoints, configure schedules, and monitor runs visually at cronicorn.com.
- **MCP Server** — Manage everything through your AI assistant (Claude, Copilot, Cursor). Install via `npm install -g @cronicorn/mcp-server`. See [MCP Server](./mcp-server.md) for setup.
- **HTTP API** — Programmatic access for scripts, CI/CD, and custom integrations. Authenticate with API keys. See [API Reference](./api-reference.md).

All three interfaces use the same underlying data model. When these docs show endpoint configurations, the field names map directly to the JSON schema accepted by the API and used internally by the Web UI and MCP Server.

### Endpoint Configuration Schema (JSON)

This is the canonical configuration format. All fields shown in examples throughout these docs map to these JSON fields:

```json
{
  "name": "api-health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 900000,
  "timeoutMs": 10000,
  "headers": { "Authorization": "Bearer token" },
  "body": null,
  "description": "Monitors API health. Poll more frequently when errors are detected."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | What this endpoint does |
| `url` | string | Yes | HTTP endpoint to call |
| `method` | string | Yes | GET, POST, PUT, PATCH, or DELETE |
| `baselineIntervalMs` | number | One of interval/cron | Milliseconds between runs |
| `baselineCron` | string | One of interval/cron | Cron expression (e.g., `"0 */5 * * *"`) |
| `minIntervalMs` | number | No | Minimum allowed interval (safety floor) |
| `maxIntervalMs` | number | No | Maximum allowed interval (freshness guarantee) |
| `timeoutMs` | number | No | Request timeout (default: 30000ms) |
| `headers` | object | No | Custom HTTP headers |
| `body` | string | No | Request body (for POST/PUT/PATCH) |
| `description` | string | No | Natural language instructions for AI adaptation |

### Quick Example: Creating a Job and Endpoint via API

```bash
# Step 1: Create a job
curl -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Monitoring",
    "description": "Monitors production API health with adaptive frequency"
  }'
# Returns: { "id": "job_abc123", "name": "Production API Monitoring", ... }

# Step 2: Add an endpoint to the job
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
    "description": "Monitors API health. Poll more frequently when status is degraded."
  }'
# Cronicorn immediately starts executing this endpoint every 5 minutes.
# The AI Planner automatically analyzes responses and adjusts frequency.
# No additional setup required.

# Step 3: Check endpoint health and run history
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ep_xyz789/runs?limit=5"
# Returns recent runs with status, duration, and response bodies

# Step 4: Manually override scheduling during an incident
curl -X POST https://api.cronicorn.com/api/endpoints/ep_xyz789/hints/interval \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "intervalMs": 30000,
    "ttlMinutes": 60,
    "reason": "Incident detected — tightening monitoring to every 30 seconds"
  }'
# Overrides baseline for 1 hour, then automatically reverts to 5-minute baseline
```

**Complete script example with error handling:**

```bash
#!/bin/bash
# create-monitoring-job.sh — Creates a health monitoring job in Cronicorn
API_KEY="YOUR_API_KEY"
BASE_URL="https://api.cronicorn.com"

# Create the job
JOB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/jobs" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Production API Monitoring", "description": "Health checks with adaptive frequency" }')

HTTP_CODE=$(echo "$JOB_RESPONSE" | tail -1)
JOB_BODY=$(echo "$JOB_RESPONSE" | head -1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error creating job: $JOB_BODY"
  exit 1
fi

JOB_ID=$(echo "$JOB_BODY" | jq -r '.id')
echo "Created job: $JOB_ID"

# Add the endpoint
EP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/jobs/$JOB_ID/endpoints" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-health-check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 900000,
    "timeoutMs": 10000,
    "description": "Monitors API health. Poll every 30 seconds when status is degraded or error_rate_pct > 5%. Return to baseline when healthy."
  }')

HTTP_CODE=$(echo "$EP_RESPONSE" | tail -1)
EP_BODY=$(echo "$EP_RESPONSE" | head -1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error creating endpoint: $EP_BODY"
  exit 1
fi

EP_ID=$(echo "$EP_BODY" | jq -r '.id')
echo "Created endpoint: $EP_ID"
echo "Cronicorn is now executing every 5 minutes with AI adaptation enabled."
```

The same configuration can be applied via the Web UI forms or MCP Server tool calls — all three interfaces accept the same fields.

## Jobs and Endpoints

### Job

A **Job** is a container that groups related endpoints together. Endpoints in the same job can coordinate through **sibling visibility** - the AI sees all their responses.

**Example**: A "Data Sync" job might contain endpoints for syncing users, products, and orders from different APIs.

**Properties:**
- **Name**: Descriptive label (e.g., "API Health Checks")
- **Description**: Explains what this job does and how endpoints should coordinate
- **Status**: Active, paused, or archived

### Endpoint

An **Endpoint** is the actual work to be executed - an HTTP request that runs on a schedule.

**Example**: `POST https://api.example.com/sync/users` that runs every 5 minutes.

**Required:**
- **Name**: What this endpoint does (e.g., "Sync Users")
- **URL**: The HTTP endpoint to call
- **Method**: GET, POST, PUT, PATCH, or DELETE
- **Schedule**: Either a cron expression OR an interval in milliseconds

**Optional:**
- **Description**: Natural language instructions for how the AI should adapt this endpoint (see below)
- **Headers**: Custom HTTP headers
- **Body**: Request body (for POST/PUT/PATCH)
- **Min/Max Intervals**: Safety constraints (see below)
- **Timeout**: Maximum execution time

### When to Use One Job vs Multiple Jobs

**Use ONE job with multiple endpoints when:**
- Endpoints are part of the same workflow
- Coordination between endpoints is needed
- You want AI to see sibling responses (e.g., health-check triggers recovery)

**Use MULTIPLE separate jobs when:**
- Workflows are completely independent
- Different teams own different jobs
- No coordination needed between them

**Key insight**: Most "multi-job coordination" scenarios are actually **one job with multiple endpoints**.

## How Descriptions Work

Cronicorn uses **natural language descriptions** as your primary way to configure AI behavior. You don't write code rules—you write descriptions, and the AI interprets them.

### The Paradigm

| Traditional Scheduler | Cronicorn |
|-----------------------|-----------|
| Write code rules: `if (errors > 5) interval = 30s` | Write description: "Poll faster when errors increase" |
| Configure explicit triggers | AI interprets intent from description |
| Manual coordination logic | Automatic sibling awareness |
| Static configuration | Adaptive with guardrails |

### What Makes a Good Description

A good endpoint description tells the AI:
1. **What this endpoint does** - The purpose
2. **When to poll faster or slower** - Conditions for adaptation
3. **How it relates to siblings** - Coordination with other endpoints
4. **Stability preferences** - Whether to prioritize stability or responsiveness

### Description Examples

**Health monitoring:**
```
"Monitors API health. Poll more frequently when errors are detected
or latency is high. Return to baseline when metrics normalize."
```

**Data synchronization:**
```
"Syncs data from external source. Poll frequently when there's a
large backlog to process. Slow down when caught up."
```

**Recovery action:**
```
"Triggers service recovery. Should only run when the health-check
endpoint shows errors. After triggering, wait at least 5 minutes."
```

**Stability-focused:**
```
"Monitors volatile metrics. Prioritize stability - don't overreact
to momentary spikes. Only adjust for sustained state changes."
```

**Inverse scaling:**
```
"Monitors system load. INVERSE scaling: poll LESS when load is
HIGH (reduce overhead), poll MORE when load is LOW."
```

### How AI Uses Descriptions and Response Bodies

The AI Planner processes your endpoints automatically — no per-endpoint AI setup required:

1. AI reads your endpoint **description** to understand what to monitor and what thresholds matter
2. AI reads the **response body** from your endpoint (up to 500 characters of JSON or text)
3. AI reads **sibling responses** from other endpoints in the same job (via `get_sibling_latest_responses()`)
4. AI decides whether to adjust scheduling based on all three inputs
5. Constraints (min/max intervals) provide hard guardrails that the AI cannot override

**You don't write any parsing code, rules, or logic.** The AI interprets response body fields based on your description. For example, if your description says "tighten polling when error_rate_pct exceeds 5%" and your response body contains `{ "error_rate_pct": 8.5 }`, the AI reads the field, compares it to the threshold in the description, and calls `propose_interval()` to tighten the schedule.

**No code, no DSL, no rules engine** — just natural language descriptions that the AI interprets.

## Scheduling

### Baseline Schedule

Your **baseline schedule** is the default timing for an endpoint. You must choose ONE:

**Option 1: Cron Expression**
```
"0 */5 * * *"  // Every 5 minutes
"0 2 * * *"    // Daily at 2am
"0 9 * * 1"    // Mondays at 9am
```

**Option 2: Interval (milliseconds)**
```
60000      // Every 60 seconds
300000     // Every 5 minutes
3600000    // Every hour
```

The baseline schedule is always active and provides a fallback when AI hints expire.

### AI Hints (Optional)

When AI is enabled, it can suggest temporary scheduling adjustments called **hints**:

**AI Interval Hint** - Adjust how often the endpoint runs:
- "Run every 30 seconds for the next hour" (instead of every 5 minutes)
- "Run every 15 minutes for the next 4 hours" (instead of every 5 minutes)
- Hints expire automatically (TTL) and revert to baseline

**AI One-Shot Hint** - Schedule a single immediate or future run:
- "Run once right now" (for immediate execution)
- "Run once at 2:30 PM" (for specific time)
- Happens once, then endpoint returns to baseline schedule

**How AI Decides:**
- Analyzes recent execution history (last 24 hours)
- Looks at success rates, failure patterns, response times
- Suggests adjustments while respecting your min/max constraints
- All hints have expiration times (TTL) - typically 15-60 minutes

### Pause State

You can temporarily **pause** an endpoint:

- Stops all execution until a specified time
- Useful for maintenance windows or debugging
- Set to `null` to resume immediately
- Overrides all other scheduling (baseline and AI hints)

## How Scheduling Works

The system picks the next run time using this priority order:

1. **Paused?** → If yes, return the pause-until time
2. **AI one-shot hint active?** → If yes, use that time
3. **AI interval hint active?** → If yes, use last run + AI interval
4. **Baseline cron configured?** → If yes, calculate next cron time
5. **Baseline interval configured?** → Use last run + baseline interval

**Then apply safety constraints:**
- Clamp to minimum interval (if configured)
- Clamp to maximum interval (if configured)

This ensures AI suggestions always stay within your safety boundaries.

## Safety Constraints

### Minimum Interval

Prevents over-execution:

```
minIntervalMs: 30000  // At least 30 seconds between runs
```

**Use when:**
- Protecting API rate limits
- Preventing database overload
- Avoiding costs from too-frequent polling

**Example**: Health check every 5 minutes, but AI can't go faster than every 30 seconds.

### Maximum Interval

Ensures timely execution:

```
maxIntervalMs: 3600000  // At most 1 hour between runs
```

**Use when:**
- Data must stay fresh (max 1 hour old)
- SLAs require regular checks
- Compliance needs frequent execution

**Example**: Sync every 5 minutes, but even if AI backs off, run at least every hour.

### Execution Timeout

Maximum time for the HTTP request:

```
timeoutMs: 30000  // Request must complete within 30 seconds
```

If the request takes longer, it's cancelled and marked as timeout.

## Execution Tracking

### Run History

Every execution creates a **run** record with:

- **Status**: `success` or `failed` (timeouts are recorded as `failed` with a timeout error message)
- **Duration**: How long the execution took (milliseconds)
- **Timestamps**: When it started and finished
- **Error**: Error message (if failed)
- **Source**: Why it ran (baseline-cron, baseline-interval, ai-interval, ai-oneshot, etc.)

### Failure Tracking

Endpoints track consecutive failures:

- **Failure count**: Increments on failure, resets to 0 on success
- **AI uses this**: To decide on backoff strategies
- **You see this**: In the UI for monitoring health

## Multi-Tenancy

Every job and endpoint belongs to your account (tenant):

- **Complete isolation**: You only see your own jobs and data
- **Secure execution**: Endpoints run with your credentials
- **Per-account quotas**: Usage limits apply per account

## Common Patterns

### Health Check with Adaptive Frequency

```
Baseline: Every 5 minutes (300000ms)
Min: 30 seconds (30000ms)
Max: 15 minutes (900000ms)

AI behavior:
- Normal: Runs every 5 minutes
- Errors detected: Increases to every 30 seconds
- All healthy: Backs off to every 15 minutes
```

### Daily Maintenance with Safety Net

```
Baseline: "0 2 * * *" (daily at 2am)
Max: 26 hours

Behavior:
- Normally runs at 2am daily
- If it fails, max interval ensures retry within 26 hours
- Won't accidentally skip days
```

### API Polling with Rate Limit Protection

```
Baseline: Every minute (60000ms)
Min: 30 seconds (30000ms) - protects rate limit
Max: 5 minutes (300000ms) - keeps data fresh

AI behavior:
- Adjusts between 30s and 5min based on data changes
- Never exceeds API rate limits (min)
- Ensures data freshness (max)
```

## Failure Handling

### HTTP Status Codes

Cronicorn interprets HTTP responses automatically:

| Status Code | Result | Failure Count | Effect |
|-------------|--------|---------------|--------|
| 2xx | Success | Resets to 0 | Normal scheduling continues |
| 3xx | Success | Resets to 0 | Follows redirects |
| 4xx | Failure | Increments +1 | Exponential backoff applies |
| 5xx | Failure | Increments +1 | Exponential backoff applies |
| Timeout | Failure | Increments +1 | Exponential backoff applies |

### Exponential Backoff

When an endpoint fails, the next run is delayed by a multiplier on the baseline interval:

| Consecutive Failures | Multiplier | 5-min baseline becomes |
|---------------------|------------|----------------------|
| 0 | 1x | 5 minutes |
| 1 | 2x | 10 minutes |
| 2 | 4x | 20 minutes |
| 3 | 8x | 40 minutes |
| 4 | 16x | 80 minutes |
| 5+ | 32x (cap) | 160 minutes |

A single successful response (2xx) resets the failure count to 0 and restores normal scheduling immediately.

### AI Graceful Degradation

If the AI Planner is unavailable (API down, quota exceeded, disabled):
- The Scheduler continues running on baseline schedules
- Existing AI hints remain active until their TTL expires
- When hints expire, endpoints revert to baseline automatically
- No manual intervention required — the system self-heals

### Response Body Handling

- The AI reads response bodies up to **500 characters** (truncated for cost efficiency)
- If the response body is empty, malformed, or unparseable, the AI still sees the HTTP status code and execution metadata
- The AI never crashes or stops analyzing due to unexpected response formats — it gracefully handles any content

---

## See Also

- **[Quick Start](./quick-start.md)** - Create your first job
- **[How Scheduling Works](./technical/how-scheduling-works.md)** - Detailed scheduling logic
- **[Configuration and Constraints](./technical/configuration-and-constraints.md)** - Advanced configuration
