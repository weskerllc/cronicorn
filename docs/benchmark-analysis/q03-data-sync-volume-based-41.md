# Benchmark Analysis: Q3 - Data Synchronization with Volume-Based Frequency

**Score: 41/100**

## Question

> How would you implement a data synchronization job in Cronicorn that adjusts its execution frequency based on the volume of data returned in the HTTP response body?

## Root Cause of Low Score

**Missing use case example with description.** This is a straightforward single-endpoint pattern - describe the desired behavior in natural language and let AI interpret volume metrics from the response.

## Cronicorn's Approach

This is a **single endpoint** with a natural language description explaining volume-based behavior. No code rules needed - just a clear description.

## Solution: Single Endpoint with Volume-Aware Description

```
Job: "Data Synchronization"

Endpoint: "sync-status"
  URL: https://api.example.com/sync/check
  Method: GET
  Baseline: Every 10 minutes
  Min Interval: 30 seconds
  Max Interval: 1 hour

  Description:
  "Checks data synchronization status with external source. The response
  includes the number of pending records to sync. When there's a large
  backlog (many pending records), poll more frequently to keep up with
  the sync. When caught up (few or zero pending records), slow down to
  the baseline or longer. During active syncing with moderate backlog,
  maintain frequent polling until the queue is cleared."
```

## Key Insight: The Description IS the Rule

Instead of writing code like:
```javascript
// NOT how Cronicorn works
if (response.records_pending > 1000) {
  interval = 30000;
} else if (response.records_pending > 100) {
  interval = 60000;
}
```

You write a description:
```
"Poll more frequently when there's a large backlog. Slow down when caught up."
```

The AI interprets this with the response data.

## Expected Response Bodies

**Large Backlog - Needs Frequent Polling:**
```json
{
  "status": "syncing",
  "records_pending": 15000,
  "records_synced_last_run": 500,
  "sync_rate_per_minute": 100,
  "estimated_completion_minutes": 150
}
```

**Moderate Backlog - Active Sync:**
```json
{
  "status": "syncing",
  "records_pending": 2000,
  "records_synced_last_run": 500,
  "estimated_completion_minutes": 20
}
```

**Caught Up - Can Slow Down:**
```json
{
  "status": "idle",
  "records_pending": 0,
  "records_synced_last_run": 150,
  "last_sync_completed_at": "2025-01-15T15:15:00Z"
}
```

## How AI Interprets Volume

1. **Reads description**: Understands "poll frequently when backlog is high"
2. **Reads response**: Sees `records_pending: 15000`
3. **Makes decision**: Large backlog → proposes shorter interval
4. **Respects constraints**: Won't go below `minIntervalMs`
5. **Returns to baseline**: When `records_pending: 0`, returns to normal

## What Documentation Needs

### 1. Data Sync Use Case Example

```markdown
## Use Case: Volume-Based Data Synchronization

**Scenario**: Sync data from an external source, polling more frequently
when there's a backlog and slowing down when caught up.

### Endpoint Configuration

```
Endpoint: "data-sync"
  URL: https://api.example.com/sync/status
  Baseline: 10 minutes
  Min: 30 seconds
  Max: 1 hour

  Description:
  "Syncs data from external source. Poll frequently when records_pending
  is high. Slow down when caught up (pending near zero)."
```

### Response Design

Include volume indicators:
- `records_pending` - size of backlog
- `status` - current sync state
- `has_more` - pagination indicator

### How It Works

AI reads your description + response data. No code rules needed.
```

### 2. More Description Examples

```markdown
## Description Examples for Data Sync

**Simple:**
"Sync data. Poll faster when behind, slower when caught up."

**Detailed:**
"Monitors data sync queue. When pending records exceed 1000, increase
polling frequency to clear the backlog faster. When queue is empty or
near-empty, reduce polling to conserve API calls. Include queue size
in response body."

**With specific thresholds:**
"Data sync endpoint. High priority when records_pending > 5000.
Normal priority when between 100-5000. Low priority when < 100."
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Data sync use case not documented | Documentation | Add example with description |
| Volume-based description examples | Documentation | Add sample descriptions |
| Response body guidance | Documentation | Show what fields to include |

## Priority

**HIGH** - Common use case with simple solution.

## Expected Improvement

- Current: 41/100
- With use case example and description samples: **80-90/100**

This is one of the simpler patterns - just needs a good example showing the description text and response format.
