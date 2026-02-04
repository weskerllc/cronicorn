# Benchmark Analysis: Q1 - Increase Frequency on Degraded State

**Score: 80/100**

## Question

> How would you configure a Cronicorn job to monitor a service endpoint and automatically increase polling frequency from 5 minutes to 30 seconds when the HTTP response indicates a degraded state?

## Current Capability Assessment

### What Cronicorn CAN Do Today

1. **Baseline Interval**: Set `baselineIntervalMs: 300000` (5 minutes)
2. **Min Interval Constraint**: Set `minIntervalMs: 30000` (30 seconds)
3. **AI Interprets Status**: AI reads response body for `status: degraded`
4. **Dynamic Tightening**: AI proposes shorter intervals via `propose_interval`
5. **TTL-Based Return**: Hints expire, returning to baseline when healthy

### This Is a Core Use Case

This question describes Cronicorn's primary adaptive scheduling use case. The 80/100 score suggests documentation exists but may not be prominent or complete enough.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| No step-by-step "degraded state monitoring" guide | Common use case buried | Mentioned in examples |
| Configuration walkthrough missing | Users need explicit steps | Scattered across docs |
| Response design for status not prominent | Users miss requirements | In technical docs |
| Expected AI behavior not explicit | Users unsure what happens | Implicit |

### Functionality Assessment

**Fully supported** - this is the core use case. Documentation just needs to make it more prominent and explicit.

## Recommended Documentation Improvements

### 1. Add to Quick Start: **"Your First Adaptive Monitor"**

In `quick-start.md`, add prominent section:

```markdown
## Your First Adaptive Monitor

The most common Cronicorn use case: monitor a service and poll faster when it's degraded.

### Step 1: Create the Job

```bash
# Via API
curl -X POST https://api.cronicorn.app/jobs \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Service Health Monitor",
    "description": "Monitors API health with adaptive frequency"
  }'
```

### Step 2: Add the Endpoint

```bash
curl -X POST https://api.cronicorn.app/jobs/{jobId}/endpoints \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-health",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 600000,
    "description": "Polls every 5 min, tightens to 30s when degraded"
  }'
```

### Step 3: Design Your Health Endpoint Response

Your `/health` endpoint should return status information:

```json
// Healthy response (5 minute polling continues)
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "external_api": "ok"
  },
  "timestamp": "2025-01-15T14:30:00Z"
}

// Degraded response (AI tightens to 30 seconds)
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "cache": "slow",
    "external_api": "timeout"
  },
  "degraded_since": "2025-01-15T14:25:00Z",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

### Step 4: AI Adapts Automatically

**When healthy**:
- AI sees `status: healthy`
- Maintains 5-minute baseline interval

**When degraded**:
- AI sees `status: degraded`
- Proposes 30-second interval (respecting minIntervalMs)
- Monitors recovery more frequently

**When recovered**:
- AI sees `status: healthy` consistently
- Clears hints, returns to 5-minute baseline

### Configuration Summary

| Setting | Value | Purpose |
|---------|-------|---------|
| baselineIntervalMs | 300000 | Normal: every 5 minutes |
| minIntervalMs | 30000 | Degraded: as fast as 30 seconds |
| maxIntervalMs | 600000 | (Optional) Never slower than 10 minutes |
```

### 2. Add Use Case: **"Health Check with Degraded State Detection"**

In `use-cases.md`:

```markdown
### Health Check with Degraded State Detection

**Scenario**: Monitor a service endpoint, increase polling frequency when degraded.

**The Pattern**:
- Normal: Poll every 5 minutes
- Degraded: Poll every 30 seconds
- Recovered: Return to 5 minutes

**Endpoint Configuration**:
```json
{
  "name": "api-health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,   // 5 minutes
  "minIntervalMs": 30000,          // 30 seconds
  "description": "Tightens to 30s when degraded"
}
```

**Response Body Requirements**:

Include a clear status field:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

**Enhanced Response** (optional but helpful):
```json
{
  "status": "degraded",
  "severity": "warning",
  "degraded_since": "2025-01-15T14:25:00Z",
  "affected_services": ["cache", "external-api"],
  "recommendation": "increase_monitoring",
  "expected_recovery": "2025-01-15T15:00:00Z"
}
```

**AI Behavior**:
1. Sees `status: degraded` in response body
2. Compares with historical health metrics (1h, 4h, 24h windows)
3. Proposes `intervalMs: 30000` via `propose_interval`
4. Sets TTL (typically 15-60 minutes)
5. Continues monitoring at 30-second intervals
6. When `status: healthy` returns consistently, clears hints
7. Returns to 5-minute baseline

**What Triggers Tightening**:
- `status: degraded` or `status: unhealthy`
- `healthy: false`
- High error rates in health metrics
- Explicit `recommendation: increase_monitoring`
```

### 3. Add to `how-ai-adaptation-works.md`

Make this pattern more prominent:

```markdown
## Core Pattern: Degraded State Detection

The most common Cronicorn pattern is detecting degraded states and tightening monitoring.

### How It Works

```
Normal State:
  Response: { "status": "healthy" }
  AI Action: Maintain baseline (5 minutes)

Degraded State:
  Response: { "status": "degraded" }
  AI Action: propose_interval(30000, ttl=30min, reason="degraded status detected")

Recovery:
  Response: { "status": "healthy" } (sustained)
  AI Action: clear_hints(reason="service recovered")
```

### What AI Looks For

Status indicators (any of these trigger adaptation):
- `status: "degraded"` or `status: "unhealthy"`
- `healthy: false`
- `error: true`
- `severity: "warning"` or `severity: "critical"`

### Configuration Checklist

For degraded state detection:
- [ ] Set appropriate `baselineIntervalMs` (normal polling)
- [ ] Set `minIntervalMs` (fastest during incidents)
- [ ] Include `status` field in response body
- [ ] Optionally include `degraded_since` for context
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add "First Adaptive Monitor" to quick start | **HIGH** | Low | High - prominent placement |
| Add degraded state use case | **MEDIUM** | Low | Medium - concrete example |
| Make pattern prominent in AI docs | **MEDIUM** | Low | Medium - visibility |

## Expected Score Improvement

With documentation improvements:
- Current: 80/100
- Expected: 92-95/100

This is Cronicorn's core use case - it just needs more prominent documentation.

## Summary

**Primary Gap**: Documentation visibility - the capability is fully documented but not prominently featured.

**No Functionality Gap**: This is exactly what Cronicorn is designed for.

**Recommendation**:
1. Add step-by-step guide in Quick Start
2. Feature this as the primary use case example
3. Make the pattern explicit with configuration and response examples
4. Show the complete flow: healthy → degraded → recovered
