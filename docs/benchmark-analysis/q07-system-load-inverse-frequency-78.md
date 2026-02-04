# Benchmark Analysis: Q7 - System Load Monitoring with Inverse Frequency

**Score: 78/100**

## Question

> How would you implement a Cronicorn job that monitors system load through an HTTP endpoint and scales its polling frequency inversely with the reported load percentage?

## Current Capability Assessment

### What Cronicorn CAN Do Today

1. **Interpret Load Metrics**: AI understands fields like `load`, `capacity_pct`, `utilization`
2. **Dynamic Interval Adjustment**: AI can propose shorter or longer intervals based on metrics
3. **Constraints for Safety**: Min/max intervals prevent extreme frequencies
4. **TTL-Based Hints**: Adjustments are temporary, returning to baseline

### How Inverse Scaling Works

"Inverse" scaling means:
- **High load** → **Longer intervals** (give system breathing room)
- **Low load** → **Shorter intervals** (can afford more frequent checks)

This is the OPPOSITE of typical monitoring where you poll MORE when there's a problem.

The AI Planner can handle both patterns based on response body signals.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| Inverse scaling pattern not documented | Users don't see this use case | Missing |
| Load-based response design not shown | Users don't know how to signal intent | Partial |
| "Backoff under load" pattern missing | Common pattern not explained | Missing |

### Functionality Assessment

**Fully supported** - the AI interprets response signals. Just needs documentation.

## Recommended Documentation Improvements

### 1. Add Use Case: **"Load-Based Inverse Polling"**

In `use-cases.md`:

```markdown
### Load-Based Inverse Polling

**Scenario**: Reduce polling frequency when system is under high load to avoid adding stress.

**Why Inverse Scaling?**
- High load: System is stressed, reduce non-essential requests
- Low load: System has capacity, more frequent monitoring is safe
- Prevents monitoring from contributing to overload

**Endpoint Configuration**:
```json
{
  "name": "system-load-monitor",
  "url": "https://api.example.com/metrics/load",
  "baselineIntervalMs": 60000,     // 1 minute normal
  "minIntervalMs": 10000,           // 10 seconds when idle
  "maxIntervalMs": 300000           // 5 minutes when stressed
}
```

**Response Design for Inverse Scaling**:
```json
{
  "load_pct": 85,
  "load_status": "high",

  // Inverse scaling signals
  "scaling_mode": "inverse",
  "recommendation": "reduce_frequency",
  "suggested_interval_ms": 180000,

  // Thresholds for context
  "thresholds": {
    "low_load": 30,
    "normal_load": 60,
    "high_load": 80,
    "critical_load": 95
  },

  // Explain the logic
  "reason": "System under high load, reducing monitoring frequency to conserve resources"
}
```

**AI Interpretation**:
| Load % | Status | AI Action |
|--------|--------|-----------|
| 0-30% | Low | Tighten to 10-30 seconds |
| 30-60% | Normal | Baseline (60 seconds) |
| 60-80% | Elevated | Relax to 2-3 minutes |
| 80-95% | High | Relax to 3-5 minutes |
| 95%+ | Critical | Max interval or pause |

**Key Response Signals**:
- `scaling_mode: inverse` - Tells AI to back off under load
- `recommendation: reduce_frequency` - Explicit instruction
- `suggested_interval_ms` - Direct hint
```

### 2. Add Section to `how-ai-adaptation-works.md`

Add: **"Inverse Scaling Patterns"**

