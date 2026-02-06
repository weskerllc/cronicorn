---
id: automated-error-recovery
title: Automated Error Recovery
description: Set up automated recovery when HTTP endpoints return error status codes, with sibling coordination and cooldown periods
tags:
  - user
  - error-recovery
  - status-codes
  - automation
  - recovery-actions
  - assistant
sidebar_position: 4.5
mcp:
  uri: file:///docs/automated-error-recovery.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-06T00:00:00Z
---

# Automated Error Recovery

Set up automated recovery workflows in Cronicorn — no code, no webhooks, no event handlers to write. The AI reads your endpoint responses and triggers recovery actions automatically.

## How Automated Recovery Works in Cronicorn

Automated recovery uses **two endpoints in one job**:

1. **Health-check endpoint** — Monitors your service and returns status data
2. **Recovery endpoint** — Triggers a recovery action (restart, failover, cache clear, etc.)

Because both endpoints are in the **same job**, they are **siblings**. The AI can call `get_sibling_latest_responses()` to read data from the health-check when analyzing the recovery endpoint, and vice versa. This is how coordination happens — automatically, with no code.

**You write no parsing code, no rules engine, and no DSL.** The AI:
1. Reads the health-check response body
2. Interprets fields against the endpoint's `description`
3. Triggers the recovery endpoint via `propose_next_time()` when conditions match
4. Respects cooldown periods described in the recovery endpoint's `description`

## How HTTP Status Codes Drive Scheduling

Cronicorn has **built-in** status code handling — no configuration needed:

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

## How the AI Detects Specific Error Codes

There are two layers of error detection:

1. **Built-in (automatic, no config needed):** HTTP 4xx/5xx responses automatically increment the failure count and trigger exponential backoff. This happens for every endpoint regardless of description.

2. **AI-enhanced (via description):** The AI reads the response body and reacts based on your description. This handles application-level errors in 2xx responses (e.g., `{"status": "error", "needs_recovery": true}`) and adds context-aware reactions on top of built-in behavior.

The `description` field is how you tell the AI what to do about specific errors. The AI can also override backoff by proposing a tighter interval hint when you want to actively monitor rather than back off.

## Complete Setup via API

Create a single job with TWO endpoints — placing them in the same job gives the AI **sibling visibility**:

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

## Complete Setup via MCP Tools

The same setup using MCP tool calls from your AI assistant:

```json
// Tool: createJob
{
  "name": "Service Recovery Automation",
  "description": "Monitors service health and triggers automated recovery when errors are detected"
}
// Response: { "id": "job_abc123", "name": "Service Recovery Automation", "status": "active" }

// Tool: addEndpoint
{
  "jobId": "job_abc123",
  "name": "health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "timeoutMs": 10000,
  "description": "Monitors service health. When status is error, needs_recovery is true, or HTTP response returns 5xx status codes, the trigger-recovery sibling endpoint should run immediately via one-shot. During errors, tighten monitoring to every 30 seconds. Return to 5-minute baseline when status returns to ok."
}
// Response: { "id": "ep_health123", "name": "health-check", ... }

// Tool: addEndpoint
{
  "jobId": "job_abc123",
  "name": "trigger-recovery",
  "url": "https://api.example.com/admin/restart",
  "method": "POST",
  "baselineIntervalMs": 86400000,
  "minIntervalMs": 300000,
  "timeoutMs": 30000,
  "description": "Recovery action that restarts the service. Should only run when health-check sibling shows status error or needs_recovery is true. After triggering, wait at least 5 minutes before another attempt. Maximum 3 recovery attempts before pausing for 1 hour."
}
// Response: { "id": "ep_recovery456", "name": "trigger-recovery", ... }
```

## Complete Setup via JavaScript

The same setup using `fetch()`:

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.cronicorn.com';

// Create the job
const jobResponse = await fetch(`${BASE_URL}/api/jobs`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Service Recovery Automation',
    description: 'Monitors service health and triggers automated recovery when errors are detected'
  })
});
const job = await jobResponse.json();
console.log('Created job:', job.id);

// Add health-check endpoint
const healthResponse = await fetch(`${BASE_URL}/api/jobs/${job.id}/endpoints`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'health-check',
    url: 'https://api.example.com/health',
    method: 'GET',
    baselineIntervalMs: 300000,
    minIntervalMs: 30000,
    timeoutMs: 10000,
    description: 'Monitors service health. When status is error or needs_recovery is true, the trigger-recovery sibling should run immediately. Tighten to 30s during errors. Return to baseline when status is ok.'
  })
});
const healthEndpoint = await healthResponse.json();
console.log('Created health-check:', healthEndpoint.id);

