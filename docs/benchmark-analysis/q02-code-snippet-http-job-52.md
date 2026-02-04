# Benchmark Analysis: Q2 - Code Snippet for HTTP Job with Status Code Rules

**Score: 52/100**

## Question

> Write a code snippet showing how to define an HTTP job in Cronicorn that targets a specific endpoint and establish a rule that interprets the response status code to determine scheduling behavior.

## Current Capability Assessment

### What Cronicorn Provides

1. **HTTP API for Job/Endpoint Creation**: RESTful API to create jobs and add endpoints
2. **Status Code Capture**: All HTTP responses have their status codes recorded in `runs.statusCode`
3. **AI Interpretation**: AI Planner sees health metrics including success/failure rates derived from status codes
4. **MCP Server**: Conversational interface for job management

### What The Question Expects

The question asks for a "code snippet" suggesting users expect:
- Programmatic job creation
- Declarative rules for status code interpretation
- Direct cause-and-effect between status codes and scheduling

### Current Reality

Cronicorn does NOT have:
- A client SDK (no `@cronicorn/client` package)
- Declarative rule configuration (status code → action)
- Code-level job definition (no SDK for "define job in code")

Instead, Cronicorn works through:
- HTTP API calls (REST)
- MCP Server (conversational)
- Web UI (dashboard)

The AI interprets status codes implicitly, not through user-defined rules.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| No code examples for API usage | Users can't copy/paste | Only curl in API reference |
| No TypeScript/JS examples | Developers expect SDK-like examples | None |
| No status code rule examples | Question directly asks for this | Not documented |
| AI's status code interpretation not explained | Users don't understand the mechanism | Implicit in docs |

### Functionality Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| No client SDK | Medium | HTTP API works, but no typed client |
| No declarative rules | Low | AI handles this, but not user-configurable |
| No webhook on status change | Low | Future consideration |

## Recommended Documentation Improvements

### 1. Add Code Examples to `api-reference.md`

Add section: **"Code Examples"**

```markdown
## Code Examples

### TypeScript/JavaScript

#### Creating a Job with Endpoints

```typescript
const CRONICORN_API = 'https://api.cronicorn.app';
const API_KEY = process.env.CRONICORN_API_KEY;

