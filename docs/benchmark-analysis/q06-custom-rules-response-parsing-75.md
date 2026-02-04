# Benchmark Analysis: Q6 - Custom Rules for Response Body Parsing

**Score: 75/100**

## Question

> Write a code example showing how to define custom rules in Cronicorn that parse specific fields from an HTTP response body and use that data to dynamically adjust the job's next execution interval.

## Root Cause of Low Score

**Paradigm mismatch.** The question assumes user-defined parsing rules with explicit field → action mappings. Cronicorn uses **natural language descriptions** instead - you describe what you want, and AI interprets the response fields automatically.

## Cronicorn's Actual Approach

**Descriptions ARE your rules.** You don't write parsing code.

```
Endpoint: "queue-monitor"
  URL: https://api.example.com/queue/status
  Baseline: 5 minutes
  Min: 30 seconds

  Description:
  "Monitors the processing queue. When queue_depth is high (above 100),
  increase polling frequency to keep track of backlog. When queue_depth
  is low or zero, return to baseline. The response includes queue_depth,
  processing_rate, and estimated_completion_time - use these to judge
  appropriate polling frequency."
```

AI reads the description, parses the response fields, and adjusts accordingly. No rule DSL needed.

## Key Insight: Response Design + Description = Rules

Instead of:
```javascript
// NOT how Cronicorn works
rules.add({
  condition: 'response.queue_depth > 100',
  action: { interval: '30s' }
});
```

You write:
```
Description:
"When queue_depth is high (above 100), increase polling frequency."
```

And design your response to include the field:
```json
{
  "queue_depth": 150,
  "status": "backlogged"
}
```

## Complete Example

### Endpoint Configuration

```
Endpoint: "custom-metrics-monitor"
  URL: https://api.example.com/metrics
  Baseline: 5 minutes
  Min: 30 seconds
  Max: 15 minutes

  Description:
  "Monitors custom application metrics. Key fields to watch:
  - queue_depth: Poll frequently when > 100, relax when < 20
  - error_rate_pct: Tighten monitoring if > 5%
  - processing_state: 'backlogged' means speed up, 'idle' means slow down
  - suggested_interval_ms: If provided, use this as a hint

  Balance these factors - high queue with low errors is different
  from high queue with high errors."
```

### Expected Response Body

```json
{
  "queue_depth": 150,
  "error_rate_pct": 2.5,
  "processing_state": "backlogged",
  "processing_rate_per_min": 50,
  "estimated_clear_time_min": 30,

  // Optional: explicit hint for AI
  "suggested_interval_ms": 30000,
  "suggestion_reason": "High backlog requires frequent monitoring"
}
```

### How AI Interprets This

1. Reads description: "queue_depth > 100 means poll frequently"
2. Reads response: `queue_depth: 150` (above threshold)
3. Sees `processing_state: "backlogged"` (confirmation)
4. Notes `suggested_interval_ms: 30000` (explicit hint)
5. Proposes 30-second interval

## Description Examples for Different "Rules"

**Threshold-based:**
```
"When queue_depth exceeds 100, increase frequency.
When queue_depth is below 20, reduce frequency."
```

**State-based:**
```
"When status is 'critical', poll every 30 seconds.
When status is 'warning', poll every minute.
When status is 'healthy', use baseline."
```

**Multi-factor:**
```
"Consider both queue_depth and error_rate:
- High queue + low errors: moderate increase
- High queue + high errors: maximum frequency
- Low queue: return to baseline"
```

**With explicit hints:**
```
"Response includes suggested_interval_ms field.
Use this value when provided, otherwise interpret
the metrics to determine appropriate frequency."
```

## For Users Who Want Programmatic Control

If you have an external rule engine, use the API to apply its decisions:

```typescript
// Your rule engine evaluates response
const response = await fetchMetrics();
const decision = myRuleEngine.evaluate(response);

// Apply to Cronicorn via API
if (decision.shouldAdjust) {
  await fetch(`/jobs/${jobId}/endpoints/${endpointId}/ai/interval`, {
    method: 'POST',
    body: JSON.stringify({
      intervalMs: decision.intervalMs,
      ttlMinutes: decision.ttlMinutes,
      reason: decision.reason
    })
  });
}
```

This allows custom rule logic while using Cronicorn for execution.

## What Documentation Needs

### 1. Explain "Descriptions as Rules"

```markdown
## Your Description IS Your Rule

Instead of code rules, describe what you want:

| Traditional Rule | Cronicorn Description |
|------------------|----------------------|
| `if queue_depth > 100: interval = 30s` | "When queue_depth is high, poll frequently" |
| `if error_rate > 5%: alert()` | "Increase monitoring when error_rate exceeds 5%" |
| `if status == 'idle': interval = 10m` | "Relax polling when status shows idle" |

AI interprets your description with the response data.
```

### 2. Show Field Naming Patterns

```markdown
## Fields AI Recognizes

Include these fields in responses:

**Volume indicators**: queue_depth, pending_count, backlog_size
**Rate metrics**: error_rate_pct, processing_rate, throughput
**Status fields**: status, state, health
**Explicit hints**: suggested_interval_ms, recommendation
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| "Descriptions as rules" not explained | Documentation | Add paradigm section |
| Description examples for various rules | Documentation | Add samples |
| Programmatic API for rule integration | Documentation | Add API examples |

## Priority

**MEDIUM** - Score is 75/100; documentation refinements needed.

## Expected Improvement

- Current: 75/100
- With paradigm explanation and description examples: **88-92/100**

The AI-driven approach is powerful; documentation needs to explain that descriptions replace traditional rules.
