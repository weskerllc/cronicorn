---
id: how-ai-adaptation-works
title: How AI Adaptation Works
description: AI Planner, hints, tools, response bodies, and adaptation logic
tags: [assistant, technical, ai-planner]
sidebar_position: 3
mcp:
  uri: file:///docs/technical/how-ai-adaptation-works.md
  mimeType: text/markdown
  priority: 0.85
  lastModified: 2026-02-03T00:00:00Z
---

# How AI Adaptation Works

**TL;DR:** The AI Planner analyzes endpoint execution patterns and writes time-bounded hints to adjust schedules. It has four action tools (propose_interval, propose_next_time, pause_until, clear_hints) and three query tools for response data. Structure your response bodies with metrics the AI should monitor.

This document explains how the AI Planner suggests schedule adjustments. See [System Architecture](./system-architecture.md) for context on the dual-worker design.

## The AI Planner's Job

The AI Planner worker analyzes endpoint execution patterns and suggests scheduling adjustments by writing hints to the database. It doesn't execute jobs or manage locks—it observes and recommends.

The AI Planner runs **automatically** — no per-endpoint configuration is required. When AI is enabled on your account, the planner analyzes all endpoints with recent activity. There is no code to write, no rules engine to configure, and no parsing logic to implement. You provide descriptions and response bodies; the AI handles everything else.

## End-to-End Processing Pipeline

Here is the complete flow from endpoint execution to AI-adjusted scheduling:

```
1. SCHEDULER EXECUTES ENDPOINT
   ├─ Makes HTTP request to your URL
   ├─ Records: status (success/failed), duration, response body
   └─ Updates failure count (reset on 2xx, increment on non-2xx/timeout)

2. AI PLANNER DISCOVERS ENDPOINT (every 5 minutes)
   ├─ Queries for endpoints with recent activity
   ├─ Checks: is this endpoint due for analysis?
   │   ├─ First analysis (never analyzed before)
   │   ├─ Scheduled time passed (AI requested re-analysis)
   │   └─ State change (new failures since last analysis)
   └─ Skips endpoints not due for analysis

3. AI BUILDS CONTEXT (per endpoint)
   ├─ Endpoint config: name, description, baseline, min/max constraints
   ├─ Health metrics: success rates over 1h, 4h, 24h windows
   ├─ Active hints: current interval/one-shot hints and expiry
   └─ Job context: job description, sibling endpoint names

4. AI CALLS TOOLS (max 15 calls per session)
   ├─ Query tools: get_latest_response, get_response_history,
   │   get_sibling_latest_responses
   ├─ Action tools: propose_interval, propose_next_time,
   │   pause_until, clear_hints
   └─ Terminal tool: submit_analysis (ends session, sets next analysis time)

5. HINTS WRITTEN TO DATABASE
   ├─ ai_hint_interval_ms: proposed frequency override
   ├─ ai_hint_next_run_at: one-shot execution time
   ├─ ai_hint_expires_at: TTL expiration
   └─ ai_hint_reason: explanation for audit trail

6. SCHEDULER PICKS UP HINTS (next execution cycle)
   ├─ Governor calculates next run using priority order:
   │   1. Pause (highest priority — stops all execution)
   │   2. AI hints (interval overrides baseline, one-shot competes)
   │   3. Baseline schedule + exponential backoff
   │   4. Clamp to min/max constraints (always applied)
   └─ Updates nextRunAt in database

7. CYCLE REPEATS
   └─ Scheduler executes → AI analyzes → hints applied → ...
```

**Key points:**
- The Scheduler and AI Planner are **independent workers** communicating only through the database
- AI hints are **temporary** (TTL-based) — they expire and revert to baseline automatically
- The Scheduler **never stops** even if the AI is unavailable — it continues on baseline schedules
- AI analysis sessions are **recorded** for debugging (tools called, reasoning, token usage)

## Discovery: Finding Endpoints to Analyze

The AI Planner uses **smart scheduling** where it controls when to analyze again:

1. Query the database for recently active endpoints
2. Check if the endpoint is due for analysis:
   - **First analysis**: New endpoints never analyzed
   - **Scheduled time**: AI-requested re-analysis time has passed
   - **State change**: New failures since last analysis (triggers immediate re-analysis)
