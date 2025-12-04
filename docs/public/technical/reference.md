---
id: technical-reference
title: Technical Reference
description: Quick lookup for schemas, defaults, tools, and state transitions
tags: [assistant, technical, reference]
sidebar_position: 6
mcp:
  uri: file:///docs/technical/reference.md
  mimeType: text/markdown
  priority: 0.75
  lastModified: 2025-11-02T00:00:00Z
---

# Reference

Quick lookup for Cronicorn terminology, schema, defaults, and tools.

## Glossary

**Baseline Schedule**
: The permanent schedule configured for an endpoint (cron expression or interval). Used when no AI hints are active. Never expires unless manually updated.

**Governor**
: Pure function that calculates the next run time for an endpoint. Takes current time, endpoint state, and cron parser as inputs. Returns timestamp and source.

**Hint**
: Temporary AI suggestion for scheduling (interval or one-shot). Has a TTL and expires automatically. Stored in `aiHint*` fields.

**Nudging**
: Updating `nextRunAt` immediately when AI writes a hint, so the change takes effect within seconds instead of waiting for the next baseline execution. Uses `setNextRunAtIfEarlier()`.

**Claiming**
: The Scheduler's process of acquiring locks on due endpoints to prevent double execution in multi-worker setups. Uses `_lockedUntil` field.

**Tick**
: One iteration of the Scheduler's loop (every 5 seconds). Claims due endpoints, executes them, records results, schedules next run.

**Source**
: The reason a particular next run time was chosen. Values: `baseline-cron`, `baseline-interval`, `ai-interval`, `ai-oneshot`, `clamped-min`, `clamped-max`, `paused`.

**TTL (Time To Live)**
: How long an AI hint remains valid before expiring. After expiration, the system reverts to baseline. Default: 60 minutes for intervals, 30 minutes for one-shots.

**Exponential Backoff**
: Automatic interval increase after failures: `baselineMs × 2^min(failureCount, 5)`. Applies only to baseline interval schedules, not AI hints or cron.

**Zombie Run**
: A run record stuck in `"running"` status because the Scheduler crashed mid-execution. Cleaned up after 5 minutes by default.

**Sibling Endpoints**
: Endpoints in the same job that can coordinate via `get_sibling_latest_responses()`.

**Multi-Window Health**
: Health metrics shown across three time windows (1h, 4h, 24h) to accurately detect recovery patterns. Prevents old failure bursts from skewing recent health assessment.

**Analysis Session**
: Record of AI analysis for an endpoint, including tools called, reasoning, token usage, and when to analyze next. Stored in `ai_analysis_sessions` table.

**Session Constraints**
: Resource limits on AI analysis sessions. Maximum 15 tool calls per session to prevent runaway costs. Sessions that hit the limit are terminated.

## Schema: ai_analysis_sessions Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique session identifier |
| `endpointId` | UUID | Endpoint that was analyzed |
| `createdAt` | Timestamp | When analysis started |
| `reasoning` | String | AI's explanation for decision |
| `tokenUsage` | Integer | Tokens consumed |
| `durationMs` | Integer | How long analysis took |
| `nextAnalysisAt` | Timestamp | When AI requested re-analysis |
| `endpointFailureCount` | Integer | Failure count snapshot at analysis time |

