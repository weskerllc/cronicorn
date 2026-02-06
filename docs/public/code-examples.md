---
id: code-examples
title: Code Examples
description: JavaScript, TypeScript, Python, and MCP tool examples for creating jobs, endpoints, and managing adaptive scheduling
tags:
  - user
  - code-examples
  - javascript
  - typescript
  - python
  - mcp-tools
  - programmatic
  - assistant
sidebar_position: 6
mcp:
  uri: file:///docs/code-examples.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-06T00:00:00Z
---

# Code Examples

Programmatic examples for creating jobs, configuring endpoints, and managing adaptive scheduling in JavaScript/TypeScript, Python, and via MCP tool calls.

All examples use the Cronicorn HTTP API. Authenticate with an API key (`x-api-key` header) generated in Settings → API Keys.

## JavaScript/TypeScript: Creating a Job with Status-Code-Aware Scheduling

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.cronicorn.com';

async function createHealthMonitoringJob() {
  // Step 1: Create the job
  const jobResponse = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Production API Monitoring',
      description: 'Monitors API health with adaptive frequency during incidents'
    })
  });

  if (!jobResponse.ok) {
    const error = await jobResponse.json();
    throw new Error(`Failed to create job: ${error.error?.message}`);
  }

  const job = await jobResponse.json();
  console.log('Created job:', job.id);

  // Step 2: Add endpoint with status-code-aware description
  const endpointResponse = await fetch(`${BASE_URL}/api/jobs/${job.id}/endpoints`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'api-health-check',
      url: 'https://api.example.com/health',
      method: 'GET',
      baselineIntervalMs: 300000,    // 5 minutes
      minIntervalMs: 30000,          // 30 seconds floor
      maxIntervalMs: 900000,         // 15 minutes ceiling
      timeoutMs: 10000,
      description: 'Monitor API health. When HTTP 5xx errors occur, Cronicorn automatically applies exponential backoff. Additionally, when the response body shows error_rate_pct > 5%, tighten polling to 30 seconds. Return to baseline when error_rate_pct < 2% and status is healthy.'
    })
  });

  if (!endpointResponse.ok) {
    const error = await endpointResponse.json();
    throw new Error(`Failed to create endpoint: ${error.error?.message}`);
  }

  const endpoint = await endpointResponse.json();
  console.log('Created endpoint:', endpoint.id);
  console.log('Cronicorn is now polling every 5 minutes with AI adaptation enabled.');

  return { job, endpoint };
}