3. Skip endpoints where none of these conditions are met

The AI communicates its preferred re-analysis time via `next_analysis_in_ms` in `submit_analysis`.

## What the AI Sees

For each endpoint, the AI receives:

### Configuration
- Baseline schedule (cron or interval)
- Constraints (min/max intervals)
- Pause state and active hints
- Failure count

### Multi-Window Health Metrics

| Window | Metrics |
|--------|---------|
| **Last 1 hour** | Success rate, run count |
| **Last 4 hours** | Success rate, run count |
| **Last 24 hours** | Success rate, run count |

Plus average duration and failure streak.

Multiple windows matter for recovery detection. A 24-hour window can show 5% success even when recent performance is 100% due to old failures.

### Response Body Data

The AI can query response data three ways:
1. **Latest response**: Current state snapshot
2. **Response history**: Trends over time
3. **Sibling responses**: Coordinate across endpoints in the same job

### Job Context
- Job description (high-level intent)
- Sibling endpoint names

## Session Constraints

Each analysis session is limited to prevent runaway costs:
- **Maximum 15 tool calls** per session
- **10 history records** is usually sufficient
- Sessions hitting the limit are terminated

## The Four Action Tools

### 1. propose_interval

Adjust how frequently the endpoint runs.

**Parameters**: `intervalMs`, `ttlMinutes` (default: 60), `reason`

**When to use**:
- Tighten monitoring during load spikes (5min → 30sec)
- Relax during stability (1min → 10min to save resources)
- Override exponential backoff after recovery

**How it works**: Writes `aiHintIntervalMs` and `aiHintExpiresAt` to database, then nudges `nextRunAt` to apply immediately.

### 2. propose_next_time

Schedule a specific one-time execution.

**Parameters**: `nextRunAtIso`, `ttlMinutes` (default: 30), `reason`

**When to use**:
- Run immediately to investigate a failure
- Defer to off-peak hours
- Coordinate with external events

### 3. pause_until

Stop execution temporarily or resume.

**Parameters**: `untilIso` (or `null` to resume), `reason`

**When to use**:
- Dependency is down
- Rate limit detected
- Maintenance window

### 4. clear_hints

Reset endpoint to baseline schedule.

**Parameters**: `reason`

**When to use**:
- AI hints no longer relevant
- Manual intervention resolved the issue
- Revert to baseline without waiting for TTL

## Query Tools

### get_latest_response
Returns most recent response body, timestamp, status.

### get_response_history
**Parameters**: `limit` (1-10), `offset`

Returns array of response bodies with timestamps. 10 records is usually sufficient.

### get_sibling_latest_responses
Returns for each sibling endpoint:
- Response data (body, timestamp, status)
- Schedule info (baseline, next run, pause status)
- Active AI hints with expiry and reason

## Hint Mechanics

### TTLs and Expiration

All hints expire automatically—this is a safety mechanism:
- **Short (5-15 min)**: Transient spikes, immediate investigations
- **Medium (30-60 min)**: Operational shifts
- **Long (2-4 hours)**: Sustained degradation, maintenance

When hints expire, the system falls back to baseline.

### Override vs. Compete

**AI interval hints OVERRIDE baseline**: If active, Governor ignores baseline completely. Enables both tightening and relaxing.

**AI one-shot hints COMPETE with baseline**: Governor chooses earliest. Enables immediate runs.

For detailed constraint interaction, see [How Scheduling Works](./how-scheduling-works.md).

### Nudging

When AI writes a hint, it nudges `nextRunAt` to apply immediately using `setNextRunAtIfEarlier(timestamp)`:

```
T=0: Endpoint scheduled for T=300 (5 min baseline)
T=60: AI proposes 30-second interval
T=60: AI nudges nextRunAt to T=90
T=90: Scheduler executes endpoint
```

Without nudging, changes wait until T=300. With nudging, they apply at T=90.

## Structuring Response Bodies

The AI works with the data you provide. Structure response bodies to include:

### Relevant Metrics
```json
{
  "queue_depth": 250,
  "processing_rate_per_min": 80,
  "error_rate_pct": 2.5,
  "avg_latency_ms": 145,
  "healthy": true
}
```

