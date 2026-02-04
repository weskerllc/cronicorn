# Benchmark Analysis: Q4 - Automated Recovery Actions on Error Codes

**Score: 32/100** (Lowest rated)

## Question

> Describe how you would set up a Cronicorn job that triggers an automated recovery action when an HTTP endpoint returns a specific error code, then returns to normal polling once the service recovers.

## Current Capability Assessment

### What Cronicorn CAN Do Today

1. **Detect Error Codes**: The scheduler captures HTTP status codes from responses and stores them in the `runs` table. The AI Planner can query these via `get_response_history` tool.

2. **Adjust Polling Frequency on Errors**: AI can use `propose_interval` to tighten monitoring when errors are detected.

3. **Pause During Outages**: AI can use `pause_until` to stop polling during known maintenance.

4. **Revert to Baseline**: AI can use `clear_hints` when service recovers.

5. **Multi-Endpoint Coordination**: AI can check sibling endpoints via `get_sibling_latest_responses` to trigger actions in other endpoints.

### What Cronicorn CANNOT Do Today

1. **Direct Recovery Actions**: Cronicorn endpoints make HTTP calls but the AI cannot directly invoke arbitrary recovery webhooks. The only HTTP calls are the scheduled endpoint executions themselves.

2. **Conditional Webhook Triggers**: There's no native "on error code X, call webhook Y" functionality. The AI can only adjust scheduling, not trigger external actions.

3. **State Machine for Recovery**: There's no explicit recovery workflow state machine. The AI infers state from response patterns.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| No explicit "recovery action" pattern documented | Users don't know how to model this | Missing entirely |
| No example showing error code → action workflow | Users can't implement recovery patterns | No examples |
| `pause_until` as recovery mechanism not explained | Underutilized feature | Mentioned but not in recovery context |
| Multi-endpoint "trigger" pattern missing | Key workaround not documented | Absent |

### Functionality Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No native "action endpoint" concept | Can't directly trigger recovery | Consider new feature or document workaround |
| No webhook callback on state change | Can't notify external systems | Future feature consideration |
| No explicit state machine | Recovery transitions are implicit | Document AI's implicit state handling |

## Recommended Workaround (Documentable Today)

The current architecture can support recovery actions through a **multi-endpoint pattern**:

```
Job: "Service Health Monitor"
├── Endpoint 1: "health-check" (baseline: 60s)
│   └── Returns: { "status": "degraded", "error_code": 503, "needs_recovery": true }
│
├── Endpoint 2: "trigger-recovery" (baseline: 3600s, normally idle)
│   └── URL: POST https://ops.example.com/api/recover
│   └── AI monitors sibling health-check, proposes immediate execution when degraded
│
└── Endpoint 3: "verify-recovery" (baseline: 300s)
    └── AI checks if service recovered, clears hints on health-check
```

### How It Works

1. **health-check** returns error code 503 with `"needs_recovery": true`
2. AI Planner sees degraded state, tightens `health-check` interval
3. AI calls `get_sibling_latest_responses` for `trigger-recovery`
4. AI uses `propose_next_time` to trigger `trigger-recovery` immediately
5. `trigger-recovery` makes POST to recovery webhook
6. `verify-recovery` monitors until service returns healthy
7. AI uses `clear_hints` on all endpoints to return to baseline

## Documentation Improvements Needed

### 1. New Section in `how-ai-adaptation-works.md`

Add section: **"Pattern: Automated Recovery Actions"**

```markdown
## Pattern: Automated Recovery Actions

Cronicorn can trigger automated recovery actions using a multi-endpoint pattern:

### Setup

1. **Monitor Endpoint**: Checks service health, returns structured data including error codes
2. **Action Endpoint**: Points to your recovery webhook (slow baseline, AI-triggered)
3. **Verification Endpoint**: Confirms recovery before returning to normal

### Example Response Structure

Health check should return:
```json
{
  "status": "degraded",
  "error_code": 503,
  "needs_recovery": true,
  "last_healthy_at": "2025-01-15T10:00:00Z"
}
```

Action endpoint target:
```
POST https://ops.example.com/api/actions/restart-service
```

### AI Behavior

The AI Planner will:
1. Detect `needs_recovery: true` in health check response
2. Query sibling endpoints via `get_sibling_latest_responses`
3. Trigger action endpoint using `propose_next_time(now)`
4. Continue monitoring until `needs_recovery: false`
5. Clear hints with `clear_hints` to return to baseline

### Important: Action Endpoint Design

- Set a long baseline interval (1 hour+) so it doesn't trigger repeatedly
- AI will propose immediate execution only when needed
- Include cooldown logic in your recovery endpoint to prevent rapid retriggers
```

### 2. New Use Case in `use-cases.md`

Add: **"Automated Recovery on Error"**

```markdown
### Automated Recovery on Error

**Scenario**: Database connection errors trigger automatic failover.

**Setup**:
- `db-health`: GET https://api.example.com/health/db (every 30s)
- `trigger-failover`: POST https://ops.example.com/db/failover (every 1 hour baseline)
- `verify-failover`: GET https://api.example.com/health/db-secondary (every 5 minutes)

**Response Design**:
```json
// db-health returns
{
  "status": "error",
  "error_code": "ECONNREFUSED",
  "primary_healthy": false,
  "failover_needed": true
}
```

**AI Behavior**: Sees `failover_needed: true`, triggers `trigger-failover` immediately, monitors `verify-failover` until secondary is healthy, then clears all hints.
```

### 3. New Section in `coordinating-multiple-endpoints.md`

Add: **"Pattern 6: Error-Triggered Recovery Actions"**

Document the complete flow with code examples.

### 4. Add to `troubleshooting.md`

Add FAQ:
```markdown
### How do I trigger a webhook when my endpoint fails?

Use a multi-endpoint pattern:
1. Create a monitoring endpoint that checks health
2. Create an action endpoint pointing to your webhook (long baseline)
3. AI will trigger the action endpoint when monitoring detects errors
4. Design your webhook to handle the trigger (idempotency, cooldowns)
```

## Feature Considerations (Future)

If this pattern is frequently requested, consider:

1. **Native Action Endpoints**: A new endpoint type that doesn't poll but is triggered by AI decisions
   - Pros: Cleaner model, explicit recovery semantics
   - Cons: Significant new feature, complexity

2. **Webhook Callbacks**: System sends webhooks on state changes (error detected, recovered)
   - Pros: Standard integration pattern
   - Cons: New infrastructure, authentication challenges

3. **Response-Driven Actions**: Define action rules in endpoint config
   - Pros: Declarative, no AI needed
   - Cons: Limited flexibility, different paradigm

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Document multi-endpoint recovery pattern | **HIGH** | Low | High - enables capability |
| Add recovery use case | **HIGH** | Low | High - concrete example |
| Add to coordinating-endpoints doc | **MEDIUM** | Low | Medium - advanced users |
| Add troubleshooting FAQ | **MEDIUM** | Low | Medium - discoverability |
| Consider native action endpoints | **LOW** | High | Medium - cleaner but complex |

## Expected Score Improvement

With documentation improvements:
- Current: 32/100
- Expected: 65-75/100

The workaround is viable but requires clear documentation. Native feature support would push to 85+.

## Summary

**Primary Gap**: Documentation - the capability exists via multi-endpoint patterns but is not documented.

**Secondary Gap**: No native "action endpoint" concept - users must use the workaround pattern.

**Recommendation**: Document the multi-endpoint recovery pattern thoroughly with examples. This enables the use case with existing functionality while maintaining architectural simplicity.
