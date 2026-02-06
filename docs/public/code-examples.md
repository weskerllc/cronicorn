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
