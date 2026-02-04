# Benchmark Analysis: Q7 - System Load Monitoring with Inverse Frequency

**Score: 78/100**

## Question

> How would you implement a Cronicorn job that monitors system load through an HTTP endpoint and scales its polling frequency inversely with the reported load percentage?

## Root Cause of Low Score

**Inverse scaling pattern not documented.** The capability exists - AI interprets descriptions - but the specific pattern of "poll less when load is high" isn't shown.

## Understanding Inverse Scaling

**Inverse** scaling means:
- **High load** → **Longer intervals** (give system breathing room)
- **Low load** → **Shorter intervals** (can afford more frequent checks)

This is the OPPOSITE of typical monitoring where you poll MORE when there's a problem.

## Solution: Description Explains Inverse Behavior

```
Endpoint: "system-load-monitor"
  URL: https://api.example.com/metrics/load
  Baseline: 1 minute
  Min: 10 seconds       // Fast when system is idle
  Max: 5 minutes        // Slow when system is stressed

  Description:
  "Monitors system load. INVERSE SCALING: when load is HIGH, poll LESS
  frequently to avoid adding stress. When load is LOW, poll MORE
  frequently since the system has capacity. This reduces monitoring
  overhead during stress periods.

  - Load < 30%: poll every 10-30 seconds (aggressive)
  - Load 30-60%: poll every minute (normal)
  - Load 60-80%: poll every 2-3 minutes (reduced)
  - Load > 80%: poll every 5 minutes (minimal)"
```

## Key Insight: Description Specifies Inverse Behavior

The description explicitly tells AI:
- **"INVERSE SCALING"** - Clear statement of intent
- **"HIGH load, poll LESS"** - Opposite of typical pattern
- **"LOW load, poll MORE"** - Confirms inverse relationship
- Specific thresholds guide AI decisions

## Expected Response Body

```json
{
  "load_pct": 75,
  "cpu_pct": 72,
  "memory_pct": 78,
  "status": "elevated",

  // Inverse scaling signal
  "scaling_mode": "inverse",
  "high_load_action": "reduce_frequency",

  // Optional explicit hint
  "suggested_interval_ms": 180000,
  "reason": "High load - reducing monitoring frequency"
}
```

## Description Examples for Inverse Scaling

**Simple:**
```
"Monitor load. Poll frequently when idle, less frequently when busy."
```

**Detailed:**
```
"System load monitor with INVERSE scaling. When the system is under
high load (>70%), reduce polling to conserve resources. When load
is low (<30%), increase polling since the system has spare capacity."
```

**With explicit thresholds:**
```
"Inverse load-based monitoring:
- Load 0-25%: poll every 15 seconds (aggressive)
- Load 25-50%: poll every 30 seconds
- Load 50-75%: poll every 2 minutes
- Load 75-100%: poll every 5 minutes (minimal)"
```

## Contrast: Normal vs. Inverse Scaling

**Normal Scaling** (more common):
```
"When errors increase, poll more frequently to monitor recovery."
```

**Inverse Scaling** (load-conscious):
```
"When load increases, poll less frequently to reduce overhead."
```

Both are valid - describe which pattern you want.

## Response Design for Inverse Scaling

Include signals that support the inverse pattern:

```json
{
  "load_pct": 85,

  // Clear inverse signal
  "recommendation": "reduce_polling",
  "reason": "system_under_load",

  // Or explicit hint
  "suggested_interval_ms": 300000
}
```

## What Documentation Needs

### 1. Inverse Scaling Use Case

```markdown
## Use Case: Load-Based Inverse Polling

**Scenario**: Reduce polling frequency when system is under high load.

**Why inverse?**
- High load: System is stressed, reduce non-essential requests
- Low load: System has capacity, frequent monitoring is fine

### Endpoint Description

"System load monitor. INVERSE scaling: poll less when load is high,
more when load is low. Reduce monitoring overhead during stress."

### Response Design

Include load percentage and scaling mode:
```json
{
  "load_pct": 80,
  "scaling_mode": "inverse",
  "recommendation": "reduce_frequency"
}
```
```

### 2. Inverse Scaling Description Examples

Show various ways to express inverse scaling behavior.

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Inverse scaling pattern not documented | Documentation | Add use case |
| Description examples for inverse behavior | Documentation | Add samples |
| Normal vs inverse contrast | Documentation | Add comparison |

## Priority

**MEDIUM** - Score is 78/100; documentation refinement needed.

## Expected Improvement

- Current: 78/100
- With inverse scaling documentation and examples: **90-93/100**

This is a documentation gap only. AI interprets descriptions and respects explicit recommendations.
