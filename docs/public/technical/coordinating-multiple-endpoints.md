---
id: coordinating-endpoints
title: Coordinating Multiple Endpoints
description: Orchestration patterns and multi-endpoint examples
tags: [assistant, technical, orchestration]
sidebar_position: 4
mcp:
  uri: file:///docs/technical/coordinating-multiple-endpoints.md
  mimeType: text/markdown
  priority: 0.75
  lastModified: 2026-02-03T00:00:00Z
---

# Coordinating Multiple Endpoints

This document shows practical patterns for orchestrating workflows across multiple endpoints. Instead of abstract concepts, you'll find concrete examples you can copy and adapt.

## Core Concept: Coordination via Descriptions and Response Bodies

Cronicorn doesn't have built-in workflow orchestration or explicit dependencies. Instead, endpoints coordinate through two mechanisms:

### 1. Descriptions Express Relationships

Use endpoint descriptions to tell the AI how endpoints should interact:

```
Endpoint: "health-check"
  Description: "Monitors service health. When errors are detected,
  the trigger-recovery endpoint should run immediately."

Endpoint: "trigger-recovery"
  Description: "Recovery action that restarts the service. Should only
  run when the health-check endpoint shows errors. After triggering,
  wait at least 5 minutes before allowing another recovery attempt."
```

The AI reads both descriptions and understands the relationship: health-check triggers recovery when errors occur.

### 2. Response Bodies Provide Signals

Endpoints coordinate by:
1. Writing signals to their response bodies
2. Other endpoints reading those signals via `get_sibling_latest_responses`
3. AI acting on the signals (pause, run immediately, adjust intervals)

This approach is flexible—you define the coordination protocol in your response data.

## Pattern 1: Flash Sale Load Management

**Scenario**: E-commerce site with flash sale. Need to prioritize critical endpoints and pause low-priority work during traffic spikes.

### Endpoints

**Job**: "Flash Sale Management"

**Endpoint 1: Traffic Monitor** (1-minute interval)
- Checks current traffic load
- Returns: `{ "visitors_per_min": 5000, "load_status": "high", "flash_sale_active": true }`

**Endpoint 2: Order Processor** (30-second interval)
- Critical: processes orders
- Priority: Must keep running

**Endpoint 3: Inventory Sync** (5-minute interval)
- Normal priority: syncs inventory to warehouse
- Can pause during spikes

**Endpoint 4: Analytics Updater** (10-minute interval)
- Low priority: updates dashboards
- Should pause during spikes

### Response Body Structure

**Traffic Monitor**:
```json
{
  "visitors_per_min": 5000,
  "load_status": "high",
  "flash_sale_active": true,
  "recommendations": {
    "pause_low_priority": true,
    "pause_until": "2025-11-02T15:00:00Z"
  }
}
```

**Analytics Updater**:
```json
{
  "last_update_at": "2025-11-02T14:30:00Z",
  "records_processed": 1500,
  "status": "active"
}
```

### AI Coordination Logic

When AI analyzes **Analytics Updater**:

1. Calls `get_sibling_latest_responses()`
2. Finds Traffic Monitor response: `{ "load_status": "high", "recommendations": { "pause_low_priority": true } }`
3. Checks Analytics Updater's priority (low)
4. Calls `pause_until("2025-11-02T15:00:00Z", reason="Flash sale traffic spike - pausing low-priority work")`

When AI analyzes **Order Processor**:

1. Calls `get_sibling_latest_responses()`
2. Finds Traffic Monitor response: `{ "load_status": "high" }`
3. Checks Order Processor's priority (critical)
4. Takes no action (critical endpoints keep running)

When load drops (Traffic Monitor returns `"load_status": "normal"`):

1. AI analyzes Analytics Updater
2. Sees normal load status
3. Calls `pause_until(null, reason="Load normalized - resuming")`

### Key Points

- Traffic Monitor acts as coordinator (writes signals)
- Other endpoints react to signals (via AI reading sibling responses)
- Priority is encoded in endpoint names/descriptions, not the system
- Coordination is eventual (within 5 minutes of AI analysis cycle)

## Pattern 2: ETL Pipeline with Dependencies

**Scenario**: Extract-Transform-Load pipeline where each stage depends on the previous stage completing.

### Endpoints

**Job**: "Customer Data Pipeline"

**Endpoint 1: Extract Customer Data** (cron: `0 2 * * *` - 2 AM daily)
- Pulls data from external API
- Returns: `{ "extracted_count": 5000, "batch_id": "2025-11-02", "completed_at": "2025-11-02T02:15:00Z" }`

**Endpoint 2: Transform Customer Data** (1-minute interval, waits for extract)
- Transforms raw data to normalized format
- Returns: `{ "transformed_count": 5000, "batch_id": "2025-11-02", "ready_for_load": true }`

**Endpoint 3: Load to Database** (1-minute interval, waits for transform)
- Loads normalized data to production database
- Returns: `{ "loaded_count": 5000, "batch_id": "2025-11-02", "pipeline_complete": true }`

