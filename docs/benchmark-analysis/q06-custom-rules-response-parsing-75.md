# Benchmark Analysis: Q6 - Custom Rules for Response Body Parsing

**Score: 75/100**

## Question

> Write a code example showing how to define custom rules in Cronicorn that parse specific fields from an HTTP response body and use that data to dynamically adjust the job's next execution interval.

## Current Capability Assessment

### How Cronicorn Works

Cronicorn does NOT use user-defined "rules" in the traditional sense. Instead:

1. **AI Interprets Response Bodies**: The AI Planner reads response bodies and makes intelligent decisions based on field values.

2. **Semantic Understanding**: AI understands common metric patterns (queue_depth, error_rate, latency) without explicit rule configuration.

3. **No Rule DSL**: There's no declarative rule language like "if queue_depth > 100 then interval = 30s".

4. **Response Design = Rule Design**: You influence AI behavior by designing your response body structure.

### What Works Well

The AI Planner already:
- Parses JSON response bodies
- Looks for key metric patterns
- Interprets numeric thresholds
- Understands status indicators

### What The Question Expects

The question implies:
- User-defined parsing rules
- Explicit field → action mappings
- Code-level rule definition

### Current Reality

Users influence AI through response body design, not rule configuration. This is a documentation gap, not a functionality gap.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| Response design as "rule definition" not explained | Users expect traditional rules | Paradigm not documented |
| Field naming conventions not comprehensive | Users don't know what AI recognizes | Partial coverage |
| Threshold guidance not provided | Users don't know what values trigger changes | Missing |
| No "rule-like" examples | Users want cause-and-effect clarity | Missing |

### Functionality Assessment

**Current functionality is SUFFICIENT** - the AI-driven approach is more flexible than static rules, but this needs better documentation.

## Recommended Documentation Improvements

### 1. New Section: **"Designing Response Bodies for AI Interpretation"**

Add to `how-ai-adaptation-works.md`:

```markdown
## Designing Response Bodies as "Rules"

Unlike traditional schedulers with explicit rule configurations, Cronicorn uses AI to interpret your response bodies. This provides flexibility without rigid rule syntax.

### Your Response Body IS Your Rule Definition

Instead of:
```yaml
# Traditional rule syntax (NOT how Cronicorn works)
rules:
  - if: response.queue_depth > 100
    then: interval = 30s
  - if: response.error_rate > 5
    then: interval = 10s
```

You design your response body to communicate intent:
```json
{
  "queue_depth": 150,
  "queue_threshold_warning": 100,
  "queue_threshold_critical": 200,
  "recommended_action": "increase_frequency",
  "suggested_interval_ms": 30000
}
```

The AI interprets these fields and acts accordingly.

### Field Naming Patterns AI Recognizes

The AI Planner looks for these field patterns (case-insensitive):

**Volume/Queue Indicators**:
```json
{
  "queue_depth": 250,
  "pending_count": 1500,
  "backlog_size": 50,
  "items_waiting": 100
}
```
AI response: May tighten interval when values are high

**Rate/Throughput Indicators**:
```json
{
  "processing_rate": 100,
  "requests_per_minute": 500,
  "throughput": 1000
}
```
AI response: May adjust interval based on throughput needs

**Error/Health Indicators**:
```json
{
  "error_rate": 5.5,
  "error_rate_pct": 5.5,
  "failure_count": 10,
  "healthy": false,
  "status": "degraded"
}
```
AI response: May tighten for investigation or pause for recovery

**Latency/Performance Indicators**:
```json
{
  "latency_ms": 500,
  "response_time_ms": 450,
  "p95_latency": 800,
  "avg_duration_ms": 200
}
```
AI response: May adjust based on performance trends

**Capacity Indicators**:
```json
{
  "capacity_pct": 85,
  "utilization": 0.75,
  "load": 0.9
}
```
AI response: May tighten as capacity approaches limits

### Explicit Recommendations (Most Direct)

For clearest AI behavior, include explicit recommendations:

```json
{
  "metrics": {
    "queue_depth": 250,
    "error_rate_pct": 2.5
  },
  "ai_guidance": {
    "recommended_action": "increase_frequency",
    "suggested_interval_ms": 30000,
    "reason": "queue_depth exceeding threshold"
  }
}
```

The AI will strongly consider `suggested_interval_ms` when present.

### Threshold Patterns

Include thresholds for context:

```json
{
  "queue_depth": 250,
  "queue_warning_threshold": 100,
  "queue_critical_threshold": 300,
  "status": "warning"
}
```

AI interprets:
- Value (250) between warning (100) and critical (300)
- Status explicitly labeled "warning"
- May propose moderate interval reduction

### Complete Example: Queue Monitoring

```json
// Response body that acts as "rules" for AI
{
  "timestamp": "2025-01-15T14:30:00Z",

  // Primary metrics (AI parses these)
  "queue_depth": 250,
  "processing_rate_per_min": 80,
  "error_rate_pct": 2.5,

  // Thresholds (provide context)
  "thresholds": {
    "queue_warning": 100,
    "queue_critical": 300,
    "error_rate_warning": 5,
    "error_rate_critical": 10
  },

  // Computed status (AI uses this directly)
  "status": "warning",
  "needs_attention": true,

  // Explicit guidance (most direct influence)
  "scheduling_guidance": {
    "suggested_interval_ms": 30000,
    "min_interval_ms": 10000,
    "reason": "queue depth approaching critical threshold"
  }
}
```

**Equivalent Traditional Rule**:
```
IF queue_depth > 100 AND queue_depth < 300 THEN
  interval = 30 seconds
  status = warning