The AI looks for: `queue`, `latency`, `error`, `rate`, `count`, `healthy`, `status`.

### Thresholds
```json
{
  "queue_depth": 250,
  "queue_max": 500,
  "queue_warning_threshold": 300
}
```

### Coordination Signals

For multi-endpoint workflows:
```json
{
  "ready_for_processing": true,
  "upstream_completed_at": "2025-11-02T14:45:00Z",
  "needs_downstream_action": true
}
```

### Stability Signals

For volatile workloads:
```json
{
  "trend": "stable",
  "within_normal_range": true,
  "avg_5min": 487,
  "recommendation": "maintain_interval"
}
```

### Explicit Recommendations

You can include scheduling hints:
```json
{
  "status": "degraded",
  "recommendation": "increase_frequency",
  "suggested_interval_ms": 30000
}
```

The AI interprets these as guidance, not commands.

### Tips
- Use consistent naming across responses
- Include timestamps for cooldown patterns
- Keep it simple (1000 char truncation)
- Include smoothed averages for volatile data
- Add explicit signals (`ready_for_*`, `needs_*`, `recommendation`)

## Decision Framework

The AI follows a conservative approach:

**Default to stability**: Most of the time, doing nothing is optimal.

**Intervene when**:
- Clear trend (5+ data points showing monotonic change)
- Threshold crossing
- State transition (dependency status changes)
- Coordination signal from sibling

**Don't intervene when**:
- Single anomaly (might be transient)
- Insufficient data (fewer than 10 total runs)
- Metrics within normal ranges

## Complete AI Decision Examples

These examples show the exact sequence of tool calls the AI makes in common scenarios.

### Example: Tightening During Degradation

Endpoint: `api-health-check` (baseline 5 minutes, min 30 seconds)
Description: "Poll more frequently when error_rate_pct exceeds 5%. Return to baseline when below 2%."

1. AI calls `get_latest_response()`
   → Returns: `{ "status": "degraded", "error_rate_pct": 8.5, "latency_ms": 1200 }`
2. AI calls `get_response_history(limit=5)`
   → Shows error_rate climbing: 2.1 → 3.5 → 5.2 → 7.1 → 8.5
3. AI reads description: threshold is 5%, current is 8.5%, sustained upward trend across 5 readings
4. AI calls `propose_interval(intervalMs=30000, ttlMinutes=60, reason="Error rate climbing to 8.5%, above 5% threshold - tightening to 30s")`
5. Governor applies: next run in 30 seconds (within min constraint)

### Example: Recovery and Return to Baseline

Endpoint: same `api-health-check`, currently running at 30-second hint

1. AI calls `get_latest_response()`
   → Returns: `{ "status": "healthy", "error_rate_pct": 0.5, "latency_ms": 145 }`
2. AI calls `get_response_history(limit=5)`
   → Shows error_rate declining: 8.5 → 5.2 → 2.1 → 0.8 → 0.5
3. AI reads description: "Return to baseline when below 2%" — current is 0.5%, sustained downward trend
4. AI calls `clear_hints(reason="Error rate normalized to 0.5%, below 2% threshold - returning to baseline")`
5. Governor falls back to baseline: next run in 5 minutes

### Example: Data Volume Driving Frequency

Endpoint: `sync-status` (baseline 10 minutes, min 30 seconds)
Description: "Poll every 30 seconds when records_pending > 1000. Return to baseline when below 100."

1. AI calls `get_latest_response()`
   → Returns: `{ "records_pending": 15000, "sync_rate_per_minute": 500, "status": "syncing" }`
