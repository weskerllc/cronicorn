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

The AI Planner runs independently from the Scheduler, typically waking up every 5 minutes to analyze recently active endpoints.

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
```json
{
  "ready_for_processing": true,
  "upstream_completed_at": "2025-11-02T14:45:00Z"
}
```

### Tips
- Use consistent naming across responses
- Include timestamps for cooldown patterns
- Keep it simple (1000 char truncation)

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
