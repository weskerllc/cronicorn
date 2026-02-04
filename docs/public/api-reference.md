---
id: api-reference
title: API Reference
description: Complete HTTP API reference for programmatic access to Cronicorn
tags:
  - user
  - api
  - reference
sidebar_position: 5
mcp:
  uri: file:///docs/api-reference.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-03T00:00:00Z
---

# API Reference

**TL;DR:** Access Cronicorn programmatically using API keys (`x-api-key` header) or bearer tokens (OAuth device flow). Base URL is your API host (e.g., `https://cronicorn.com/api` or `http://localhost:3333`).

## Authentication

### API Keys

Generate API keys in the web UI at `/settings/api-keys`.

```bash
curl -H "x-api-key: cron_abc123..." \
  https://cronicorn.com/api/jobs
```

### Bearer Tokens (OAuth Device Flow)

For CLI tools and AI agents:

```bash
# 1. Request device code
curl -X POST https://cronicorn.com/api/auth/device/code

# Response:
{
  "device_code": "DEVICE_CODE",
  "user_code": "ABCD-1234",
  "verification_uri": "https://cronicorn.com/device",
  "expires_in": 1800
}

# 2. User authorizes in browser

# 3. Poll for token
curl -X POST https://cronicorn.com/api/auth/device/token \
  -H "Content-Type: application/json" \
  -d '{"device_code": "DEVICE_CODE"}'

# Response:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 2592000
}

# 4. Use in requests
curl -H "Authorization: Bearer eyJ..." \
  https://cronicorn.com/api/jobs
```

---

## Jobs API

### Create Job

```bash
curl -X POST https://cronicorn.com/api/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Health Checks",
    "description": "Monitor our production APIs"
  }'
```

**Response:**
```json
{
  "id": "job_abc123",
  "name": "API Health Checks",
  "description": "Monitor our production APIs",
  "status": "active",
  "createdAt": "2026-02-03T12:00:00Z"
}
```

### List Jobs

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://cronicorn.com/api/jobs?status=active"
```

**Query Parameters:**
- `status` (optional): `active`, `paused`, or `archived`

### Get Job

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://cronicorn.com/api/jobs/job_abc123
```

### Update Job

```bash
curl -X PATCH https://cronicorn.com/api/jobs/job_abc123 \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Health Checks",
    "description": "Updated description"
  }'
```

### Archive Job

```bash
curl -X POST https://cronicorn.com/api/jobs/job_abc123/archive \
  -H "x-api-key: YOUR_API_KEY"
```

### Pause Job

```bash
curl -X POST https://cronicorn.com/api/jobs/job_abc123/pause \
  -H "x-api-key: YOUR_API_KEY"
```

### Resume Job

```bash
curl -X POST https://cronicorn.com/api/jobs/job_abc123/resume \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Endpoints API

### Add Endpoint

```bash
curl -X POST https://cronicorn.com/api/jobs/job_abc123/endpoints \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main API Health",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 900000,
    "timeoutMs": 30000
  }'
```

**Required Fields:**
- `name`: Display name
- `url`: HTTP endpoint URL
- `method`: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`

**Schedule (one required):**
- `baselineCron`: Cron expression (e.g., `"*/5 * * * *"`)
- `baselineIntervalMs`: Interval in milliseconds

**Optional Fields:**
- `description`: Context for AI analysis
- `minIntervalMs`: Minimum interval constraint
- `maxIntervalMs`: Maximum interval constraint
- `timeoutMs`: Request timeout (default: 30000)
- `maxResponseSizeKb`: Response size limit (default: 100)
- `headersJson`: Request headers object
- `bodyJson`: Request body (for POST/PUT/PATCH)

### List Endpoints

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://cronicorn.com/api/jobs/job_abc123/endpoints
```

### Get Endpoint

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://cronicorn.com/api/jobs/job_abc123/endpoints/ep_xyz789
```

### Update Endpoint

```bash
curl -X PATCH https://cronicorn.com/api/jobs/job_abc123/endpoints/ep_xyz789 \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "baselineIntervalMs": 600000,
    "description": "Updated monitoring interval"
  }'
```

### Archive Endpoint

```bash
curl -X POST https://cronicorn.com/api/jobs/job_abc123/endpoints/ep_xyz789/archive \
  -H "x-api-key: YOUR_API_KEY"
```

### Pause/Resume Endpoint

```bash
# Pause until specific time
curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/pause \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pausedUntil": "2026-02-03T14:00:00Z",
    "reason": "Maintenance window"
  }'

# Resume immediately
curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/pause \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pausedUntil": null,
    "reason": "Maintenance complete"
  }'
```

---

## AI Scheduling API

### Apply Interval Hint

Temporarily adjust execution frequency:

```bash
curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/hints/interval \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "intervalMs": 30000,
    "ttlMinutes": 60,
    "reason": "Increased monitoring during incident"
  }'
```

### Schedule One-Shot

Trigger a specific one-time execution:

```bash
curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/hints/oneshot \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nextRunAt": "2026-02-03T12:30:00Z",
    "ttlMinutes": 30,
    "reason": "Immediate investigation"
  }'
```

### Clear Hints

Reset to baseline schedule:

```bash
curl -X DELETE https://cronicorn.com/api/endpoints/ep_xyz789/hints \
  -H "x-api-key: YOUR_API_KEY"
```

### Reset Failures

Clear failure count (resets exponential backoff):

```bash
curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/reset-failures \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Runs API

### List Endpoint Runs

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://cronicorn.com/api/endpoints/ep_xyz789/runs?limit=20&status=failed"
```

**Query Parameters:**
- `limit` (optional): Number of runs (default: 20)
- `offset` (optional): Pagination offset
- `status` (optional): `success` or `failed`