// Add recovery endpoint (same job = sibling)
const recoveryResponse = await fetch(`${BASE_URL}/api/jobs/${job.id}/endpoints`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'trigger-recovery',
    url: 'https://api.example.com/admin/restart',
    method: 'POST',
    baselineIntervalMs: 86400000,
    minIntervalMs: 300000,
    timeoutMs: 30000,
    description: 'Recovery action. Only run when health-check sibling shows errors. Wait 5 minutes between attempts. Max 3 attempts before pausing 1 hour.'
  })
});
const recoveryEndpoint = await recoveryResponse.json();
console.log('Created trigger-recovery:', recoveryEndpoint.id);
```

## Designing Your Recovery Response Bodies

**Health check endpoint (`GET /health`) — when healthy:**
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

**Health check endpoint — when failing (or when HTTP returns 500/503):**
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

**Recovery endpoint (`POST /admin/restart`) — success:**
```json
{
  "action": "restart",
  "result": "initiated",
  "restart_time": "2026-02-03T12:06:00Z",
  "estimated_recovery_seconds": 30,
  "attempt_number": 1
}
```

**Health check endpoint — after recovery:**
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

## What the AI Does: Step-by-Step

### Step 1: Error Detection

1. AI analyzes health-check → calls `get_latest_response()`
2. Sees `{ "status": "error", "needs_recovery": true }`
3. Reads description: "trigger-recovery sibling should run immediately"
4. Calls `get_sibling_latest_responses()` → sees trigger-recovery on 24h baseline
5. Calls `propose_next_time()` on trigger-recovery for immediate execution
6. Calls `propose_interval(intervalMs=30000, ttlMinutes=60)` on health-check for close monitoring
7. Reasoning: "Service errors detected, triggering recovery and tightening health monitoring"

### Step 2: Recovery Triggered

The Scheduler executes trigger-recovery → `POST /admin/restart`
Response: `{ "action": "restart", "result": "initiated", "attempt_number": 1 }`

### Step 3: Recovery Succeeds

1. AI analyzes health-check → calls `get_latest_response()`
2. Sees `{ "status": "ok", "error_count": 0, "recovered_at": "..." }`
3. Calls `get_response_history(limit=5)` → confirms sustained recovery
4. Calls `clear_hints()` on health-check → returns to 5-minute baseline
5. Reasoning: "Service recovered, clearing hints to return to baseline monitoring"

### Step 4: Recovery Fails (Multiple Attempts)

1. AI analyzes health-check → sees ongoing errors after recovery attempt
2. Calls `get_sibling_latest_responses()` → sees trigger-recovery has run 3 times recently
3. Reads description: "Maximum 3 recovery attempts before pausing for 1 hour"
4. Calls `pause_until(now + 1 hour)` on trigger-recovery
5. Keeps health-check on tight monitoring to detect external intervention
6. Reasoning: "3 recovery attempts failed, pausing recovery to avoid loops"

## Verifying and Debugging

### Check AI Analysis Sessions

See what the AI decided and why:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/analysis-sessions?limit=5"
```

Look for:
- `reasoning` — The AI's explanation of what it saw and why it acted
- `toolsCalled` — Which scheduling tools were invoked
- `actionsApplied` — The actual parameters used

### Manually Override During an Incident

Force an immediate recovery attempt:

```bash
curl -X POST https://api.cronicorn.com/api/endpoints/ep_recovery456/hints/oneshot \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nextRunInMs": 1000,
    "ttlMinutes": 5,
    "reason": "Manual: forcing immediate recovery attempt"
  }'
```

### Reset Failure Count

If exponential backoff has kicked in:

```bash
curl -X POST https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/reset-failures \
  -H "x-api-key: YOUR_API_KEY"
```

### Check Endpoint Health

View success/failure rates over the last 24 hours:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.cronicorn.com/api/endpoints/ENDPOINT_ID/health?sinceHours=24"
```

Response:
```json
{
  "successCount": 285,
  "failureCount": 3,
  "successRate": 98.96,
  "avgDurationMs": 142,
  "failureStreak": 0
}
```

---

## See Also

- **[Recipes](./recipes.md#recipe-2-automated-error-recovery-with-status-code-handling)** — Recipe 2 covers this same pattern
- **[Core Concepts](./core-concepts.md)** — Understanding jobs, endpoints, and descriptions
- **[Code Examples](./code-examples.md)** — JavaScript, TypeScript, Python, and MCP tool examples
- **[API Reference](./api-reference.md)** — Complete HTTP API documentation
- **[Coordinating Multiple Endpoints](./technical/coordinating-multiple-endpoints.md)** — Advanced coordination patterns