2. AI reads description: "records_pending > 1000" threshold — current is 15000
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="15000 records pending, above 1000 threshold")`
4. Next analysis: AI calls `get_latest_response()` → `{ "records_pending": 50, "status": "idle" }`
5. AI reads description: "Return to baseline when below 100" — current is 50
6. AI calls `clear_hints(reason="Records pending at 50, below 100 threshold - returning to baseline")`

### Example: Sibling-Triggered Recovery

Endpoint: `trigger-recovery` (baseline 24 hours, min 5 minutes)
Description: "Only run when health-check sibling shows needs_recovery=true."

1. AI calls `get_sibling_latest_responses()`
   → Returns: `{ "health-check": { "body": { "status": "error", "needs_recovery": true }, "statusCode": 500 } }`
2. AI reads description: "run when health-check sibling shows needs_recovery=true"
3. AI sees: health-check returned `needs_recovery: true`
4. AI calls `propose_next_time(now, ttlMinutes=30, reason="Health-check shows needs_recovery=true, triggering immediate recovery")`
5. Governor schedules: immediate execution

After recovery succeeds:
1. AI calls `get_sibling_latest_responses()`
   → Returns: `{ "health-check": { "body": { "status": "ok", "needs_recovery": false } } }`
2. AI reads description: no trigger condition met
3. No action — trigger-recovery returns to 24-hour baseline

### Example: Inverse Scaling (Reduce Load Under Pressure)

Endpoint: `system-load-monitor` (baseline 1 minute, min 10 seconds, max 5 minutes)
Description: "INVERSE SCALING: when cpu_pct > 80, poll LESS frequently. When cpu_pct < 50, poll MORE frequently."

1. AI calls `get_latest_response()`
   → Returns: `{ "cpu_pct": 92, "memory_pct": 78, "recommendation": "reduce_polling" }`
2. AI reads description: "when cpu_pct > 80, poll LESS frequently" — current is 92
3. AI calls `propose_interval(intervalMs=300000, ttlMinutes=30, reason="CPU at 92%, reducing polling to 5min to lower overhead")`

When load drops:
1. AI calls `get_latest_response()` → Returns: `{ "cpu_pct": 35, "recommendation": "normal" }`
2. AI reads description: "when cpu_pct < 50, poll MORE frequently"
3. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="CPU at 35%, increasing polling - system has capacity")`

### Example: Oscillation Prevention

Endpoint: `volatile-metrics` (baseline 1 minute, min 30 seconds, max 2 minutes)
Description: "STABILITY PRIORITY. Only use avg_5min, never instant_value. Only act on sustained trends."

Transient spike — AI does NOT react:
1. AI calls `get_latest_response()`
   → Returns: `{ "instant_value": 950, "avg_5min": 510, "trend": "stable", "within_normal_range": true }`
2. AI reads description: "Only use avg_5min" — avg_5min is 510 (normal)
3. AI reads description: "within_normal_range is true" — no action needed
4. **No action** — maintains current interval despite extreme instant_value
5. Reasoning: "Transient spike in instant_value but smoothed avg_5min is normal and trend is stable"

Genuine state change — AI does react:
1. AI calls `get_latest_response()` → Returns: `{ "avg_5min": 780, "trend": "rising", "within_normal_range": false }`
2. AI calls `get_response_history(limit=5)` → avg_5min rising: 510 → 580 → 650 → 720 → 780
3. AI reads description: "Only act on sustained trends" — 5 consecutive readings show rise
4. AI calls `propose_interval(intervalMs=30000, ttlMinutes=30, reason="Sustained rise in avg_5min, outside normal range")`

## Stability and Oscillation Prevention

Cronicorn includes multiple mechanisms to prevent oscillation between extreme scheduling states.

### Built-in Stability Mechanisms

**1. Multi-Window Health Metrics**

The AI sees success rates across three windows (1h, 4h, 24h). This prevents reacting to momentary spikes—the AI compares windows to distinguish genuine state changes from transient noise.

**2. Analysis Cooldown**

The AI Planner doesn't analyze every response. Default 5-minute cooldown between analyses prevents rapid decision changes.

**3. TTL-Based Hints**

All hints expire automatically. When hints expire, endpoints return to baseline—a natural stability anchor.

**4. Hard Constraints**

Min/max intervals provide absolute limits. Even with volatile AI decisions, constraints bound the range.

### Configuring for Volatile Workloads

Use tighter constraint ranges for volatile data:

| Volatility Level | Min Interval | Max Interval | Ratio |
|------------------|--------------|--------------|-------|
| Low (stable)     | 10s          | 10min        | 60x   |
| Medium           | 30s          | 5min         | 10x   |
| High             | 30s          | 2min         | 4x    |
| Extreme          | 1min         | 2min         | 2x    |

