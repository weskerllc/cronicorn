---
title: How AI Adaptation Works
description: Deep-dive into the AI Planner worker, hint mechanics, and structuring response bodies for intelligent scheduling
tags: [ai-planner, hints, adaptation, response-bodies, tools]
prerequisites: [system-architecture]
related: [how-scheduling-works, coordinating-multiple-endpoints]
---

# How AI Adaptation Works

This document explains how the AI Planner analyzes endpoint execution patterns and suggests schedule adjustments. If you haven't read [System Architecture](./system-architecture.md), start there for context on the dual-worker design.

## The AI Planner's Job

The AI Planner worker has one responsibility: analyze endpoint execution patterns and suggest scheduling adjustments by writing hints to the database. It doesn't execute jobs, manage locks, or worry about reliability. It observes and recommends.

The AI Planner runs independently from the Scheduler. Typically it wakes up every 5 minutes (configurable) and analyzes recently active endpoints. The analysis happens asynchronously—the Scheduler doesn't wait for it.

## Discovery: Finding Endpoints to Analyze

The AI Planner doesn't analyze every endpoint on every cycle. That would be expensive (AI API costs) and unnecessary (most endpoints are stable).

Instead, it uses a **discovery mechanism** to find endpoints that executed recently:

1. Query the database for endpoints that ran within the last 5-10 minutes
2. Filter to endpoints that haven't been analyzed in the last cycle (avoid duplicate work)
3. Analyze each discovered endpoint in sequence

This approach focuses AI attention on active endpoints where adaptation might be valuable. Dormant endpoints (not running) don't get analyzed until they become active again.

The discovery window (5-10 minutes) is configurable. Wider windows catch more endpoints but increase batch size. Narrower windows reduce costs but might miss some activity.

## What the AI Sees: Building Context

For each endpoint, the AI Planner builds a comprehensive analysis prompt containing:

### Current Configuration

- **Baseline schedule**: Cron expression or interval
- **Constraints**: Min/max intervals
- **Pause state**: Whether paused and until when
- **Active hints**: Current AI interval/one-shot hints and their expiration times
- **Failure count**: Number of consecutive failures (affects exponential backoff)

This tells the AI what scheduling behavior is currently in effect.

### Recent Performance (Last 24 Hours)

- **Success rate**: Percentage of successful executions
- **Total runs**: Number of executions
- **Average duration**: Mean execution time
- **Failure streak**: Consecutive failures (signals degradation)
- **Last run status**: Most recent execution outcome

These health metrics help the AI spot trends: improving, degrading, or stable.

### Response Body Data

This is the key to intelligent adaptation. Every execution records the **response body**—the JSON returned by your endpoint.

The AI can query response data in three ways:

1. **Latest response**: Check current state (one data point)
2. **Response history**: Identify trends over time (multiple data points)
3. **Sibling responses**: Coordinate across endpoints in the same job

The response body can contain any JSON structure you design. The AI looks for signals indicating:

- **Load indicators**: queue_depth, pending_count, backlog_size
- **Performance metrics**: latency, p95, processing_time
- **Error rates**: error_count, failure_rate, error_pct
- **Health flags**: healthy, available, status, state
- **Coordination signals**: ready_for_processing, dependency_status
- **Timestamps**: last_success_at, completed_at (detect staleness)

Structure your response bodies to include the metrics that matter for your use case.

### Job Context

If the endpoint belongs to a job, the AI sees the job's description. This provides high-level intent:

> "Monitors payment queue and triggers processing when depth exceeds threshold"

The AI uses this context to interpret what "good" vs "bad" looks like for specific metrics. A growing queue_depth might be normal for a collector endpoint but alarming for a processor endpoint.

## The Three Tools: How AI Takes Action

The AI Planner doesn't write to the database directly. Instead, it has access to **three action tools** that write hints:

### 1. propose_interval

**Purpose**: Adjust how frequently the endpoint runs

**Parameters**:
- `intervalMs`: New interval in milliseconds
- `ttlMinutes`: How long the hint is valid (default: 60 minutes)
- `reason`: Optional explanation

