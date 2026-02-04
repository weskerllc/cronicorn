# Benchmark Analysis: Q8 - Baseline with Temporary Tightening During Surges

**Score: 95/100**

## Question

> Describe how to configure a Cronicorn job that maintains a baseline schedule but temporarily tightens execution frequency during detected activity surges, then gracefully returns to baseline when conditions normalize.

## Root Cause of Score

**This is Cronicorn's fundamental architecture.** The score is high because this exactly describes what Cronicorn does:
- Baseline schedule (always present)
- Temporary tightening (AI hints with TTL)
- Graceful return (TTL expiration or explicit clear)

## Cronicorn's Approach

This is exactly what the description + constraints + TTL system provides:

```
Endpoint: "activity-monitor"
  URL: https://api.example.com/metrics
  Baseline: 5 minutes
  Min: 30 seconds
  Max: 10 minutes

  Description:
  "Monitors activity levels. During surges (high activity), tighten
  polling to 30 seconds. When activity normalizes, return to baseline."
```

## How the System Works

1. **Baseline**: Every endpoint has `baselineIntervalMs` - this is the anchor
2. **Tightening**: AI proposes shorter interval with TTL when surge detected
3. **Automatic return**: When TTL expires OR AI calls `clear_hints`, returns to baseline
4. **Constraints**: `minIntervalMs`/`maxIntervalMs` bound all decisions

## Description Examples

**Simple:**
```
"Monitor activity. Poll faster during surges, return to baseline when normal."
```

**Detailed:**
```
"Activity level monitor. When activity_level indicates 'surge', tighten
polling to track the spike closely. When activity normalizes, gracefully
return to baseline polling. The system will automatically return to
baseline even if conditions don't normalize (hints expire)."
```

## Expected Response Body

**Normal activity:**
```json
{
  "activity_level": "normal",
  "requests_per_minute": 150
}
```

**Surge detected:**
```json
{
  "activity_level": "surge",
  "requests_per_minute": 750,
  "surge_started_at": "2025-01-15T14:25:00Z"
}
```

**Normalizing:**
```json
{
  "activity_level": "normal",
  "requests_per_minute": 120,
  "normalized_at": "2025-01-15T15:10:00Z"
}
```

## Why Score Is 95/100

This is already well-documented because it's the core pattern. The documentation explains:
- TTL-based hints
- Baseline vs. AI hints
- Constraint configuration
- Multiple use cases demonstrate this

## Minor Improvements Possible

- Add "surge" terminology explicitly
- Show complete lifecycle diagram
- Cross-reference from core concepts

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| "Surge" terminology not used | Documentation | Minor terminology addition |
| Complete lifecycle example | Documentation | Nice to have |

## Priority

**LOW** - Already at 95/100. Focus on lower-scored questions first.

## Expected Improvement

- Current: 95/100
- With minor additions: **98-100/100**

This is already excellent. Minimal changes needed.
