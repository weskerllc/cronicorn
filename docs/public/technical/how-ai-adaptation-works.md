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
  lastModified: 2025-11-02T00:00:00Z
---

# How AI Adaptation Works

This document explains how the AI Planner analyzes endpoint execution patterns and suggests schedule adjustments. If you haven't read [System Architecture](./system-architecture.md), start there for context on the dual-worker design.

## The AI Planner's Job

The AI Planner worker has one responsibility: analyze endpoint execution patterns and suggest scheduling adjustments by writing hints to the database. It doesn't execute jobs, manage locks, or worry about reliability. It observes and recommends.

The AI Planner runs independently from the Scheduler. Typically it wakes up every 5 minutes (configurable) and analyzes recently active endpoints. The analysis happens asynchronously—the Scheduler doesn't wait for it.

## Discovery: Finding Endpoints to Analyze

The AI Planner doesn't analyze every endpoint on every cycle. That would be expensive (AI API costs) and unnecessary (most endpoints are stable).

Instead, it uses **smart scheduling** where the AI controls when it needs to analyze again:

1. Query the database for endpoints that ran recently
2. Check if the endpoint is due for analysis based on:
   - **First analysis**: New endpoints that have never been analyzed
   - **Scheduled time**: AI-requested re-analysis time has passed
   - **State change**: New failures since last analysis (triggers immediate re-analysis)
3. Skip endpoints where none of these conditions are met

This approach lets the AI decide its own analysis frequency:
- Stable endpoints: "Check again in 4 hours"
- Incidents: "Check again in 5 minutes"
- Very stable daily jobs: "Check again in 24 hours"

The AI communicates this via the `next_analysis_in_ms` parameter in `submit_analysis` (see Tools section).

## What the AI Sees: Building Context

For each endpoint, the AI Planner builds a comprehensive analysis prompt containing:

### Current Configuration

- **Baseline schedule**: Cron expression or interval
- **Constraints**: Min/max intervals
- **Pause state**: Whether paused and until when
- **Active hints**: Current AI interval/one-shot hints and their expiration times
- **Failure count**: Number of consecutive failures (affects exponential backoff)

This tells the AI what scheduling behavior is currently in effect.

### Recent Performance (Multi-Window Health)

The AI sees health metrics across **three time windows** to accurately detect recovery patterns:

| Window | Metrics |
|--------|--------|
| **Last 1 hour** | Success rate, run count |
| **Last 4 hours** | Success rate, run count |
| **Last 24 hours** | Success rate, run count |

Plus:
- **Average duration**: Mean execution time
- **Failure streak**: Consecutive failures (signals degradation)

**Why multiple windows matter**: A single 24-hour window can be misleading during recovery. If an endpoint failed at high frequency (every 5 seconds for 2 hours = 1,440 failures) and then recovered at normal frequency (every 5 minutes for 6 hours = 72 successes), the 24-hour rate shows 4.8% success even though recent performance is 100%.

With multi-window health, the AI sees:
- Last 1h: 100% success (12 runs)
- Last 4h: 85% success (40 runs)
- Last 24h: 32% success (500 runs) ← skewed by old failures

This tells the AI "endpoint has recovered" rather than "endpoint is still failing."

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

If the endpoint belongs to a job, the AI sees:

- **Job description**: High-level intent (e.g., "Monitors payment queue and triggers processing when depth exceeds threshold")
- **Sibling endpoint names**: Other endpoints in the same job (e.g., "3 endpoints [API Monitor, Data Fetcher, Notifier]")

Knowing sibling names helps the AI:
- Understand the endpoint is part of a larger workflow
- Decide when to check sibling responses for coordination
- Make informed decisions about the `get_sibling_latest_responses` tool

The AI uses job context to interpret what "good" vs "bad" looks like for specific metrics. A growing queue_depth might be normal for a collector endpoint but alarming for a processor endpoint.

## Session Constraints

Each AI analysis session has resource limits to prevent runaway costs:

- **Maximum 15 tool calls** per session (hard limit)
- **10 history records** is usually sufficient for trend analysis
- Sessions that hit the limit are terminated

