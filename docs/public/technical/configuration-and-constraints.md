---
id: configuration-constraints
title: Configuration & Constraints
description: Decision guide for intervals, cron, timeouts, and AI constraints
tags: [assistant, technical, configuration]
sidebar_position: 5
mcp:
  uri: file:///docs/technical/configuration-and-constraints.md
  mimeType: text/markdown
  priority: 0.80
  lastModified: 2025-11-02T00:00:00Z
---

# Configuration and Constraints

This document helps you configure endpoints correctly. Instead of explaining every field, it focuses on the decisions you need to make and their consequences.

## Decision 1: Cron vs. Interval

**Question**: Should I use a cron expression or fixed interval?

### Use Cron When:

**Scheduled business logic** - Tasks tied to calendar/clock times:
- Daily reports at 2 AM: `"0 2 * * *"`
- Hourly data sync: `"0 * * * *"`
- Weekday batch jobs: `"0 9 * * 1-5"`
- End-of-month processing: `"0 0 1 * *"`

**Pros**: Predictable timing, aligns with business schedules, easy to reason about

**Cons**: Can't be tightened by AI (AI interval hints don't apply to cron), uneven spacing (monthly crons have 28-31 day gaps)

### Use Interval When:

**Continuous monitoring** - Tasks measuring ongoing state:
- Queue depth checks every 5 minutes: `300000ms`
- Health checks every 30 seconds: `30000ms`
- Metric collection every 1 minute: `60000ms`

**Pros**: AI can tighten/relax (adaptive), consistent spacing, simple math

**Cons**: Drifts from clock (5min interval ≠ :00, :05, :10...), no calendar awareness

### Decision Tree:

```
Does the task care about specific clock times?
├─ Yes → Use cron
│   Example: "Run daily at 3 AM"
└─ No → Use interval
    ├─ Do you want AI adaptation?
    │   ├─ Yes → Use interval (AI can adjust)
    │   └─ No → Either works (prefer interval for simplicity)
    └─ Example: "Check every 5 minutes"
```

### Common Mistake:

❌ Using cron for monitoring: `"*/5 * * * *"` (every 5 minutes)
✅ Use interval instead: `300000` (AI can tighten to 1 minute during incidents)

Cron works, but you lose adaptive capability. Reserve cron for calendar-aware tasks.

## Decision 2: Setting Min/Max Intervals

**Question**: Should I set `minIntervalMs` and `maxIntervalMs` constraints?

### When to Set Min Interval:

**Rate limiting** - External service has request limits:
- API allows 100 requests/hour → `minIntervalMs: 36000` (36 seconds)
- Database writes limited to 1/second → `minIntervalMs: 1000`

**Cost control** - Execution is expensive:
- AI analysis costs $0.10/run → `minIntervalMs: 300000` (5 min minimum)
- External API charges per call → Set based on budget

**Resource protection** - Prevent overwhelming systems:
- Heavy computation → `minIntervalMs: 60000` (1 min minimum)
- Large data transfers → Set based on capacity

**Effect**: Governor clamps any schedule (baseline, AI hints) to this minimum. Even if AI proposes 10-second interval, endpoint runs at minimum interval.

### When to Set Max Interval:

**Staleness limits** - Data can't be too old:
- Real-time monitoring → `maxIntervalMs: 300000` (5 min max)
- Fraud detection → `maxIntervalMs: 60000` (1 min max)

**SLA requirements** - Guaranteed check frequency:
- "Must check health every 10 minutes" → `maxIntervalMs: 600000`

**Effect**: Governor clamps any schedule to this maximum. If AI tries to relax to 30 minutes, endpoint runs at maximum interval.

### Default Strategy:

**Start without constraints**, then add if needed:
1. Deploy with baseline only (no min/max)
2. Monitor execution patterns
3. Add `minIntervalMs` if hitting rate limits or costs spike
4. Add `maxIntervalMs` if data gets too stale

Constraints are hard limits—they override everything, including AI. Use them sparingly.

### Example Configurations:

**Health check** (must run frequently, no rate limits):
```json
{
  "baselineIntervalMs": 30000,
  "minIntervalMs": null,
  "maxIntervalMs": 120000
}
```
AI can tighten to 30s (baseline) but not exceed 2 minutes.