createHealthMonitoringJob().catch(console.error);
```

## JavaScript/TypeScript: Applying Interval Hints Programmatically

```javascript
// Tighten monitoring to every 30 seconds for 1 hour during an incident
async function tightenMonitoring(endpointId, intervalMs = 30000, ttlMinutes = 60) {
  const response = await fetch(
    `${BASE_URL}/api/endpoints/${endpointId}/hints/interval`,
    {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intervalMs,
        ttlMinutes,
        reason: `Manual override: tightening to ${intervalMs}ms for ${ttlMinutes} minutes`
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to apply hint: ${response.statusText}`);
  }

  console.log(`Monitoring tightened to ${intervalMs}ms for ${ttlMinutes} minutes`);
}

// Clear all hints and return to baseline
async function returnToBaseline(endpointId) {
  const response = await fetch(
    `${BASE_URL}/api/endpoints/${endpointId}/hints`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to clear hints: ${response.statusText}`);
  }

  console.log('Hints cleared, returning to baseline schedule');
}
```

## JavaScript/TypeScript: Checking Endpoint Health and Run History

```javascript
// Get endpoint health summary
async function checkHealth(endpointId, sinceHours = 24) {
  const response = await fetch(
    `${BASE_URL}/api/endpoints/${endpointId}/health?sinceHours=${sinceHours}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const health = await response.json();

  console.log(`Success rate: ${health.successRate}%`);
  console.log(`Failures: ${health.failureCount}`);
  console.log(`Avg duration: ${health.avgDurationMs}ms`);
  console.log(`Current failure streak: ${health.failureStreak}`);

  return health;
}

// Get recent run history
async function getRecentRuns(endpointId, limit = 10, status) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);

  const response = await fetch(
    `${BASE_URL}/api/endpoints/${endpointId}/runs?${params}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const runs = await response.json();

  for (const run of runs) {
    console.log(`${run.status} | ${run.statusCode} | ${run.durationMs}ms | ${run.startedAt}`);
  }

  return runs;
}

// Check AI analysis sessions to understand scheduling decisions
async function getAIDecisions(endpointId, limit = 5) {
  const response = await fetch(
    `${BASE_URL}/api/endpoints/${endpointId}/analysis-sessions?limit=${limit}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const { sessions } = await response.json();

  for (const session of sessions) {
    console.log(`[${session.createdAt}] ${session.reasoning}`);
    console.log(`  Tools called: ${session.toolsCalled.join(', ')}`);
  }

  return sessions;
}
```

## Python: Creating a Job and Endpoint

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.cronicorn.com"
HEADERS = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Create the job
job_response = requests.post(
    f"{BASE_URL}/api/jobs",
    headers=HEADERS,
    json={
        "name": "Production API Monitoring",
        "description": "Monitors API health with adaptive frequency"
    }
)
job_response.raise_for_status()
job = job_response.json()
print(f"Created job: {job['id']}")

# Add endpoint with AI-adaptive description
endpoint_response = requests.post(
    f"{BASE_URL}/api/jobs/{job['id']}/endpoints",
    headers=HEADERS,
    json={
        "name": "api-health-check",
        "url": "https://api.example.com/health",
        "method": "GET",
        "baselineIntervalMs": 300000,    # 5 minutes
        "minIntervalMs": 30000,          # 30 seconds floor
        "maxIntervalMs": 900000,         # 15 minutes ceiling
        "timeoutMs": 10000,
        "description": (
            "Monitor API health. Poll every 30 seconds when status is degraded "
            "or error_rate_pct > 5%. Return to baseline when healthy and "
            "error_rate_pct < 2%."
        )
    }
)
endpoint_response.raise_for_status()
endpoint = endpoint_response.json()
print(f"Created endpoint: {endpoint['id']}")
print("Cronicorn is now polling every 5 minutes with AI adaptation enabled.")
```

## Python: Dynamic Scheduling Based on External Metrics

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.cronicorn.com"
ENDPOINT_ID = "ep_xyz789"
HEADERS = {"x-api-key": API_KEY, "Content-Type": "application/json"}

def adjust_scheduling_from_metrics():
    """Check external metrics and apply Cronicorn scheduling hints."""

    # Get metrics from your monitoring system
    metrics = requests.get("https://your-monitoring.com/api/metrics").json()
    error_rate = metrics.get("error_rate_pct", 0)
    cpu_load = metrics.get("cpu_load_pct", 0)

    if error_rate > 10 or cpu_load > 90:
        # Critical: tighten to 30 seconds for 30 minutes
        requests.post(
            f"{BASE_URL}/api/endpoints/{ENDPOINT_ID}/hints/interval",
            headers=HEADERS,
            json={
                "intervalMs": 30000,
                "ttlMinutes": 30,
                "reason": f"Critical: error_rate={error_rate}%, cpu={cpu_load}%"
            }
        )
        print(f"Tightened to 30s (error_rate={error_rate}%, cpu={cpu_load}%)")

    elif error_rate > 5:
        # Warning: tighten to 1 minute for 15 minutes
        requests.post(
            f"{BASE_URL}/api/endpoints/{ENDPOINT_ID}/hints/interval",
            headers=HEADERS,
            json={
                "intervalMs": 60000,
                "ttlMinutes": 15,
                "reason": f"Warning: error_rate={error_rate}%"
            }
        )
        print(f"Tightened to 1min (error_rate={error_rate}%)")

    else:
        # Normal: clear hints, return to baseline
        requests.delete(
            f"{BASE_URL}/api/endpoints/{ENDPOINT_ID}/hints",
            headers={"x-api-key": API_KEY}
        )
        print("Normal: returned to baseline")

# Run periodically from your monitoring system
adjust_scheduling_from_metrics()
```

## MCP Tool Call Examples

These are the exact tool invocations your AI assistant makes when managing Cronicorn via the MCP Server.

### Creating a Job

```json
// Tool: createJob
// Input:
{ "name": "Production API Monitoring", "description": "Monitors API health with adaptive frequency" }

// Response:
{ "id": "job_abc123", "name": "Production API Monitoring", "status": "active", "createdAt": "2026-02-03T12:00:00Z" }
```

### Adding an Endpoint with Status-Code-Aware Description

```json
// Tool: addEndpoint
// Input:
{
  "jobId": "job_abc123",
  "name": "api-health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 900000,
  "timeoutMs": 10000,
  "description": "Poll every 30s when status is degraded or error_rate_pct > 5%. Return to baseline when healthy and error_rate_pct < 2%."
}

// Response:
{ "id": "ep_xyz789", "name": "api-health-check", "jobId": "job_abc123", "baselineIntervalMs": 300000 }
```

### Manually Overriding Frequency During an Incident

```json
// Tool: applyIntervalHint
// Input:
{ "id": "ep_xyz789", "intervalMs": 30000, "ttlMinutes": 60, "reason": "Incident detected — tightening monitoring" }

// Response:
{ "success": true, "intervalMs": 30000, "expiresAt": "2026-02-03T13:00:00Z" }
```

### Checking Endpoint Health

```json
// Tool: getEndpointHealth
// Input:
{ "id": "ep_xyz789", "sinceHours": 24 }

// Response:
{ "successCount": 285, "failureCount": 3, "successRate": 98.96, "avgDurationMs": 142, "failureStreak": 0 }
```

### Debugging a Failing Endpoint

```json
// Tool: listEndpointRuns
// Input:
{ "id": "ep_xyz789", "limit": 5, "status": "failed" }

// Response:
{ "runs": [
  { "id": "run_001", "status": "failed", "statusCode": 503, "error": "Service Unavailable", "startedAt": "2026-02-03T12:00:00Z" },
  { "id": "run_002", "status": "failed", "statusCode": 500, "error": "Internal Server Error", "startedAt": "2026-02-03T11:55:00Z" }
]}

// Tool: resetFailures
// Input:
{ "id": "ep_xyz789" }

// Response:
{ "success": true, "failureCount": 0 }
```

### Scheduling a One-Shot Run

```json
// Tool: scheduleOneShot
// Input:
{ "id": "ep_xyz789", "nextRunInMs": 5000, "reason": "Immediate check after deployment" }

// Response:
{ "success": true, "nextRunAt": "2026-02-03T12:00:05Z" }
```

## JavaScript: Inverse Load Scaling (Poll Less Under Load)

A complete example showing how to configure an endpoint that polls **less frequently** when system load is high (reducing overhead) and **more frequently** when load is low (the system has capacity).

**Important: You don't write scaling logic.** Cronicorn's AI reads the response body fields and applies the scaling rules from your `description` automatically. The code below creates the job — the AI handles all runtime decisions.

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.cronicorn.com';
const headers = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' };

async function createInverseScalingJob() {
  // Step 1: Create the job
  const jobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'System Load Monitor',
      description: 'Monitors system load with inverse scaling — polls less under high load'
    })
  });
  if (!jobRes.ok) throw new Error(`Job creation failed: ${(await jobRes.json()).error?.message}`);
  const job = await jobRes.json();

  // Step 2: Add endpoint with inverse scaling description
  // The description tells the AI to poll LESS when load is HIGH.
  // The AI reads cpu_pct, memory_pct, and recommendation from the response body.
  // No parsing code needed — the AI interprets these fields automatically.
  const epRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/endpoints`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'system-load',
      url: 'https://api.example.com/metrics/load',
      method: 'GET',
      baselineIntervalMs: 60000,      // 1 minute baseline
      minIntervalMs: 10000,           // 10 second floor
      maxIntervalMs: 300000,          // 5 minute ceiling
      timeoutMs: 5000,
      description: 'Monitors system load. INVERSE SCALING: when cpu_pct is HIGH (above 80), poll LESS frequently (5 minutes) to reduce overhead. When cpu_pct is MODERATE (50-80), poll every 2-3 minutes. When cpu_pct is LOW (below 50), poll every 30 seconds since the system has capacity. If memory_pct exceeds 90, pause for 5 minutes regardless of CPU. If the recommendation field is reduce_polling, always extend interval.'
    })
  });
  if (!epRes.ok) throw new Error(`Endpoint creation failed: ${(await epRes.json()).error?.message}`);
  const endpoint = await epRes.json();

  console.log(`Created job ${job.id} with endpoint ${endpoint.id}`);
  console.log('Cronicorn is now polling every 1 minute.');
  console.log('The AI will automatically poll LESS under high load and MORE under low load.');
  return { job, endpoint };
}

createInverseScalingJob().catch(console.error);
```

