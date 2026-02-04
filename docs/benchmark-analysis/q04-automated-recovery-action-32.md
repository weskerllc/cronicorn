# Benchmark Analysis: Q4 - Automated Recovery Actions

**Score: 32/100**

## Question

> Describe how you would set up a Cronicorn job that triggers an automated recovery action when an HTTP endpoint returns a specific error code, then returns to normal polling once the service recovers.

## Root Cause of Low Score

**Multi-endpoint pattern not shown.** The question assumes complex webhook/trigger configuration, but Cronicorn solves this with multiple endpoints in one job where AI coordinates automatically through natural language descriptions.

## Cronicorn's Approach

This is a **two-endpoint pattern** within a single job:
1. **Health check endpoint** - monitors the service, returns status/error codes
2. **Recovery action endpoint** - triggers restart/recovery when needed

The AI sees both endpoints (sibling visibility), reads the health check response, and triggers the recovery endpoint when errors are detected. **The coordination is expressed in natural language descriptions.**

## Solution: Multi-Endpoint Job with Natural Language Descriptions

```
Job: "Service Health Monitor"

Endpoint 1: "health-check"
  URL: https://api.example.com/health
  Method: GET
  Baseline: Every 5 minutes
  Min Interval: 30 seconds

  Description:
  "Monitors the health of our main API service. Returns status codes
  and error information. When the service returns error codes (5xx)
  or indicates degraded/unhealthy status, the recovery-action endpoint
  should be triggered immediately to restart the service. During
  healthy operation, maintain normal 5-minute polling."

Endpoint 2: "recovery-action"
  URL: https://api.example.com/admin/restart
  Method: POST
  Baseline: Every 24 hours (rarely runs on its own)
  Min Interval: 5 minutes (prevent rapid retriggers)

  Description:
  "Recovery action that restarts the API service. This endpoint should
  only run when the health-check endpoint detects errors or unhealthy
  status. After triggering a recovery, wait at least 5 minutes before
  allowing another recovery attempt. Once health-check shows the
  service is healthy again, this endpoint returns to its long baseline."
```

## Key Insight: Descriptions ARE the Configuration

Users don't need to write code rules or configure webhooks. The natural language descriptions tell the AI:
- **When to trigger**: "when health-check detects errors"
- **Relationship**: "should only run when..."
- **Cooldown**: "wait at least 5 minutes before allowing another"
- **Return to normal**: "once healthy again, returns to baseline"

## Expected Response Bodies

**Health Check - Healthy:**
```json
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "last_error": null
}
```

**Health Check - Error Detected:**
```json
{
  "status": "error",
  "error_code": 503,
  "error_message": "Database connection failed",
  "consecutive_failures": 3
}
```

**Recovery Action - Success:**
```json
{
  "action": "restart",
  "status": "initiated",
  "previous_uptime_seconds": 3600
}
```

## How AI Coordinates This

1. **Normal operation**: Health-check runs every 5 minutes, returns healthy
2. **Error detected**: Health-check returns error status
3. **AI sees sibling context**: Reads health-check response via `get_sibling_latest_responses`
4. **Description guides action**: AI reads recovery-action's description saying "should run when health-check detects errors"
5. **Triggers recovery**: AI proposes immediate run for recovery-action endpoint
6. **Cooldown enforced**: `minIntervalMs` prevents rapid re-triggers
7. **Return to normal**: Once health-check shows healthy, recovery-action returns to 24-hour baseline

## What Documentation Needs

### 1. Multi-Endpoint Recovery Example with Descriptions

Add to use cases or coordinating-endpoints documentation:

```markdown
## Use Case: Automated Service Recovery

**Scenario**: Monitor a service and automatically trigger recovery when errors occur.

**Solution**: Create one job with two endpoints. Express the relationship in descriptions.

### Endpoint Descriptions

**health-check:**
"Monitors service health. When errors are detected, the recovery-action
endpoint should be triggered immediately."

**recovery-action:**
"Triggers service restart. Only run when health-check shows errors.
After triggering, wait at least 5 minutes before allowing another attempt."

### Why This Works

- Both endpoints are in the same job (sibling visibility)
- AI reads both descriptions and understands the relationship
- AI sees health-check response, knows to trigger recovery-action
- No code, no webhooks, no explicit rules - just clear descriptions
```

### 2. Explain Sibling Visibility

```markdown
## How Endpoints Coordinate

When you put multiple endpoints in one job:
- AI can see all their responses
- Describe relationships in natural language
- AI coordinates based on your descriptions

**Example descriptions that coordinate:**
- "When endpoint-A shows X, endpoint-B should run"
- "Only run after sibling endpoint completes"
- "Wait for health-check before processing"
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Multi-endpoint recovery example not shown | Documentation | Add use case with descriptions |
| Sibling visibility not explained clearly | Documentation | Add coordination explanation |
| Description examples for this use case | Documentation | Add sample description text |

## Priority

**HIGH** - This is the lowest-scoring question and represents a core use case.

## Expected Improvement

- Current: 32/100
- With multi-endpoint example and description samples: **75-85/100**

The pattern works today; users just need to see how to express it in descriptions.