These constraints prevent the worst-case scenario: an AI session that paginates through hundreds of identical failure records, consuming 42K+ tokens for a decision reachable in 5 tool calls.

The AI is informed of these limits and prioritizes the most valuable queries.

## The Four Tools: How AI Takes Action

The AI Planner doesn't write to the database directly. Instead, it has access to **four action tools** that write hints:

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

### 4. clear_hints

**Purpose**: Reset endpoint to baseline schedule by clearing all AI hints

**Parameters**:
- `reason`: Explanation for clearing hints

**When to use**:
- AI hints are no longer relevant (situation changed)
- Manual intervention resolved the issue
- False positive detection (AI over-reacted)
- Want to revert to baseline without waiting for TTL expiry

**Example**:
```
AI sees endpoint recovered but has aggressive 30s interval hint active
Action: clear_hints(reason="Endpoint recovered, reverting to baseline")
Effect: AI hints cleared immediately, baseline schedule resumes
```

**How it works**:
1. AI calls the tool with a reason
2. Tool clears `aiHintIntervalMs`, `aiHintNextRunAt`, `aiHintExpiresAt`
3. Next execution uses baseline schedule

## Query Tools: Informing Decisions

Before taking action, the AI can query response data using **three query tools**:

### 1. get_latest_response

**Returns**: Most recent response body, timestamp, status

**Use case**: Check current state snapshot

Example: "What's the current queue depth?"

### 2. get_response_history

**Parameters**:
- `limit`: Number of responses (1-10, default 10)
- `offset`: Skip N newest responses for pagination

**Returns**: Array of response bodies with timestamps, newest first

**Use case**: Identify trends over time

Example: "Is queue_depth increasing monotonically?"

**Note**: 10 records is usually sufficient for trend analysis. The AI is encouraged not to paginate endlessly—if patterns are unclear after 10-20 records, more data rarely helps.

Response bodies are truncated at 1000 characters to prevent token overflow.

### 3. get_sibling_latest_responses

**Returns**: For each sibling endpoint in the same job:
- **Response data**: Latest response body, timestamp, status
- **Schedule info**: Baseline, next run, last run, pause status, failure count
- **AI hints**: Active interval/one-shot hints with expiry and reason

**Use case**: Coordinate across endpoints with full context

Example: "Is the upstream endpoint healthy and running normally, or is it paused/failing?"

The enriched response allows the AI to understand sibling state at a glance:
```json
{
  "endpointId": "ep_456",
  "endpointName": "Data Fetcher",
  "responseBody": { "batch_ready": true },
  "timestamp": "2025-11-02T14:25:00Z",
  "status": "success",
  "schedule": {
    "baseline": "every 5 minutes",
    "nextRunAt": "2025-11-02T14:30:00Z",
    "lastRunAt": "2025-11-02T14:25:00Z",
    "isPaused": false,
    "failureCount": 0
  },
  "aiHints": null
}
```

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
- Insufficient data (&lt;10 total runs)
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
- **Next analysis at** (when AI scheduled its next analysis)
- **Endpoint failure count** (snapshot for detecting state changes)

This audit trail helps you:
- Debug unexpected scheduling behavior
- Understand why AI tightened/relaxed intervals
- Review cost (token usage per analysis)
- Tune prompts or constraints based on AI reasoning
- See when AI expects to analyze again

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

1. **AI controls its own analysis frequency**: Schedules re-analysis based on endpoint state
2. **AI sees multi-window health data**: 1h, 4h, 24h windows for accurate recovery detection
3. **Sessions have constraints**: Max 15 tool calls to prevent runaway costs
4. **Four action tools**: propose_interval, propose_next_time, pause_until, clear_hints
5. **Hints have TTLs**: Auto-revert on expiration (safety)
6. **Interval hints override baseline**: Enables adaptation
7. **Nudging provides immediacy**: Changes apply within seconds
8. **Structure response bodies intentionally**: Include metrics AI should monitor
9. **Sessions provide audit trail**: Debug AI reasoning
10. **Quota controls costs**: AI unavailable ≠ jobs stop running

Understanding how AI adaptation works helps you design endpoints that benefit from intelligent scheduling, structure response bodies effectively, and debug unexpected schedule changes.