**Your endpoint (`GET /metrics/load`) should return:**

```json
{
  "cpu_pct": 85,
  "memory_pct": 72,
  "load_avg_1m": 4.2,
  "load_avg_5m": 3.8,
  "recommendation": "reduce_polling",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

**What the AI does at runtime (you don't write this code):**

1. AI calls `get_latest_response()` → reads `cpu_pct: 85`, `recommendation: "reduce_polling"`
2. AI reads the description: "when cpu_pct is HIGH (above 80), poll LESS frequently (5 minutes)"
3. AI calls `propose_interval(intervalMs=300000, ttlMinutes=30, reason="CPU at 85%, reducing polling to 5 minutes")`
4. Governor clamps to maxIntervalMs (300000) → endpoint runs every 5 minutes

When load drops:
1. AI calls `get_latest_response()` → reads `cpu_pct: 35`, `recommendation: null`
2. AI reads the description: "when cpu_pct is LOW (below 50), poll every 30 seconds"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=15, reason="CPU at 35%, system has capacity")`
4. Governor clamps to minIntervalMs (10000) is satisfied → endpoint runs every 30 seconds

## JavaScript: Data Sync with Volume-Based Frequency

Configure a data synchronization endpoint that polls more frequently when there's a large backlog and relaxes when caught up.