```

### Response Design Patterns

#### Pattern 1: Threshold-Based Intervals

```json
// Your endpoint calculates the appropriate interval
{
  "metrics": { "load": 0.85 },
  "calculated_interval_ms": 15000,  // You compute based on load
  "calculation": "15000ms because load > 0.8"
}
```

#### Pattern 2: State Machine Signals

```json
{
  "state": "degraded",
  "previous_state": "healthy",
  "state_changed_at": "2025-01-15T14:25:00Z",
  "state_actions": {
    "healthy": { "interval_ms": 60000 },
    "degraded": { "interval_ms": 15000 },
    "critical": { "interval_ms": 5000, "alert": true }
  }
}
```

#### Pattern 3: Percentage-Based Scaling

```json
{
  "capacity_pct": 75,
  "scaling_suggestion": {
    "at_50_pct": { "interval_ms": 60000 },
    "at_75_pct": { "interval_ms": 30000 },
    "at_90_pct": { "interval_ms": 10000 }
  },
  "current_recommendation": 30000
}
```

### Best Practices

1. **Be explicit**: Include `suggested_interval_ms` for clearest AI behavior
2. **Provide context**: Include thresholds so AI understands relative values
3. **Use clear status**: `healthy`, `warning`, `critical`, `degraded`
4. **Include reasoning**: `"reason": "queue approaching limit"` helps AI
5. **Consistent naming**: Use patterns AI recognizes (queue_depth, error_rate, etc.)
```

### 2. Add API Examples for Programmatic Hints

In `api-reference.md`, add:

```markdown
## Programmatic Scheduling Control

While AI interprets response bodies automatically, you can also set scheduling hints programmatically via API.

### Set Interval Hint

```typescript
// Programmatically set a scheduling interval
await fetch(`${CRONICORN_API}/jobs/${jobId}/endpoints/${endpointId}/ai/interval`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    intervalMs: 30000,      // 30 second interval
    ttlMinutes: 60,         // Valid for 1 hour
    reason: 'High queue depth detected by monitoring system'
  }),
});
```

### Set One-Shot Execution

```typescript
// Trigger immediate execution
await fetch(`${CRONICORN_API}/jobs/${jobId}/endpoints/${endpointId}/ai/next-run`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    nextRunAtIso: new Date().toISOString(),  // Run now
    ttlMinutes: 30,
    reason: 'Urgent: Manual trigger for investigation'
  }),
});
```

### Clear All Hints

```typescript
// Return to baseline scheduling
await fetch(`${CRONICORN_API}/jobs/${jobId}/endpoints/${endpointId}/ai/clear`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reason: 'Returning to normal after incident resolved'
  }),
});
```

### Use Case: External Rule Engine Integration

If you have an existing rule engine, use the API to apply its decisions:

```typescript
// Your rule engine evaluates conditions
const ruleResult = await myRuleEngine.evaluate({
  queue_depth: response.queue_depth,
  error_rate: response.error_rate,
});

// Apply result to Cronicorn
if (ruleResult.action === 'increase_frequency') {
  await cronicornClient.setInterval(endpointId, {
    intervalMs: ruleResult.intervalMs,
    ttlMinutes: ruleResult.ttlMinutes,
    reason: ruleResult.reason,
  });
}
```

This allows you to define rules in your preferred format while using Cronicorn for execution.
```

### 3. Add Use Case Example

In `use-cases.md`:

```markdown
### Custom Metric-Based Scheduling

**Scenario**: Adjust polling frequency based on custom application metrics.

**Response Design** (your endpoint returns):
```json
{
  "metrics": {
    "active_sessions": 1500,
    "session_warning_threshold": 1000,
    "session_critical_threshold": 2000
  },
  "computed_status": "warning",
  "scheduling": {
    "recommended_interval_ms": 15000,
    "reason": "High session count requires closer monitoring"
  }
}
```

**Endpoint Configuration**:
```json
{
  "name": "session-monitor",
  "url": "https://api.example.com/metrics/sessions",
  "baselineIntervalMs": 60000,
  "minIntervalMs": 10000,
  "maxIntervalMs": 300000
}
```

**AI Behavior**:
- Sees `computed_status: warning`
- Reads `recommended_interval_ms: 15000`
- Proposes 15-second interval (respecting min constraint of 10s)
- When sessions drop below warning, AI clears hints

**Equivalent Rule Logic**:
```
IF active_sessions > 1000 AND active_sessions < 2000:
    interval = 15 seconds
    status = warning
ELSE IF active_sessions >= 2000:
    interval = 10 seconds (minimum)
    status = critical
ELSE:
    interval = 60 seconds (baseline)
    status = healthy
```

Your endpoint implements this logic and returns the appropriate `scheduling.recommended_interval_ms`.
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add response design as "rules" section | **HIGH** | Medium | High - paradigm shift |
| Document field naming patterns | **HIGH** | Low | High - practical guidance |
| Add programmatic API examples | **MEDIUM** | Low | Medium - alternative approach |
| Add use case example | **MEDIUM** | Low | Medium - concrete illustration |

## Expected Score Improvement

With documentation improvements:
- Current: 75/100
- Expected: 88-92/100

The AI-driven approach is powerful; it just needs clear explanation.

## Summary

**Primary Gap**: Documentation - the paradigm of "response design as rule definition" isn't explained.

**No Functionality Gap**: The AI interprets response bodies intelligently. Including explicit fields like `suggested_interval_ms` gives users direct control.

**Recommendation**:
1. Document how response body design replaces traditional rule configuration
2. Provide comprehensive field naming patterns AI recognizes
3. Show explicit recommendation patterns (`suggested_interval_ms`)
4. Add programmatic API examples for external rule engine integration