With a 4x range, even aggressive AI decisions stay bounded.

### Requesting Stability in Descriptions

Include phrases like:
- "Prioritize stability over responsiveness"
- "Don't overreact to momentary changes"
- "Look for sustained trends"
- "When uncertain, maintain current interval"

### Response Design for Stability

Return smoothed/averaged values instead of instantaneous readings:

```json
// Volatile (causes oscillation)
{ "current_value": 523, "instant_error_rate": 15.5 }

// Smoothed (promotes stability)
{
  "avg_value_5min": 487,
  "avg_error_rate_1hr": 2.3,
  "trend": "stable",
  "within_normal_range": true
}
```

### Debugging Oscillation

If you observe oscillation:
1. **Check constraints**: Are min/max intervals configured? Is the range appropriate?
2. **Review response data**: Are you returning instantaneous vs. averaged metrics?
3. **Check AI analysis sessions**: What reasoning is the AI providing?
4. **Add stability signals**: Include `trend`, `within_normal_range`, or `recommendation` fields

## Analysis Sessions

Every analysis creates a session record with:
- Endpoint analyzed and timestamp
- Tools called (queries and actions)
- Reasoning (AI's explanation)
- Token usage and duration
- Next analysis time
- Endpoint failure count snapshot

Check sessions when an endpoint's schedule changes unexpectedly.

## Quota and Cost Control

AI analysis has quota controls:
- Per-tenant quota limits
- Before analyzing, check `quota.canProceed(tenantId)`
- If quota exceeded, skip analysis (Scheduler continues on baseline)

This ensures jobs keep running even if AI becomes unavailable or too expensive.

## Failure Modes and Graceful Degradation

Cronicorn is designed to keep running regardless of what fails:

| Failure | What Happens | User Impact |
|---------|-------------|-------------|
| **AI Planner unavailable** | Scheduler continues on baseline schedules. Existing hints remain until TTL expires. | Endpoints run normally, just without AI adaptation |
| **AI quota exceeded** | Analysis skipped for billing period. Scheduler unaffected. | Same as above |
| **Endpoint returns non-2xx** | Failure count increments. Exponential backoff applies (2^failures, cap at 32x). AI analyzes the failure pattern. | Endpoint slows down but doesn't stop |
| **Endpoint times out** | Recorded as `failed`. Same backoff as non-2xx. | Same as above |
| **Response body empty/malformed** | AI still sees HTTP status, duration, and health metrics. Gracefully handles any content. | AI makes decisions based on available data |
| **Response body too large** | Truncated to 500 characters. AI works with truncated data. | Design response bodies with key fields first |
| **AI proposes invalid interval** | Governor clamps to min/max constraints. | Constraints always enforced regardless of AI |
| **Database connection lost** | Both workers retry with backoff. No data lost. | Brief scheduling delay |

**The system self-heals:** When AI recovers, it resumes analysis. When endpoints recover (return 2xx), failure counts reset to 0 immediately. When hints expire, schedules revert to baseline. No manual intervention is required for any failure scenario.

## Key Takeaways

1. **AI controls its own analysis frequency**
2. **Multi-window health data** enables accurate recovery detection
3. **Sessions have constraints** (max 15 tool calls)
4. **Four action tools**: propose_interval, propose_next_time, pause_until, clear_hints
5. **Hints have TTLs**: Auto-revert on expiration
6. **Interval hints override baseline**: Enables adaptation
7. **Nudging provides immediacy**: Changes apply within seconds
8. **Structure response bodies intentionally**
9. **Sessions provide audit trail**
10. **Quota controls costs**: AI unavailable ≠ jobs stop running

---

## See Also

- **[System Architecture](./system-architecture.md)** - High-level dual-worker design
- **[How Scheduling Works](./how-scheduling-works.md)** - Detailed Governor logic and constraint behavior
- **[Configuration and Constraints](./configuration-and-constraints.md)** - Setting up endpoints effectively
- **[Coordinating Multiple Endpoints](./coordinating-multiple-endpoints.md)** - Workflow patterns