**External API call** (rate limited):
```json
{
  "baselineIntervalMs": 60000,
  "minIntervalMs": 30000,
  "maxIntervalMs": null
}
```
AI can relax beyond 1 minute but never tighten below 30 seconds.

**Expensive operation** (cost control):
```json
{
  "baselineIntervalMs": 300000,
  "minIntervalMs": 180000,
  "maxIntervalMs": 900000
}
```
Constrained to 3-15 minute range, AI operates within that window.

## Decision 3: Timeout Configuration

**Question**: What timeout should I set?

### Rule of Thumb:

`timeout = p95 latency × 2 + buffer`

**Example**: If your endpoint usually completes in 2 seconds (p95), set timeout to 5-10 seconds.

### Categories:

**Fast endpoints** (&lt; 1 second typical):
- Health checks
- Simple API calls
- Cache reads
- **Timeout**: 3-5 seconds

**Medium endpoints** (1-10 seconds typical):
- Database queries
- Data transformations
- Most API integrations
- **Timeout**: 15-30 seconds

**Slow endpoints** (10-60 seconds typical):
- Heavy computations
- Large data transfers
- Batch operations
- **Timeout**: 60-120 seconds

**Very slow endpoints** (&gt; 1 minute typical):
- ML model training
- Large file processing
- **Timeout**: 300+ seconds (5+ minutes)

### What Happens on Timeout:

1. Request is cancelled
2. Run status marked as `"timeout"`
3. Failure count increments
4. Exponential backoff applies (interval increases)

Set timeout high enough to avoid false failures, but low enough to prevent zombie runs consuming resources.

### Common Mistake:

❌ Setting timeout too low: `timeout: 5000` for 10-second operation
Result: Frequent timeout failures, exponential backoff kicks in, endpoint runs less frequently

✅ Set based on actual performance: `timeout: 30000` with 10-second p95

## Decision 4: Response Body Design

**Question**: What should my endpoint return?

### Minimum Viable Response:

```json
{
  "status": "success",
  "timestamp": "2025-11-02T14:30:00Z"
}
```

AI can work with just execution status, but you get better adaptation with richer data.

### Good Response (Monitoring Endpoint):

```json
{
  "status": "healthy",
  "queue_depth": 45,
  "processing_rate_per_min": 100,
  "error_rate_pct": 1.2,
  "avg_latency_ms": 150,
  "capacity_pct": 35,
  "timestamp": "2025-11-02T14:30:00Z"
}
```

AI can detect:
- Growing queue (tighten interval)
- High error rate (investigate immediately)
- Low capacity usage (relax interval)

### Great Response (Coordination Endpoint):

```json
{
  "status": "healthy",
  "metrics": {
    "queue_depth": 45,
    "error_rate_pct": 1.2
  },
  "coordination": {
    "ready_for_downstream": true,
    "upstream_healthy": true,
    "batch_id": "2025-11-02"
  },
  "actions": {
    "last_alert_sent_at": "2025-11-02T12:00:00Z",
    "last_scale_up_at": null
  },
  "timestamp": "2025-11-02T14:30:00Z"
}
```

AI can:
- Detect trends in metrics
- Coordinate with siblings (batch_id, ready flags)
- Apply cooldowns (check last_alert_sent_at)

### What to Include:

1. **Metrics that change**: Queue depth, error rates, latencies (not static config)
2. **Status indicators**: healthy/degraded/critical, true/false flags
3. **Timestamps**: Enable cooldown calculations, staleness checks
4. **Coordination signals**: For multi-endpoint workflows
5. **Thresholds**: Show when to take action (queue_max, warning_threshold)

### What to Exclude:

1. **Large arrays**: Truncated at 1000 chars, wastes tokens
2. **Deeply nested objects**: Hard for AI to parse
3. **Static data**: Endpoint name, config (AI already has this)
4. **Sensitive data**: Logged and stored, consider security

## Decision 5: Pause vs. Constraints

**Question**: Should I use `pause_until` or constraint clamping?

### Use Pause When:

**Temporary shutdowns**:
- Maintenance windows
- Dependency outages
- Manual emergency stop

**Effect**: Endpoint doesn't run at all until pause expires

**Set via**: AI tool `pause_until()` or API

### Use Max Interval When:

**Slow down but don't stop**:
- Rate limiting (hit API limits, back off)
- Cost control (reduce frequency but keep monitoring)

**Effect**: Endpoint runs, but not faster than max interval

**Set via**: Endpoint configuration

### Comparison:

| Scenario | Use Pause | Use Max Interval |
|----------|-----------|------------------|
| Database maintenance | ✓ | |
| Rate limit hit (429 response) | ✓ | |
| Cost budget exceeded | | ✓ |
| Dependency unavailable | ✓ | |
| Weekend-only execution | ✓ | |
| Slow down monitoring | | ✓ |

**Rule**: If you want **zero** executions, use pause. If you want **less frequent** executions, use max interval.

## Constraint Interaction: How Limits Stack

Understanding how constraints interact:

### Priority Order:

1. **Pause** (highest priority)
   - If `pausedUntil > now`, return that time (source: `"paused"`)
   - Nothing else matters

2. **Governor candidate selection**
   - Choose between baseline, AI interval hint, AI one-shot hint
   - AI interval overrides baseline
   - One-shot competes with others

3. **Min/Max clamping** (lowest priority)
   - Clamp chosen candidate to `[now + min, now + max]`
   - Applies to all candidates (baseline, AI hints)

### Example Flow:

```
Baseline: 5 minutes (300000ms)
Min: 1 minute (60000ms)
Max: 10 minutes (600000ms)
AI proposes: 30 seconds (30000ms)
Pause: Not set

Governor logic:
1. Check pause → Not paused, continue
2. Choose candidate → AI interval (30000ms) overrides baseline
3. Clamp to min → 30000ms < 60000ms (min), adjust to 60000ms
4. Clamp to max → 60000ms < 600000ms (max), no change
5. Result: 60000ms (1 minute), source: "clamped-min"
```

**Key insight**: Min/max are hard limits. AI can propose anything, but Governor enforces bounds.

## Common Configuration Patterns

### Pattern 1: Adaptive Monitoring
```json
{
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "maxIntervalMs": null,
  "timeoutMs": 10000
}
```
AI can tighten from 5 minutes to 30 seconds during incidents, but can't go faster (rate limit).

### Pattern 2: Scheduled Task with Staleness Limit
```json
{
  "baselineCron": "0 2 * * *",
  "minIntervalMs": null,
  "maxIntervalMs": 7200000,
  "timeoutMs": 60000
}
```
Runs daily at 2 AM, but if it fails, retries within 2 hours (not 24 hours later).

### Pattern 3: Cost-Controlled Analysis
```json
{
  "baselineIntervalMs": 600000,
  "minIntervalMs": 300000,
  "maxIntervalMs": 3600000,
  "timeoutMs": 30000
}
```
Expensive operation runs every 10 minutes normally, AI can relax to hourly or tighten to 5 minutes.

## Debugging Configuration Issues

**Problem**: Endpoint runs too frequently, ignoring baseline

**Check**:
1. Active AI interval hint? (check `aiHintExpiresAt`)
2. Min interval set too low?
3. Baseline misconfigured? (wrong units—milliseconds not seconds)

**Problem**: Endpoint never tightens during incidents

**Check**:
1. Using cron instead of interval? (AI can't override cron)
2. Min interval too high? (AI proposals clamped)
3. AI quota exceeded? (no analysis happening)

**Problem**: Endpoint times out frequently

**Check**:
1. Timeout too low for actual performance?
2. Endpoint performance degraded? (check duration trends)
3. Network issues? (high latency)

## Key Takeaways

1. **Cron for calendar tasks, interval for continuous monitoring**
2. **Start without constraints, add min/max only when needed**
3. **Timeout = p95 latency × 2 + buffer**
4. **Include metrics, timestamps, and coordination signals in responses**
5. **Pause stops execution, max interval slows it down**
6. **Constraints are hard limits—they override AI**
7. **Min/max apply relative to `now`, not `lastRunAt`**

Configure conservatively. The system is designed to be safe by default. Add constraints when you encounter real problems, not anticipated ones.

## Next Steps

- **[How Scheduling Works](./how-scheduling-works.md)** - Understand how Governor applies constraints
- **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - Learn how AI proposes intervals
- **[Reference](./reference.md)** - Quick lookup for defaults and field ranges
