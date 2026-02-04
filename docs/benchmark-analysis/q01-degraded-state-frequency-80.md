# Benchmark Analysis: Q1 - Increase Frequency on Degraded State

**Score: 80/100**

## Question

> How would you configure a Cronicorn job to monitor a service endpoint and automatically increase polling frequency from 5 minutes to 30 seconds when the HTTP response indicates a degraded state?

## Root Cause of Score

**This is Cronicorn's core use case.** The score is already good (80/100) because this pattern is somewhat documented. The gap is making it more prominent with clear description examples.

## Cronicorn's Approach

This is a **single endpoint** with a natural language description explaining the desired behavior.

## Solution: Endpoint with Degraded State Description

```
Endpoint: "api-health"
  URL: https://api.example.com/health
  Baseline: Every 5 minutes
  Min: 30 seconds

  Description:
  "Monitors API health. When the response indicates degraded or unhealthy
  status, increase polling frequency to 30 seconds to closely monitor
  recovery. When healthy again, return to 5-minute baseline polling."
```

That's it. The description tells AI what to do. No code rules needed.

## Key Insight: Simple Description = Simple Solution

The question asks for exactly what Cronicorn is designed for. The answer is just:

1. Set `baselineIntervalMs: 300000` (5 minutes)
2. Set `minIntervalMs: 30000` (30 seconds)
3. Write a description saying "poll faster when degraded"

## Expected Response Bodies

**Healthy (5-minute polling continues):**
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "external_api": "ok"
  }
}
```

**Degraded (AI tightens to 30 seconds):**
```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "cache": "slow",
    "external_api": "timeout"
  },
  "degraded_since": "2025-01-15T14:25:00Z"
}
```

## Description Examples

**Simple:**
```
"Health check. Poll faster when degraded, normal when healthy."
```

**Detailed:**
```
"Monitors service health. When status is 'degraded' or 'unhealthy',
increase polling to 30 seconds to monitor recovery. When status
returns to 'healthy', go back to 5-minute baseline."
```

**With specific thresholds:**
```
"Health endpoint monitor.
- status: healthy → 5 minute polling
- status: degraded → 30 second polling
- status: unhealthy → 30 second polling"
```

## What Documentation Needs

### 1. Feature This Prominently

This is THE core use case. It should be:
- First example in quick start
- Featured in core concepts
- Most prominent use case

### 2. Show Complete Setup

```markdown
## Quick Start: Health Monitoring

**Goal**: Poll every 5 minutes normally, 30 seconds when degraded.

### Endpoint Configuration

```
Name: api-health
URL: https://api.example.com/health
Baseline: 5 minutes (300000 ms)
Min: 30 seconds (30000 ms)

Description:
"Monitors API health. Poll more frequently when degraded,
return to baseline when healthy."
```

### Response Design

Include a status field:
```json
{ "status": "healthy" }  // or "degraded" or "unhealthy"
```

### That's It

AI reads the description, sees the status field, and adapts.
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Core use case not prominently featured | Documentation | Feature in quick start |
| Complete setup example | Documentation | Add step-by-step |
| Description examples | Documentation | Add variations |

## Priority

**MEDIUM** - Score is already 80/100; improvements are visibility.

## Expected Improvement

- Current: 80/100
- With prominent placement and examples: **92-95/100**

This is Cronicorn's core design - just needs more prominent documentation.