async function createMonitoringJob() {
  // Create the job
  const jobResponse = await fetch(`${CRONICORN_API}/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Service Health Monitor',
      description: 'Monitors API health and adapts based on response status',
    }),
  });

  const job = await jobResponse.json();

  // Add an endpoint with scheduling configuration
  const endpointResponse = await fetch(
    `${CRONICORN_API}/jobs/${job.id}/endpoints`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'api-health-check',
        description: 'Checks API health, AI adapts based on HTTP status codes',
        url: 'https://api.example.com/health',
        method: 'GET',
        baselineIntervalMs: 60000,    // Check every minute
        minIntervalMs: 10000,          // Can speed up to 10 seconds
        maxIntervalMs: 300000,         // Won't slow beyond 5 minutes
        timeoutMs: 5000,               // 5 second timeout
      }),
    }
  );

  const endpoint = await endpointResponse.json();
  return { job, endpoint };
}
```

#### Response Structure for AI Interpretation

```typescript
// Your health endpoint should return data that helps AI make decisions
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  http_status: number;          // Echo the status code
  checks: {
    database: boolean;
    cache: boolean;
    external_api: boolean;
  };
  metrics: {
    response_time_ms: number;
    error_rate_pct: number;
    queue_depth: number;
  };
}

// Example response for healthy state (200 OK)
const healthyResponse: HealthResponse = {
  status: 'healthy',
  http_status: 200,
  checks: { database: true, cache: true, external_api: true },
  metrics: { response_time_ms: 45, error_rate_pct: 0.1, queue_depth: 5 },
};

// Example response for degraded state (503 Service Unavailable)
const degradedResponse: HealthResponse = {
  status: 'degraded',
  http_status: 503,
  checks: { database: true, cache: false, external_api: false },
  metrics: { response_time_ms: 2500, error_rate_pct: 15.5, queue_depth: 500 },
};
```

### Python

```python
import requests
import os

CRONICORN_API = 'https://api.cronicorn.app'
API_KEY = os.environ['CRONICORN_API_KEY']

def create_monitoring_job():
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }

    # Create job
    job_response = requests.post(
        f'{CRONICORN_API}/jobs',
        headers=headers,
        json={
            'name': 'Service Health Monitor',
            'description': 'Monitors API health with adaptive scheduling',
        }
    )
    job = job_response.json()

    # Add endpoint
    endpoint_response = requests.post(
        f'{CRONICORN_API}/jobs/{job["id"]}/endpoints',
        headers=headers,
        json={
            'name': 'api-health-check',
            'url': 'https://api.example.com/health',
            'method': 'GET',
            'baselineIntervalMs': 60000,
            'minIntervalMs': 10000,
            'maxIntervalMs': 300000,
        }
    )
    endpoint = endpoint_response.json()

    return job, endpoint
```
```

### 2. Add Section: **"How Status Codes Affect Scheduling"**

In `how-scheduling-works.md` or `how-ai-adaptation-works.md`:

```markdown
## How Status Codes Affect Scheduling

Cronicorn interprets HTTP status codes to influence scheduling behavior:

### Automatic Status Code Handling

| Status Code | Classification | Effect |
|-------------|----------------|--------|
| 2xx (Success) | Success | Normal scheduling, failure count resets |
| 4xx (Client Error) | Failed | Failure count increments, backoff applied |
| 5xx (Server Error) | Failed | Failure count increments, backoff applied |
| Timeout | Failed | Failure count increments, backoff applied |

### Exponential Backoff on Failures

When status codes indicate failure:
```
Failure 1: baselineInterval × 2
Failure 2: baselineInterval × 4
Failure 3: baselineInterval × 8
Failure 4: baselineInterval × 16
Failure 5+: baselineInterval × 32 (capped)
```

### AI Planner Status Code Analysis

The AI Planner sees multi-window success rates:
```
Window  | Success Rate | Interpretation
--------|--------------|---------------
1 hour  | 98%          | Healthy, maintain baseline
1 hour  | 75%          | Degraded, AI may tighten interval
1 hour  | 25%          | Unhealthy, AI may pause or investigate
```

### Influencing AI with Response Body

Include status context in response body for smarter AI decisions:

```json
{
  "http_status": 503,
  "status": "degraded",
  "reason": "database_overloaded",
  "expected_recovery_at": "2025-01-15T15:30:00Z",
  "recommendation": "reduce_polling"
}
```

AI will interpret:
- `status: degraded` → May tighten monitoring
- `recommendation: reduce_polling` → May propose longer interval
- `expected_recovery_at` → May pause until that time
```

### 3. Add Use Case: **"Status Code-Based Adaptive Monitoring"**

In `use-cases.md`:

```markdown
### Status Code-Based Adaptive Monitoring

**Scenario**: Monitor an API that returns different status codes based on health.

**Endpoint Configuration**:
```javascript
// Create via API
const endpoint = {
  name: 'payment-gateway-health',
  url: 'https://payments.example.com/health',
  baselineIntervalMs: 30000,     // 30 seconds normal
  minIntervalMs: 5000,            // 5 seconds during issues
  maxIntervalMs: 120000,          // 2 minutes when stable
};
```

**Expected Status Codes**:
| Status | Meaning | AI Response |
|--------|---------|-------------|
| 200 | Healthy | Maintain or relax to baseline |
| 429 | Rate limited | AI may propose longer interval |
| 503 | Degraded | AI tightens interval to monitor recovery |
| 500 | Error | Backoff applies, AI monitors for recovery |

**Response Body Design**:
```json
// 200 OK - Healthy
{
  "status": "healthy",
  "last_transaction_at": "2025-01-15T14:29:55Z",
  "transactions_per_minute": 150
}

// 503 Service Unavailable - Degraded
{
  "status": "degraded",
  "reason": "upstream_timeout",
  "healthy_backends": 2,
  "total_backends": 5,
  "degraded_since": "2025-01-15T14:25:00Z"
}
```

**AI Behavior**:
- Sees 503 responses in health metrics
- Queries response body, sees `degraded` status
- Proposes 5-second interval to monitor recovery
- When 200 returns consistently, clears hints
```

### 4. Consider: Simple TypeScript Client (Future)

A lightweight client would improve this score significantly:

```typescript
// Future: @cronicorn/client
import { Cronicorn } from '@cronicorn/client';

const cronicorn = new Cronicorn({ apiKey: process.env.CRONICORN_API_KEY });

// Create job with fluent API
const job = await cronicorn.jobs.create({
  name: 'Service Monitor',
});

// Add endpoint with type-safe configuration
const endpoint = await job.endpoints.add({
  name: 'api-health',
  url: 'https://api.example.com/health',
  schedule: {
    baseline: { interval: '1m' },
    constraints: { min: '10s', max: '5m' },
  },
});

// Programmatic hints (optional override)
await endpoint.scheduling.proposeInterval({
  interval: '30s',
  ttl: '15m',
  reason: 'Detected high error rate',
});
```

This is a larger feature investment but would directly address the question.

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add TypeScript/Python code examples | **HIGH** | Low | High - direct answer |
| Document status code → scheduling behavior | **HIGH** | Low | High - explains mechanism |
| Add status code use case | **MEDIUM** | Low | Medium - practical example |
| Consider TypeScript client SDK | **LOW** | High | High but major investment |

## Expected Score Improvement

With documentation improvements:
- Current: 52/100
- Expected: 75-80/100

A proper TypeScript client SDK would push to 90+, but that's a significant feature investment.

## Summary

**Primary Gap**: Documentation - no code examples showing how to programmatically create jobs and endpoints.

**Secondary Gap**: No explicit documentation of how status codes affect scheduling behavior.

**Tertiary Gap**: No client SDK - users must use raw HTTP API.

**Recommendation**:
1. Add comprehensive code examples (TypeScript, Python) to API reference
2. Document status code → scheduling behavior explicitly
3. Consider a lightweight TypeScript client SDK as future feature