**When to use**:
- Tighten monitoring during load spikes (5min → 30sec)
- Relax during stability (1min → 10min to save resources)
- Override exponential backoff after recovery (restore normal cadence)

**Example**:
```
AI sees queue_depth growing: 50 → 100 → 200 over last 10 runs
Action: propose_interval(30000, ttl=15, reason="Growing queue requires tighter monitoring")
Effect: Runs every 30 seconds for 15 minutes, then reverts to baseline
```

**How it works**:
1. AI calls the tool with parameters
2. Tool writes `aiHintIntervalMs` and `aiHintExpiresAt` to database
3. Tool calls `setNextRunAtIfEarlier(now + intervalMs)` to apply immediately (nudging)
4. Scheduler's next tick reads the hint, Governor uses it to calculate next run
5. After TTL expires, hint is ignored and baseline resumes

### 2. propose_next_time

**Purpose**: Schedule a specific one-time execution

**Parameters**:
- `nextRunAtIso`: ISO 8601 timestamp for next run
- `ttlMinutes`: How long the hint is valid (default: 30 minutes)
- `reason`: Optional explanation

**When to use**:
- Run immediately to investigate a failure (now)
- Defer to off-peak hours (specific timestamp)
- Coordinate with external events (batch completion time)

**Example**:
```
AI sees failure spike (success rate drops to 45%)
Action: propose_next_time(now, ttl=5, reason="Investigate failure spike")
Effect: Runs immediately once, then resumes baseline schedule
```

**How it works**:
1. AI calls the tool with a timestamp
2. Tool writes `aiHintNextRunAt` and `aiHintExpiresAt` to database
3. Tool calls `setNextRunAtIfEarlier(timestamp)` to apply immediately
4. Scheduler claims endpoint when `nextRunAt` arrives
5. After execution or TTL expiry, hint is cleared and baseline resumes

### 3. pause_until

**Purpose**: Stop execution temporarily or resume

**Parameters**:
- `untilIso`: ISO 8601 timestamp to pause until, or `null` to resume
- `reason`: Optional explanation

**When to use**:
- Dependency is down (pause until it recovers)
- Rate limit detected (pause for cooldown period)
- Maintenance window (pause until completion)
- Resume after manual pause (pass `null`)

**Example**:
```
AI sees responseBody: { dependency_status: "unavailable" }
Action: pause_until("2025-11-02T15:30:00Z", reason="Dependency unavailable")
Effect: No executions until 3:30 PM, then resumes baseline
```

**How it works**:
1. AI calls the tool with a timestamp (or `null`)
2. Tool writes `pausedUntil` to database
3. Scheduler's Governor checks pause state—if `pausedUntil > now`, returns that timestamp with source `"paused"`
4. When pause time passes, Governor resumes normal scheduling

## Query Tools: Informing Decisions

Before taking action, the AI can query response data using **three query tools**:

### 1. get_latest_response

**Returns**: Most recent response body, timestamp, status

**Use case**: Check current state snapshot

Example: "What's the current queue depth?"

### 2. get_response_history

**Parameters**:
- `limit`: Number of responses (1-10, default 2)
- `offset`: Skip N newest responses for pagination

**Returns**: Array of response bodies with timestamps, newest first

**Use case**: Identify trends over time

Example: "Is queue_depth increasing monotonically?"

**Efficiency tip**: Start with `limit=2` to check recent trend. If you need more context, use `offset=2, limit=3` to get the next 3 older responses.

Response bodies are truncated at 1000 characters to prevent token overflow.

### 3. get_sibling_latest_responses

**Returns**: Latest response from each sibling endpoint in the same job

**Use case**: Coordinate across endpoints

Example: "Did the upstream endpoint finish processing?"

Only useful for workflow endpoints (multiple endpoints in the same job that coordinate).

## Hint Mechanics: TTLs and Expiration

All AI hints have **time-to-live (TTL)**—they expire automatically. This is a safety mechanism.

**Why TTLs matter**:
- If the AI makes a bad decision (too aggressive, too relaxed), it auto-corrects
- Temporary conditions (spikes, failures) don't permanently alter schedules
- You can experiment with aggressive hints knowing they'll revert

