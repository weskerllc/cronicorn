# Benchmark Analysis: Q10 - Preventing Oscillation with Volatile Patterns

**Score: 53/100**

## Question

> What strategies would you employ to prevent Cronicorn's adaptive scheduling from oscillating between extreme frequencies in a scenario with highly volatile HTTP response patterns, and how would you configure rules to maintain stability while still responding to genuine state changes?

## Root Cause of Low Score

**Built-in stability not explained.** Cronicorn has multiple anti-oscillation mechanisms, but they're not documented. Also, the question asks about "rules" - there are no explicit rules, just descriptions and constraints.

## Cronicorn's Approach

Stability comes from three sources:
1. **Constraints** - Hard limits on interval range
2. **Descriptions** - Tell AI to prioritize stability
3. **Built-in mechanisms** - TTL expiration, multi-window metrics, analysis cooldown

## Solution: Constraints + Description for Stability

```
Endpoint: "volatile-system-monitor"
  URL: https://api.example.com/metrics
  Baseline: 60 seconds
  Min: 30 seconds      // Tight range
  Max: 120 seconds     // Only 4x variation allowed

  Description:
  "Monitors volatile system metrics. This endpoint's data fluctuates
  frequently - prioritize stability over rapid response. Only adjust
  frequency for sustained state changes, not momentary spikes. When
  uncertain, maintain current interval. Include smoothed/averaged
  values in response rather than instantaneous readings."
```

## Key Insight: Describe Stability Requirements

The description explicitly tells AI:
- **"prioritize stability"** - AI knows to favor consistency
- **"sustained state changes, not momentary spikes"** - AI ignores noise
- **"when uncertain, maintain current"** - AI defaults to no-change
- **"smoothed/averaged values"** - Guides response design

## Built-in Stability Mechanisms

### 1. Constraints (Primary Defense)

```
Min: 30 seconds, Max: 2 minutes → 4x range
```

With tight constraints, even wild AI decisions stay bounded.

### 2. TTL-Based Hints

All AI decisions expire. If hints expire, system returns to baseline - a natural stability anchor.

### 3. Multi-Window Health Metrics

AI sees 1h, 4h, 24h trends - not just the latest response. This prevents reacting to momentary spikes.

### 4. Analysis Cooldown

AI doesn't analyze every response. Default 5-minute cooldown between analyses prevents rapid decision changes.

## Response Design for Stability

**Volatile (causes oscillation):**
```json
{
  "current_value": 523,        // Spikes constantly
  "instant_error_rate": 15.5   // Fluctuates wildly
}
```

**Smoothed (promotes stability):**
```json
{
  "avg_value_5min": 487,       // Smoothed average
  "avg_error_rate_1hr": 2.3,   // Longer-term average
  "trend": "stable",           // Explicit stability signal
  "within_normal_range": true
}
```

## Description Examples for Stability

**Basic:**
```
"Monitor metrics. Prioritize stability. Don't overreact to spikes."
```

**Detailed:**
```
"Volatile metric monitoring. Data fluctuates frequently. Look for
sustained trends (5+ minutes) before adjusting frequency. When in
doubt, maintain current interval. Smoothed averages in response
are more reliable than instant values."
```

**With explicit guidance:**
```
"System monitor with volatile data. Stability rules:
- Only react to changes sustained for 5+ minutes
- Ignore single-point spikes
- Prefer baseline interval when uncertain
- Use avg_5min values, not instant readings"
```

## What Documentation Needs

### 1. Stability Configuration Guide

```markdown
## Configuring for Volatile Workloads

### Use Tight Constraints

| Volatility Level | Min Interval | Max Interval | Ratio |
|------------------|--------------|--------------|-------|
| Low              | 10s          | 10min        | 60x   |
| Medium           | 30s          | 5min         | 10x   |
| High             | 30s          | 2min         | 4x    |
| Extreme          | 1min         | 2min         | 2x    |

### Request Stability in Description

Include phrases like:
- "Prioritize stability over responsiveness"
- "Don't overreact to momentary changes"
- "Look for sustained trends"
- "When uncertain, maintain current interval"

### Include Smoothed Metrics in Response

Return averaged values instead of instantaneous readings.
```

### 2. Description Examples for Stability

Show description text that promotes stability.

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Built-in stability not explained | Documentation | Add stability section |
| Constraint tuning for volatility | Documentation | Add configuration guide |
| Description examples for stability | Documentation | Add samples |

## Priority

**HIGH** - Important capability not documented.

## Expected Improvement

- Current: 53/100
- With stability documentation and examples: **80-85/100**

The mechanisms exist; documentation needs to explain how descriptions and constraints work together for stability.