## Schema: job_endpoints Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique endpoint identifier |
| `jobId` | UUID | Parent job (for grouping and sibling queries) |
| `tenantId` | UUID | Tenant for multi-tenancy |
| `name` | String | Display name |
| `description` | String | Optional context for AI |
| `url` | String | HTTP endpoint to call |
| `method` | Enum | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `headersJson` | JSON | Request headers |
| `bodyJson` | JSON | Request body (for POST/PUT/PATCH) |
| `baselineCron` | String | Cron expression (mutually exclusive with interval) |
| `baselineIntervalMs` | Integer | Fixed interval in milliseconds |
| `minIntervalMs` | Integer | Minimum interval constraint (hard limit) |
| `maxIntervalMs` | Integer | Maximum interval constraint (hard limit) |
| `timeoutMs` | Integer | Request timeout |
| `maxResponseSizeKb` | Integer | Response body size limit |
| `maxExecutionTimeMs` | Integer | Max execution time for lock duration |
| `aiHintIntervalMs` | Integer | AI-suggested interval (temporary) |
| `aiHintNextRunAt` | Timestamp | AI-suggested one-shot time (temporary) |
| `aiHintExpiresAt` | Timestamp | When AI hints expire |
| `aiHintReason` | String | AI's explanation for hint |
| `pausedUntil` | Timestamp | Pause until this time (null = not paused) |
| `lastRunAt` | Timestamp | When endpoint last executed |
| `nextRunAt` | Timestamp | When to run next (updated after each execution) |
| `failureCount` | Integer | Consecutive failures (reset on success) |
| `_lockedUntil` | Timestamp | Lock expiration for claiming |

## Default Values

| Setting | Default | Notes |
|---------|---------|-------|
| **Scheduler tick interval** | 5 seconds | How often Scheduler wakes up to claim endpoints |
| **AI analysis interval** | 5 minutes | How often AI Planner discovers endpoints (overridden by AI scheduling) |
| **AI max tool calls** | 15 | Maximum tool calls per AI session (hard limit) |
| **Lock TTL** | 30 seconds | How long claimed endpoints stay locked |
| **Batch size** | 10 endpoints | Max endpoints claimed per tick |
| **Zombie threshold** | 5 minutes | Runs older than this marked as timeout |
| **AI hint TTL** | 60 minutes | Default for `propose_interval` |
| **One-shot hint TTL** | 30 minutes | Default for `propose_next_time` |
| **Timeout** | 30 seconds | Default request timeout |
| **Max response size** | 100 KB | Default response body limit |
| **Failure count cap** | 5 | Backoff capped at 2^5 = 32x |
| **History limit** | 10 | Default records returned by get_response_history |
| **Min interval** | None | No minimum unless configured |
| **Max interval** | None | No maximum unless configured |

## AI Tool Catalog

### Action Tools (Write Hints)

#### propose_interval

Adjust endpoint execution frequency.

**Parameters**:
- `intervalMs` (number, required): New interval in milliseconds
- `ttlMinutes` (number, default: 60): How long hint is valid
- `reason` (string, optional): Explanation for adjustment

**Effect**: Writes `aiHintIntervalMs` and `aiHintExpiresAt`, nudges `nextRunAt`

**Override behavior**: Overrides baseline (not one-shot)

**Example**:
```json
{
  "intervalMs": 30000,
  "ttlMinutes": 15,
  "reason": "Queue depth increasing - tightening monitoring"
}
```

#### propose_next_time

Schedule one-shot execution at specific time.

**Parameters**:
- `nextRunAtIso` (ISO 8601 string, required): When to run next
- `ttlMinutes` (number, default: 30): How long hint is valid
- `reason` (string, optional): Explanation

**Effect**: Writes `aiHintNextRunAt` and `aiHintExpiresAt`, nudges `nextRunAt`

**Override behavior**: Competes with baseline (earliest wins)

**Example**:
```json
{
  "nextRunAtIso": "2025-11-02T14:30:00Z",
  "ttlMinutes": 5,
  "reason": "Immediate investigation of failure spike"
}
```

#### pause_until

Pause execution temporarily or resume.

**Parameters**:
- `untilIso` (ISO 8601 string or null, required): Pause until time, or null to resume
- `reason` (string, optional): Explanation

**Effect**: Writes `pausedUntil`

**Override behavior**: Overrides everything (highest priority)

**Example**:
```json
{
  "untilIso": "2025-11-02T15:00:00Z",
  "reason": "Dependency unavailable until maintenance completes"
}
```

#### clear_hints