**TTL strategy**:
- **Short (5-15 minutes)**: Transient spikes, immediate investigations
- **Medium (30-60 minutes)**: Operational shifts, business hours patterns
- **Long (2-4 hours)**: Sustained degradation, maintenance windows

When a hint expires (`aiHintExpiresAt <= now`):
1. Scheduler's Governor ignores it during next run calculation
2. Baseline schedule resumes
3. Hint fields remain in database (for debugging) until next execution clears them

## Override vs. Compete: Hint Semantics

Understanding how hints interact with baseline is critical:

**AI interval hints OVERRIDE baseline**:
- If hint is active, Governor ignores baseline completely
- Enables tightening (5min → 30sec) and relaxing (1min → 10min)
- Baseline only applies when hint expires

**AI one-shot hints COMPETE with baseline**:
- Governor chooses earliest between hint timestamp and baseline next run
- Enables immediate runs (one-shot sooner than baseline)
- Baseline still influences scheduling

**When both hints exist**:
- They compete with each other (earliest wins)
- Baseline is ignored entirely

This design allows the AI to both tighten/relax ongoing cadence (interval) and trigger specific executions (one-shot) without the hints fighting each other.

## Nudging: Immediate Effect

When the AI writes a hint, it doesn't just sit in the database waiting for the next baseline execution. That could take minutes or hours.

Instead, the AI **nudges** the `nextRunAt` field using `setNextRunAtIfEarlier(timestamp)`:

1. Calculate when the hint should take effect (`now + intervalMs` or specific timestamp)
2. Compare with current `nextRunAt`
3. If hint time is earlier, update `nextRunAt` immediately
4. Scheduler claims endpoint on next tick (within 5 seconds)

**Example timeline**:

```
T=0: Endpoint scheduled to run at T=300 (5 minutes from now)
T=60: AI analyzes, sees spike, proposes 30-second interval
T=60: AI writes hint and nudges nextRunAt to T=90 (30 seconds from T=60)
T=65: Scheduler wakes up, claims endpoint (nextRunAt=T=90 is due soon)
T=90: Scheduler executes endpoint
```

Without nudging, the endpoint would wait until T=300 to apply the new interval. With nudging, it applies at T=90—within seconds of the AI's decision.

**Important**: Nudging respects constraints. If the nudged time violates `minIntervalMs`, the Governor clamps it during scheduling.

## Structuring Response Bodies for AI

The AI can only work with the data you provide. Here's how to structure response bodies:

### Include Relevant Metrics

```json
{
  "queue_depth": 250,
  "processing_rate_per_min": 80,
  "error_rate_pct": 2.5,
  "avg_latency_ms": 145,
  "healthy": true,
  "last_success_at": "2025-11-02T14:30:00Z"
}
```

The AI looks for field names like `queue`, `latency`, `error`, `rate`, `count`, `healthy`, `status`.

### Use Consistent Naming

If queue depth is `queue_depth` in one response, don't call it `pending_items` in another. Consistency helps the AI spot trends.

### Include Thresholds

```json
{
  "queue_depth": 250,
  "queue_max": 500,
  "queue_warning_threshold": 300
}
```

This tells the AI when to intervene (crossing thresholds).

### Add Coordination Signals

For workflow endpoints:

```json
{
  "ready_for_processing": true,
  "upstream_completed_at": "2025-11-02T14:45:00Z",
  "data_available": true
}
```

The AI can use `get_sibling_latest_responses` to read these flags and coordinate execution.

### Include Timestamps

```json
{
  "last_alert_sent_at": "2025-11-02T12:00:00Z",
  "last_cache_warm_at": "2025-11-02T13:30:00Z"
}
```

This enables **cooldown patterns**—the AI can check if enough time has passed before triggering duplicate actions.

### Keep It Simple

The AI receives truncated response bodies (1000 chars). Don't include massive arrays or deeply nested objects. Focus on summary metrics.

## Decision Framework: When AI Acts

The AI follows a conservative decision framework:

**Default to stability**: Most of the time, doing nothing is optimal.

**Intervene when**:
- Clear trend (5+ data points showing monotonic change)
- Threshold crossing (metric jumps significantly)
- State transition (dependency status changes)
- Coordination signal (sibling endpoint signals readiness)