### Response Body Structure

**Extract**:
```json
{
  "stage": "extract",
  "batch_id": "2025-11-02",
  "extracted_count": 5000,
  "completed_at": "2025-11-02T02:15:00Z",
  "ready_for_transform": true,
  "status": "success"
}
```

**Transform** (before ready):
```json
{
  "stage": "transform",
  "batch_id": "2025-11-01",
  "status": "waiting",
  "waiting_for": "extract_2025-11-02"
}
```

**Transform** (after ready):
```json
{
  "stage": "transform",
  "batch_id": "2025-11-02",
  "transformed_count": 5000,
  "completed_at": "2025-11-02T02:30:00Z",
  "ready_for_load": true,
  "status": "success"
}
```

### AI Coordination Logic

When AI analyzes **Transform**:

1. Calls `get_sibling_latest_responses()`
2. Finds Extract response: `{ "batch_id": "2025-11-02", "ready_for_transform": true }`
3. Checks Transform's last response: `{ "batch_id": "2025-11-01", "status": "waiting" }`
4. Sees new batch available (batch IDs don't match)
5. Calls `propose_next_time(now, reason="New batch 2025-11-02 ready for transform")`

When AI analyzes **Load**:

1. Calls `get_sibling_latest_responses()`
2. Finds Transform response: `{ "batch_id": "2025-11-02", "ready_for_load": true }`
3. Checks Load's last response: `{ "batch_id": "2025-11-01" }`
4. Sees new batch available
5. Calls `propose_next_time(now, reason="Transformed batch 2025-11-02 ready to load")`

### Key Points

- Batch IDs enable idempotency (endpoints know what they've processed)
- `ready_for_*` flags signal downstream readiness
- Transform and Load run frequently (1-minute interval) but only process when data is ready
- Coordination happens within minutes of upstream completion

## Pattern 3: Cooldown-Based Actions

**Scenario**: Cache warming endpoint that should run immediately when cache hit rate drops, but not more than once per hour.

### Endpoint

**Job**: "Cache Management"

**Endpoint: Cache Monitor** (5-minute interval)
- Monitors cache hit rate
- Warms cache if hit rate drops below threshold
- Includes cooldown tracking to prevent duplicate warming

### Response Body Structure

**Normal operation**:
```json
{
  "cache_hit_rate_pct": 95.5,
  "cache_size_mb": 512,
  "status": "healthy",
  "last_warm_at": "2025-11-02T12:00:00Z"
}
```

**Low hit rate detected**:
```json
{
  "cache_hit_rate_pct": 65.2,
  "cache_size_mb": 512,
  "status": "degraded",
  "last_warm_at": "2025-11-02T12:00:00Z",
  "warm_cache_needed": true,
  "cooldown_minutes": 60
}
```

**After warming**:
```json
{
  "cache_hit_rate_pct": 94.8,
  "cache_size_mb": 512,
  "status": "healthy",
  "last_warm_at": "2025-11-02T13:15:00Z",
  "cache_warmed": true
}
```

### AI Coordination Logic

When AI analyzes Cache Monitor:

1. Calls `get_latest_response()`
2. Sees: `{ "cache_hit_rate_pct": 65.2, "warm_cache_needed": true, "last_warm_at": "2025-11-02T12:00:00Z" }`
3. Calls `get_response_history(limit=5)` to check recent warmings
4. Calculates time since last warm: `now - last_warm_at = 75 minutes`
5. Compares to cooldown: `75 min > 60 min cooldown`
6. Calls `propose_next_time(now, reason="Cache hit rate dropped to 65%, cooldown elapsed")`

If cooldown not elapsed:

1. AI sees `last_warm_at` was 30 minutes ago
2. Cooldown is 60 minutes
3. Takes no action (reasoning: "Cache warming needed but cooldown active - 30 min elapsed of 60 min required")

### Key Points

- Cooldown prevents duplicate expensive actions
- `last_warm_at` timestamp enables cooldown calculation
- AI checks response history to verify pattern
- Endpoint's response body drives action (not external state)

## Pattern 4: Tiered Priority System

**Scenario**: Multiple monitoring endpoints with different priorities. Under load, pause lower tiers.

### Endpoint Naming Convention

Use names/descriptions to encode priority:

- `[CRITICAL] Payment Processor`
- `[NORMAL] Inventory Sync`
- `[LOW] Analytics Updater`

Or use description field:

```json
{
  "name": "Payment Processor",
  "description": "Priority: CRITICAL. Processes customer payments."
}
```

### Coordination Endpoint

**System Health Monitor** (1-minute interval)
- Checks overall system load (CPU, memory, queue depths)
- Returns recommendations for priority levels to pause

**Response Body**:
```json
{
  "system_load_pct": 85,
  "recommendations": {
    "active_priority_levels": ["CRITICAL", "NORMAL"],
    "paused_priority_levels": ["LOW"],
    "reason": "System load at 85% - pausing low-priority work"
  }
}
```

### AI Logic for Each Endpoint

When AI analyzes any endpoint:

1. Calls `get_sibling_latest_responses()`
2. Finds System Health Monitor response
3. Extracts endpoint's priority from name/description
4. Checks if priority in `paused_priority_levels`
5. If yes: `pause_until(calculated_time, reason="System load high")`
6. If no: No action (or resume if paused)

### Key Points

- Single health monitor coordinates entire tier
- Priority encoded in metadata (names/descriptions)
- AI interprets recommendations and applies to individual endpoints
- Centralized policy (health monitor) with distributed execution (AI per endpoint)

## Pattern 5: Cross-Job Coordination

**Scenario**: Endpoints in different jobs need to coordinate (e.g., upstream service health affects downstream consumers).

### Challenge

`get_sibling_latest_responses()` only works within the same job. Cross-job coordination requires a different approach.

### Solution: Shared State Endpoint

**Job 1**: "Upstream Service"
- **Endpoint**: Health Check (1-minute interval)
- Returns: `{ "service_status": "healthy", "last_check": "..." }`

**Job 2**: "Downstream Consumers"
- **Endpoint 1**: Data Processor
- **Endpoint 2**: Analytics Pipeline

Configure Downstream endpoints to call Upstream Service's health endpoint and include the result in their response body:

**Data Processor Response**:
```json
{
  "processed_count": 100,
  "upstream_health": {
    "status": "healthy",
    "checked_at": "2025-11-02T14:30:00Z"
  }
}
```

When upstream goes down:
```json
{
  "processed_count": 0,
  "error": "Upstream service unavailable",
  "upstream_health": {
    "status": "unavailable",
    "checked_at": "2025-11-02T14:35:00Z"
  }
}
```

### AI Logic

When AI analyzes Data Processor:

1. Calls `get_latest_response()`
2. Sees: `{ "upstream_health": { "status": "unavailable" } }`
3. Calls `pause_until(now + 15_minutes, reason="Upstream service unavailable")`

### Key Points

- Endpoints embed external dependency status in their response bodies
- AI reacts to dependency signals
- Works across jobs (no sibling query needed)
- Endpoint is responsible for checking upstream status

## Common Coordination Signals

Here are standard signal patterns you can reuse:

### Readiness Signals
```json
{
  "ready_for_processing": true,
  "data_available": true,
  "batch_ready": true
}
```

### Dependency Status
```json
{
  "dependency_status": "healthy" | "degraded" | "unavailable",
  "upstream_healthy": true
}
```

### Action Requests
```json
{
  "warm_cache_needed": true,
  "scale_up_needed": true,
  "send_alert": true
}
```

### Cooldown Tracking
```json
{
  "last_action_at": "2025-11-02T14:30:00Z",
  "cooldown_minutes": 60,
  "action_type": "cache_warm" | "alert_sent" | "scaled"
}
```

### Load/Priority Signals
```json
{
  "load_status": "normal" | "elevated" | "high" | "critical",
  "pause_priorities": ["LOW", "NORMAL"],
  "active_priorities": ["CRITICAL"]
}
```

## Best Practices

1. **Be explicit**: Use clear signal names (`ready_for_load` not `ready`)
2. **Include timestamps**: Enable cooldown calculations and staleness checks
3. **Provide context**: Add `reason` fields explaining state
4. **Use batch IDs**: Enable idempotency in pipelines
5. **Keep signals simple**: AI reads truncated bodies (1000 chars)
6. **Document protocols**: Comment what signals mean in endpoint descriptions
7. **Test coordination**: Verify AI picks up signals by checking analysis sessions

## Debugging Coordination

When coordination isn't working:

1. **Check sibling responses**: Does `get_sibling_latest_responses()` return expected data?
2. **Review AI sessions**: What did AI see? What reasoning did it provide?
3. **Verify signal format**: Are field names consistent?
4. **Check timing**: AI analyzes every 5 minutes—coordination isn't instant
5. **Look for errors**: Did endpoint fail to write expected signal?

## Key Takeaways

1. **Coordination via response bodies**: Write signals, other endpoints read them
2. **AI interprets signals**: Uses `get_sibling_latest_responses()` and `get_latest_response()`
3. **Eventual consistency**: Coordination happens within minutes (AI analysis cycle)
4. **Flexible protocols**: You define what signals mean
5. **Priority systems**: Use names/descriptions to encode metadata
6. **Cooldowns prevent duplicates**: Track `last_action_at` in response bodies
7. **Cross-job coordination**: Embed external status checks in responses

These patterns give you the building blocks for complex workflows. Mix and match based on your needs.

---

## See Also

- **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - AI tools including sibling queries
- **[Configuration and Constraints](./configuration-and-constraints.md)** - Endpoint configuration
- **[Use Cases](../use-cases.md)** - Real-world examples
- **[Technical Reference](./reference.md)** - Response body patterns