Clear all AI hints, reverting to baseline schedule immediately.

**Parameters**:
- `reason` (string, required): Explanation for clearing hints

**Effect**: Clears `aiHintIntervalMs`, `aiHintNextRunAt`, `aiHintExpiresAt`

**Use case**: When adaptive hints are no longer relevant (manual intervention, false positive, situation resolved)

**Example**:
```json
{
  "reason": "Endpoint recovered, reverting to baseline schedule"
}
```

### Query Tools (Read Data)

#### get_latest_response

Get most recent response body from this endpoint.

**Parameters**: None

**Returns**:
```json
{
  "found": true,
  "responseBody": { "queue_depth": 45, "status": "healthy" },
  "timestamp": "2025-11-02T14:30:00Z",
  "status": "success"
}
```

#### get_response_history

Get recent response bodies to identify trends.

**Parameters**:
- `limit` (number, default: 10, max: 10): Number of responses
- `offset` (number, default: 0): Skip N newest for pagination

**Returns**:
```json
{
  "count": 10,
  "hasMore": true,
  "pagination": { "offset": 0, "limit": 10, "nextOffset": 10 },
  "responses": [
    {
      "responseBody": { "queue_depth": 200 },
      "timestamp": "2025-11-02T14:30:00Z",
      "status": "success",
      "durationMs": 120
    }
  ],
  "hint": "More history exists if needed, but 10 records is usually sufficient"
}
```

**Note**: Response bodies truncated at 1000 chars. 10 records is usually sufficient for trend analysis.

#### get_sibling_latest_responses

Get latest responses and state from all endpoints in same job.

**Parameters**: None

**Returns**:
```json
{
  "count": 3,
  "siblings": [
    {
      "endpointId": "ep_456",
      "endpointName": "Data Processor",
      "responseBody": { "batch_id": "2025-11-02", "ready": true },
      "timestamp": "2025-11-02T14:25:00Z",
      "status": "success",
      "schedule": {
        "baseline": "every 5 minutes",
        "nextRunAt": "2025-11-02T14:30:00Z",
        "lastRunAt": "2025-11-02T14:25:00Z",
        "isPaused": false,
        "pausedUntil": null,
        "failureCount": 0
      },
      "aiHints": {
        "intervalMs": 30000,
        "nextRunAt": null,
        "expiresAt": "2025-11-02T15:25:00Z",
        "reason": "Tightening monitoring"
      }
    }
  ]
}
```

**Note**: Returns schedule info and active AI hints per sibling for full context

### Final Answer Tool

#### submit_analysis

Signal analysis completion, provide reasoning, and schedule next analysis.

**Parameters**:
- `reasoning` (string, required): Analysis explanation
- `next_analysis_in_ms` (number, optional): When to analyze this endpoint again
  - Min: 300000 (5 minutes)
  - Max: 86400000 (24 hours)
  - If omitted, uses baseline interval
- `actions_taken` (string[], optional): List of tools called
- `confidence` (enum, optional): 'high' | 'medium' | 'low'

**Returns**:
```json
{
  "status": "analysis_complete",
  "reasoning": "...",
  "next_analysis_in_ms": 7200000,
  "actions_taken": ["propose_interval"],
  "confidence": "high"
}
```

**Scheduling guidance**:
- 300000 (5 min): Incident active, need close monitoring
- 1800000 (30 min): Recovering, monitoring progress
- 7200000 (2 hours): Stable, routine check
- 86400000 (24 hours): Very stable or daily job

**Note**: Must be called last to complete analysis

## Scheduling Sources

Sources explain why a particular next run time was chosen:

| Source | Meaning | Priority |
|--------|---------|----------|
| `paused` | Endpoint is paused, runs at `pausedUntil` | Highest (overrides all) |
| `clamped-min` | Chosen time was too soon, moved to `now + minIntervalMs` | High |
| `clamped-max` | Chosen time was too late, moved to `now + maxIntervalMs` | High |
| `ai-interval` | AI interval hint overrode baseline | Medium |
| `ai-oneshot` | AI one-shot hint won competition | Medium |
| `baseline-cron` | Cron expression determined time | Low (default) |
| `baseline-interval` | Fixed interval determined time | Low (default) |

**Reading sources**: Check run records or logs to see why an endpoint ran at a particular time.

## Constraint Interaction Matrix

How different settings interact:

| If you set... | AI interval hints... | AI one-shot hints... | Baseline... |
|---------------|---------------------|---------------------|-------------|
| `pausedUntil` | Ignored (pause wins) | Ignored (pause wins) | Ignored |
| `minIntervalMs` | Clamped to minimum | Clamped to minimum | Clamped to minimum |
| `maxIntervalMs` | Clamped to maximum | Clamped to maximum | Clamped to maximum |
| Both AI hints active | Compete (earliest wins) | Compete (earliest wins) | Ignored |
| Cron baseline | Ignored by AI | Competes with cron | Used when no hints |

**Key insight**: Pause &gt; Constraints &gt; AI hints &gt; Baseline

## Field Constraints

Limits enforced by the system:

| Field | Min | Max | Units |
|-------|-----|-----|-------|
| `baselineIntervalMs` | 1,000 | None | Milliseconds (1 second minimum) |
| `minIntervalMs` | 0 | None | Milliseconds |
| `maxIntervalMs` | 0 | None | Milliseconds |
| `timeoutMs` | 1,000 | 1,800,000 | Milliseconds (30 minutes max) |
| `maxResponseSizeKb` | 1 | 10,000 | Kilobytes |
| `maxExecutionTimeMs` | 1,000 | 1,800,000 | Milliseconds (30 minutes max) |
| `failureCount` | 0 | None | Integer (capped at 5 for backoff) |
| Hint TTL | 1 | None | Minutes (recommended: 5-240) |

## Common Response Body Patterns

Reusable structures for endpoint responses:

### Health Status
```json
{
  "status": "healthy" | "degraded" | "critical",
  "timestamp": "2025-11-02T14:30:00Z"
}
```

### Metrics
```json
{
  "queue_depth": 45,
  "processing_rate_per_min": 100,
  "error_rate_pct": 1.2,
  "avg_latency_ms": 150
}
```

### Coordination Signals
```json
{
  "ready_for_processing": true,
  "batch_id": "2025-11-02",
  "dependency_status": "healthy"
}
```

### Cooldown Tracking
```json
{
  "last_action_at": "2025-11-02T12:00:00Z",
  "action_type": "cache_warm",
  "cooldown_minutes": 60
}
```

### Thresholds
```json
{
  "current_value": 250,
  "warning_threshold": 300,
  "critical_threshold": 500
}
```

## Quick Troubleshooting

**Endpoint not running**:
- Check `pausedUntil` (might be paused)
- Check `nextRunAt` (might be scheduled far in future)
- Check `_lockedUntil` (might be locked by crashed worker)

**AI not adapting**:
- Check `aiHintExpiresAt` (hints might be expired)
- Check analysis sessions (AI might not see patterns)
- Verify response bodies include metrics (AI needs data)
- Check quota limits (might be exceeded)

**Running too frequently**:
- Check active AI interval hint
- Verify `minIntervalMs` isn't set too low
- Check for `propose_next_time` loops

**Running too slowly**:
- Check `maxIntervalMs` constraint
- Check exponential backoff (high `failureCount`)
- Verify baseline isn't too long

## Useful Queries

Check if endpoint is paused:
```
pausedUntil > now ? "Paused until {pausedUntil}" : "Active"
```

Check if AI hints are active:
```
aiHintExpiresAt > now ? "Active hints" : "No active hints"
```

Calculate current backoff multiplier:
```
failureCount > 0 ? 2^min(failureCount, 5) : 1
```