**Don't intervene when**:
- Single anomaly (might be transient)
- Insufficient data (<10 total runs)
- Metrics within normal ranges
- No clear cause-effect logic

The AI's reasoning is logged in `ai_analysis_sessions` table. You can review what it considered and why it acted (or didn't).

## Analysis Sessions: Debugging AI Decisions

Every AI analysis creates a session record:

- **Endpoint analyzed**
- **Timestamp**
- **Tools called** (which queries and actions)
- **Reasoning** (AI's explanation of its decision)
- **Token usage** (cost tracking)
- **Duration**

This audit trail helps you:
- Debug unexpected scheduling behavior
- Understand why AI tightened/relaxed intervals
- Review cost (token usage per analysis)
- Tune prompts or constraints based on AI reasoning

Check the sessions table when an endpoint's schedule changes unexpectedly. The reasoning field shows the AI's thought process.

## Quota and Cost Control

AI analysis costs money (API calls). The system includes quota controls:

- Per-tenant quota limits (prevent runaway costs)
- Before analyzing an endpoint, check `quota.canProceed(tenantId)`
- If quota exceeded, skip analysis (Scheduler continues on baseline)

This ensures that even if AI becomes unavailable or too expensive, your jobs keep running.

## Putting It Together: Example Analysis

**Scenario**: Payment queue monitoring endpoint

**Baseline**: 5-minute interval

**T=0**: Scheduler runs endpoint
- Response: `{ "queue_depth": 50, "processing_rate": 100, "healthy": true }`
- Records to database

**T=5min**: AI Planner discovers endpoint (ran recently)
- Queries `get_latest_response`: queue_depth=50
- Queries `get_response_history(limit=5)`: [50, 48, 52, 49, 51]
- Analysis: "Stable around 50, no trend, 100% success rate"
- Decision: "No action—stability optimal"
- Session logged with reasoning

**T=10min**: Scheduler runs again
- Response: `{ "queue_depth": 150, "processing_rate": 100, "healthy": true }`
- Records to database

**T=12min**: AI Planner analyzes again
- Queries `get_response_history(limit=5)`: [150, 50, 48, 52, 49]
- Analysis: "Queue jumped from 50 to 150. Single spike or trend?"
- Queries `get_response_history(limit=2, offset=5)`: [51, 50]
- Analysis: "Stable before, then spike. Monitor closely."
- Decision: `propose_interval(60000, ttl=15, reason="Queue spike detected")`
- Nudges `nextRunAt` to T=13min (1 minute from now)

**T=13min**: Scheduler claims endpoint (nudged)
- Executes, gets response: `{ "queue_depth": 200, ... }`
- Governor sees active interval hint (60000ms)
- Schedules next run at T=14min (1 minute interval)

**T=14min, T=15min, ..., T=27min**: Runs every 1 minute
- AI hint remains active (TTL=15 minutes from T=12min = expires T=27min)

**T=27min**: Hint expires
- Scheduler's Governor sees `aiHintExpiresAt < now`
- Ignores hint, uses baseline (5-minute interval)
- Schedules next run at T=32min

## Key Takeaways

1. **AI discovers active endpoints**: Only analyzes what's running
2. **AI sees health + response data**: Metrics inform decisions
3. **Three action tools**: propose_interval, propose_next_time, pause_until
4. **Hints have TTLs**: Auto-revert on expiration (safety)
5. **Interval hints override baseline**: Enables adaptation
6. **Nudging provides immediacy**: Changes apply within seconds
7. **Structure response bodies intentionally**: Include metrics AI should monitor
8. **Sessions provide audit trail**: Debug AI reasoning
9. **Quota controls costs**: AI unavailable ≠ jobs stop running

Understanding how AI adaptation works helps you design endpoints that benefit from intelligent scheduling, structure response bodies effectively, and debug unexpected schedule changes.

## Next Steps

- **[Coordinating Multiple Endpoints](./coordinating-multiple-endpoints.md)** - Use AI to orchestrate workflows
- **[Configuration and Constraints](./configuration-and-constraints.md)** - Set up endpoints for optimal AI behavior
- **[Reference](./reference.md)** - Quick lookup for tools, fields, and defaults