**You don't write the frequency adjustment logic.** The AI reads `records_pending` from the response body and adjusts the interval based on thresholds in your `description`.

```javascript
async function createDataSyncJob() {
  const headers = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' };

  const jobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'Data Sync Monitor',
      description: 'Monitors data sync status and adapts frequency based on pending volume'
    })
  });
  if (!jobRes.ok) throw new Error(`Job creation failed: ${(await jobRes.json()).error?.message}`);
  const job = await jobRes.json();

  const epRes = await fetch(`${BASE_URL}/api/jobs/${job.id}/endpoints`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'sync-status',
      url: 'https://api.example.com/sync/status',
      method: 'GET',
      baselineIntervalMs: 600000,      // 10 minutes
      minIntervalMs: 30000,            // 30 seconds floor
      maxIntervalMs: 1800000,          // 30 minutes ceiling
      timeoutMs: 15000,
      description: 'Checks data sync status. When records_pending exceeds 1000, poll every 30 seconds. When records_pending is 100-1000, poll every 2 minutes. When records_pending drops below 100 (caught up), return to 10-minute baseline. If sync_rate_per_minute drops below 50, tighten to 1 minute to investigate.'
    })
  });
  if (!epRes.ok) throw new Error(`Endpoint creation failed: ${(await epRes.json()).error?.message}`);
  const endpoint = await epRes.json();

  console.log(`Sync monitor running: job=${job.id}, endpoint=${endpoint.id}`);
  return { job, endpoint };
}
```

**Your sync endpoint should return:**

```json
{
  "records_pending": 15000,
  "records_synced_total": 250000,
  "sync_rate_per_minute": 500,
  "status": "syncing",
  "timestamp": "2026-02-03T12:01:00Z"
}
```

The AI reads `records_pending: 15000`, compares to the threshold (> 1000) in the description, and calls `propose_interval(30000)`. When `records_pending` drops below 100, the AI calls `clear_hints()` to return to the 10-minute baseline. No code needed for the frequency logic.

## Verifying Your Setup

After creating a job and endpoints, verify everything is working:

```javascript
async function verifySetup(endpointId) {
  const headers = { 'x-api-key': API_KEY };

  // 1. Check the endpoint exists and is configured correctly
  const epRes = await fetch(`${BASE_URL}/api/endpoints/${endpointId}`, { headers });
  if (!epRes.ok) throw new Error(`Endpoint not found: ${epRes.statusText}`);
  const ep = await epRes.json();
  console.log(`Endpoint: ${ep.name}`);
  console.log(`  Baseline: ${ep.baselineIntervalMs}ms`);
  console.log(`  Min: ${ep.minIntervalMs}ms, Max: ${ep.maxIntervalMs}ms`);
  console.log(`  Description: ${ep.description?.substring(0, 100)}...`);

  // 2. Check recent runs to verify the endpoint is executing
  const runsRes = await fetch(`${BASE_URL}/api/endpoints/${endpointId}/runs?limit=5`, { headers });
  const runs = await runsRes.json();
  if (runs.length === 0) {
    console.log('  No runs yet — wait for the baseline interval to elapse');
  } else {
    console.log(`  Last ${runs.length} runs:`);
    for (const run of runs) {
      console.log(`    ${run.status} | HTTP ${run.statusCode} | ${run.durationMs}ms | ${run.startedAt}`);
    }
  }

  // 3. Check health metrics
  const healthRes = await fetch(`${BASE_URL}/api/endpoints/${endpointId}/health?sinceHours=24`, { headers });
  const health = await healthRes.json();
  console.log(`  Health: ${health.successRate}% success (${health.successCount}/${health.successCount + health.failureCount})`);

  // 4. Check AI analysis sessions to verify AI is making decisions
  const aiRes = await fetch(`${BASE_URL}/api/endpoints/${endpointId}/analysis-sessions?limit=3`, { headers });
  const { sessions } = await aiRes.json();
  if (sessions.length === 0) {
    console.log('  No AI sessions yet — the AI Planner analyzes endpoints periodically');
  } else {
    console.log(`  Recent AI decisions:`);
    for (const s of sessions) {
      console.log(`    [${s.createdAt}] ${s.reasoning}`);
      console.log(`      Tools: ${s.toolsCalled.join(', ')}`);
    }
  }
}

// Usage: verifySetup('ep_xyz789');
```

```python
# Python equivalent
import requests

def verify_setup(endpoint_id):
    headers = {"x-api-key": API_KEY}

    # Check recent runs
    runs = requests.get(f"{BASE_URL}/api/endpoints/{endpoint_id}/runs?limit=5", headers=headers).json()
    for run in runs:
        print(f"  {run['status']} | HTTP {run.get('statusCode')} | {run['durationMs']}ms")

    # Check AI decisions
    sessions = requests.get(f"{BASE_URL}/api/endpoints/{endpoint_id}/analysis-sessions?limit=3", headers=headers).json()
    for s in sessions.get("sessions", []):
        print(f"  [{s['createdAt']}] {s['reasoning']}")
        print(f"    Tools: {', '.join(s['toolsCalled'])}")
```

For more verification examples, see [Recipes: Verifying AI Decisions](./recipes.md#verifying-ai-decisions).

## Status Code-Based Scheduling: How It Works

Understanding how HTTP status codes interact with AI scheduling:

### Built-In Behavior (Automatic, No Configuration)

Every endpoint gets this behavior for free:

- **2xx responses** → Success, failure count resets to 0, normal scheduling continues
- **4xx/5xx responses** → Failure, failure count increments, exponential backoff applies (baseline × 2^failures, capped at 32×)
- **Timeouts** → Treated as failure, same backoff behavior

### AI Enhancement (Via Description Field)

The `description` field adds context-aware reactions **on top of** built-in behavior:

```json
{
  "description": "Monitor API health. When HTTP 5xx errors occur, Cronicorn automatically backs off. Additionally, when the response body shows error_rate_pct > 5%, tighten polling to 30 seconds even on 2xx responses. Return to baseline when error_rate_pct < 2%."
}
```

This means:
- A 500 response triggers **both** automatic backoff **and** AI analysis
- The AI can **override** backoff by proposing a tighter interval hint (useful for active monitoring during incidents)
- A 200 response with `{"error_rate_pct": 8.5}` triggers AI tightening even though the HTTP call succeeded

### How Backoff and AI Hints Interact

AI interval hints **override** the baseline (including backoff). When the hint expires (TTL), scheduling returns to the backoff-adjusted baseline:

1. Endpoint fails → backoff kicks in (e.g., 10 minutes)
2. AI proposes 30s interval hint with 60-minute TTL → endpoint runs every 30s
3. Hint expires after 60 minutes → scheduling returns to backoff-adjusted baseline
4. Endpoint succeeds → failure count resets to 0, normal baseline resumes

---

## See Also

- **[API Reference](./api-reference.md)** — Complete HTTP API documentation
- **[MCP Server](./mcp-server.md)** — Setup and tool reference
- **[Recipes](./recipes.md)** — Complete workflow examples
- **[Automated Error Recovery](./automated-error-recovery.md)** — Recovery workflow setup
- **[Core Concepts](./core-concepts.md)** — Understanding jobs, endpoints, and descriptions