### Get Run Details

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://cronicorn.com/api/runs/run_abc123
```

**Response:**
```json
{
  "id": "run_abc123",
  "endpointId": "ep_xyz789",
  "status": "success",
  "statusCode": 200,
  "durationMs": 145,
  "responseBody": { "healthy": true, "queue_depth": 45 },
  "startedAt": "2026-02-03T12:00:00Z",
  "completedAt": "2026-02-03T12:00:00.145Z",
  "source": "baseline-interval"
}
```

---

## Monitoring API

### Get Endpoint Health

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://cronicorn.com/api/endpoints/ep_xyz789/health?sinceHours=24"
```

**Response:**
```json
{
  "endpointId": "ep_xyz789",
  "successCount": 285,
  "failureCount": 3,
  "successRate": 98.96,
  "avgDurationMs": 142,
  "lastRunAt": "2026-02-03T12:00:00Z",
  "lastStatus": "success",
  "failureStreak": 0
}
```

### Get Dashboard Stats

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://cronicorn.com/api/dashboard?startDate=2026-02-01&endDate=2026-02-03"
```

---

## AI Analysis API

Access AI scheduling explanations and analysis history.

### List Analysis Sessions

Get AI analysis history for an endpoint to understand why scheduling decisions were made:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://cronicorn.com/api/endpoints/ep_xyz789/analysis-sessions?limit=10"
```

**Query Parameters:**
- `limit` (optional): Number of sessions (default: 10)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_abc123",
      "endpointId": "ep_xyz789",
      "createdAt": "2026-02-03T12:00:00Z",
      "reasoning": "Queue depth increased from 50 to 200 over last 5 runs. Tightening monitoring interval from 5 minutes to 30 seconds for next hour.",
      "toolsCalled": ["get_response_history", "propose_interval"],
      "tokenUsage": 1250,
      "durationMs": 3200,
      "nextAnalysisAt": "2026-02-03T13:00:00Z",
      "endpointFailureCount": 0
    }
  ],
  "total": 45,
  "hasMore": true
}
```

### Get Analysis Session Details

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://cronicorn.com/api/analysis-sessions/session_abc123
```

**Response:**
```json
{
  "id": "session_abc123",
  "endpointId": "ep_xyz789",
  "createdAt": "2026-02-03T12:00:00Z",
  "reasoning": "Queue depth increased from 50 to 200 over last 5 runs...",
  "toolsCalled": ["get_response_history", "propose_interval"],
  "actionsApplied": [
    {
      "tool": "propose_interval",
      "params": { "intervalMs": 30000, "ttlMinutes": 60 },
      "result": "success"
    }
  ],
  "tokenUsage": 1250,
  "durationMs": 3200,
  "confidence": "high"
}
```

---

## Dynamic Scheduling Based on System Load

You can programmatically override AI adaptation parameters based on external system metrics. This is useful for integrating Cronicorn with your existing monitoring infrastructure.

### Example: Tighten Monitoring During High Load

```bash
#!/bin/bash
# Script that runs from your monitoring system

# Get current CPU load from your infrastructure
CPU_LOAD=$(curl -s https://your-monitoring.com/api/cpu-load | jq '.value')

if (( $(echo "$CPU_LOAD > 80" | bc -l) )); then
  # High load detected: tighten monitoring to every 30 seconds
  curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/hints/interval \
    -H "x-api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "intervalMs": 30000,
      "ttlMinutes": 30,
      "reason": "High CPU load detected ('"$CPU_LOAD"'%), increasing monitoring frequency"
    }'
elif (( $(echo "$CPU_LOAD < 20" | bc -l) )); then
  # Low load: relax monitoring to every 10 minutes
  curl -X POST https://cronicorn.com/api/endpoints/ep_xyz789/hints/interval \
    -H "x-api-key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "intervalMs": 600000,
      "ttlMinutes": 60,
      "reason": "Low CPU load detected ('"$CPU_LOAD"'%), reducing monitoring frequency"
    }'
else
  # Normal load: clear any active hints to return to baseline
  curl -X DELETE https://cronicorn.com/api/endpoints/ep_xyz789/hints \
    -H "x-api-key: YOUR_API_KEY"
fi
```

### Example: Pause During Maintenance Windows

```bash
# Pause all endpoints in a job during scheduled maintenance
curl -X POST https://cronicorn.com/api/jobs/job_abc123/pause \
  -H "x-api-key: YOUR_API_KEY"

# ... perform maintenance ...

# Resume after maintenance
curl -X POST https://cronicorn.com/api/jobs/job_abc123/resume \
  -H "x-api-key: YOUR_API_KEY"
```

### Example: Webhook Integration for Auto-Scaling

Configure your endpoint to return system load metrics, and Cronicorn's AI will automatically adjust:

```json
// Your endpoint returns:
{
  "status": "healthy",
  "system_load": 85,
  "queue_depth": 500,
  "queue_max": 1000,
  "processing_rate_per_min": 150
}
```

The AI Planner sees these metrics and autonomously decides to tighten monitoring when load increases or relax when the system is idle.

---

## Common Response Formats

### Success Response

```json
{
  "id": "resource_id",
  "...": "resource data"
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid interval: must be at least 1000ms",
    "details": { "field": "baselineIntervalMs" }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Tier | Requests/minute | Burst |
|------|-----------------|-------|
| Free | 60 | 10 |
| Pro | 300 | 50 |
| Enterprise | Custom | Custom |

Rate limit headers:
- `X-RateLimit-Limit`: Requests allowed per minute
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## See Also

- **[Quick Start](./quick-start.md)** - Create your first job via UI
- **[MCP Server](./mcp-server.md)** - Manage jobs via AI assistant
- **[Technical Reference](./technical/reference.md)** - Schema and field details