```markdown
## Inverse Scaling Patterns

Not all monitoring should tighten under stress. Sometimes you want to REDUCE frequency when load is high.

### When to Use Inverse Scaling

- **Non-critical monitoring**: Status dashboards, analytics collection
- **Resource-constrained targets**: Systems that can't handle frequent polling
- **Graceful degradation**: Reduce non-essential traffic during incidents
- **Cost-sensitive APIs**: Reduce calls when not needed

### Signaling Inverse Behavior

Include clear signals in your response body:

```json
{
  "load_pct": 85,
  "scaling_behavior": "inverse",
  "high_load_action": "reduce_frequency",
  "suggested_interval_ms": 300000
}
```

### Inverse Scaling Table

Provide AI with a mapping table:

```json
{
  "load_pct": 75,
  "interval_mapping": {
    "0-25": { "interval_ms": 10000, "label": "aggressive monitoring" },
    "25-50": { "interval_ms": 30000, "label": "normal monitoring" },
    "50-75": { "interval_ms": 60000, "label": "relaxed monitoring" },
    "75-90": { "interval_ms": 180000, "label": "reduced monitoring" },
    "90-100": { "interval_ms": 300000, "label": "minimal monitoring" }
  },
  "current_recommendation": 180000
}
```

### Contrast: Normal vs. Inverse Scaling

**Normal Scaling** (more common):
- High error rate → tighten interval (investigate faster)
- Queue growing → tighten interval (clear backlog)
- Degraded status → tighten interval (monitor recovery)

**Inverse Scaling** (load-conscious):
- High CPU load → relax interval (reduce requests)
- High memory → relax interval (conserve resources)
- Rate limited → relax interval (respect limits)

### Mixed Patterns

You can combine both:
```json
{
  "error_rate_pct": 2.5,         // Normal scaling: tighten if high
  "system_load_pct": 85,          // Inverse scaling: relax if high
  "priority": "respect_load",     // Tell AI which wins

  // Computed recommendation considering both
  "recommendation": {
    "action": "maintain_current",
    "reason": "Error rate low, but load high - keep current interval"
  }
}
```
```

### 3. Add Configuration Example

In `configuration-and-constraints.md`:

```markdown
## Configuring for Load-Sensitive Monitoring

### Use Case: CPU/Memory Monitoring

When monitoring system resources, configure to back off under high load:

```json
{
  "name": "resource-monitor",
  "url": "https://metrics.example.com/resources",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 15000,      // Fast when system is idle
  "maxIntervalMs": 300000      // Slow when system is stressed
}
```

### Response Structure

```json
{
  "cpu_pct": 82,
  "memory_pct": 75,
  "combined_load": 78.5,

  "status": "high_load",
  "action": "reduce_polling",

  // Tell AI to use inverse scaling
  "scheduling": {
    "mode": "inverse",
    "current_interval_recommendation_ms": 180000,
    "reason": "High system load - reducing monitoring frequency"
  }
}
```

### Constraint Selection for Inverse Scaling

For inverse patterns, your MIN interval is for low-load scenarios (aggressive monitoring) and MAX is for high-load scenarios (minimal monitoring):

| Load Level | Interval | Constraint Used |
|------------|----------|-----------------|
| Very Low | 15 seconds | Near minIntervalMs |
| Normal | 60 seconds | Baseline |
| High | 180 seconds | Between baseline and max |
| Critical | 300 seconds | At maxIntervalMs |
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add load-based inverse polling use case | **HIGH** | Low | High - direct answer |
| Add inverse scaling section to AI docs | **MEDIUM** | Low | Medium - explains pattern |
| Add configuration example | **MEDIUM** | Low | Medium - practical guidance |

## Expected Score Improvement

With documentation improvements:
- Current: 78/100
- Expected: 90-93/100

This is a documentation gap only. The functionality fully supports inverse scaling.

## Summary

**Primary Gap**: Documentation - inverse scaling pattern isn't documented despite being fully supported.

**No Functionality Gap**: AI interprets load metrics and respects explicit recommendations like `suggested_interval_ms`.

**Recommendation**:
1. Add "Load-Based Inverse Polling" use case with complete example
2. Document how to signal inverse scaling behavior in responses
3. Contrast normal vs. inverse scaling patterns
4. Show constraint configuration for load-sensitive scenarios
