# Benchmark Analysis: Q3 - Data Sync with Volume-Based Frequency

**Score: 41/100**

## Question

> How would you implement a data synchronization job in Cronicorn that adjusts its execution frequency based on the volume of data returned in the HTTP response body?

## Current Capability Assessment

### What Cronicorn CAN Do Today

1. **Capture Response Bodies**: Scheduler stores JSON responses (up to `maxResponseSizeKb`, default 100KB) in `runs.responseBody`.

2. **AI Analyzes Response Content**: AI Planner can query `get_latest_response` and `get_response_history` to read response data including volume indicators.

3. **Dynamic Interval Adjustment**: AI can use `propose_interval` to tighten polling when high volume detected.

4. **Trend Analysis**: AI sees multi-window health metrics (1h, 4h, 24h) and can detect patterns over time.

5. **TTL-Based Hints**: Hints expire automatically, returning to baseline when conditions normalize.

### What Works Well

The AI Planner is specifically designed to interpret response body data and adjust scheduling. Key response fields the AI looks for:
- `queue_depth`, `pending_count` → items awaiting processing
- `record_count`, `batch_size` → volume indicators
- `has_more`, `next_page` → pagination signals

### What May Be Unclear

1. **How to structure response data** for volume-based decisions
2. **Specific examples** of data sync patterns
3. **Thresholds and gradual scaling** behavior

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| No "data sync" specific example | Users don't see this use case | Generic examples only |
| Volume-based response structure not shown | Users don't know what fields to include | Partial in `configuration-and-constraints.md` |
| Gradual frequency scaling not documented | Users don't understand AI behavior | Missing |
| Pagination handling not covered | Common sync pattern missing | Not addressed |

### Functionality Assessment

**Current functionality is SUFFICIENT** - this is primarily a documentation gap.

The AI Planner already:
- Reads response bodies looking for metrics
- Understands `queue_depth`, `count`, `pending` type fields
- Proposes interval changes based on trends
- Returns to baseline when volume normalizes

## Recommended Documentation Improvements

### 1. New Section in `use-cases.md`

Add: **"Data Synchronization with Volume-Based Polling"**

```markdown
### Data Synchronization with Volume-Based Polling

**Scenario**: Sync data from an external API, polling more frequently when there's more data to fetch.

**Endpoint Configuration**:
```
Name: crm-sync
URL: https://api.external-crm.com/v1/changes
Method: GET
Baseline Interval: 300000 (5 minutes)
Min Interval: 30000 (30 seconds)
Max Interval: 900000 (15 minutes)
```

**Response Design**:
Your sync endpoint should return volume indicators:
```json
{
  "sync_status": "in_progress",
  "records_synced": 150,
  "records_pending": 2500,
  "batch_size": 100,
  "has_more": true,
  "estimated_remaining_batches": 25,
  "timestamp": "2025-01-15T14:30:00Z"
}
```

**AI Behavior**:
- Sees `records_pending: 2500` and `has_more: true`
- Proposes shorter interval (30 seconds) to clear backlog faster
- Continues tight polling while `records_pending > 0`
- Returns to baseline when `has_more: false` and backlog cleared

**Volume Scaling Pattern**:
| Pending Records | AI Proposed Interval |
|-----------------|----------------------|
| > 1000 | 30 seconds (min) |
| 500-1000 | 60 seconds |
| 100-500 | 2 minutes |
| < 100 | 5 minutes (baseline) |
| 0 | 15 minutes (max, if configured) |
```

### 2. Add to `how-ai-adaptation-works.md`

Add section: **"Volume-Based Scheduling"**

```markdown
## Volume-Based Scheduling

The AI Planner interprets volume indicators in response bodies to adjust polling frequency.

### Key Response Fields

Include these fields for volume-aware scheduling:

```json
{
  "pending_count": 500,      // Items awaiting processing
  "queue_depth": 250,        // Alternative naming
  "has_more": true,          // Pagination indicator
  "batch_size": 100,         // Items per request
  "total_remaining": 1500,   // Total items left
  "processing_rate": 50      // Items processed per interval
}
```

### AI Decision Logic

1. **High Volume Detected**: `pending_count > threshold` or `has_more: true`
   - Action: `propose_interval` with shorter duration
   - Rationale: Clear backlog faster

2. **Moderate Volume**: Some pending items
   - Action: Moderate interval adjustment
   - Rationale: Balance throughput with resource usage

3. **Low/Zero Volume**: Backlog cleared
   - Action: `clear_hints` to return to baseline
   - Rationale: No need for aggressive polling

4. **Empty Results Pattern**: Multiple consecutive empty responses
   - Action: May propose longer interval (up to max)
   - Rationale: Reduce unnecessary API calls

### Example: Paginated Data Sync

```json
// First call - lots of data
{
  "records": [...],
  "page": 1,
  "total_pages": 50,
  "has_more": true
}
// AI: Tightens to 30 seconds

// Middle calls - still syncing
{
  "records": [...],
  "page": 25,
  "total_pages": 50,
  "has_more": true
}
// AI: Maintains short interval

// Final call - sync complete
{
  "records": [...],
  "page": 50,
  "total_pages": 50,
  "has_more": false,
  "sync_complete": true
}
// AI: clear_hints, returns to 5 minute baseline
```
```

### 3. Add to `configuration-and-constraints.md`

Add: **"Configuring for Data Sync Workloads"**

```markdown
## Configuring for Data Sync Workloads

Data synchronization endpoints benefit from specific constraint configurations:

### Recommended Settings

```
Baseline Interval: 5 minutes (300000ms)
  - Normal polling when no backlog

Min Interval: 30 seconds (30000ms)
  - Fast polling during active sync
  - Respect upstream rate limits

Max Interval: 15-30 minutes
  - Optional: Reduce polling during known quiet periods
  - Omit if staleness is a concern
```

### Response Body Requirements

For AI to make volume-based decisions, include:

1. **Volume Indicator** (required): `pending_count`, `queue_depth`, or `records_remaining`
2. **Completion Signal** (recommended): `has_more`, `sync_complete`, or `all_synced`
3. **Progress Metrics** (optional): `page`, `total_pages`, `percent_complete`

### Rate Limit Awareness

If upstream API has rate limits, your sync endpoint should return:
```json
{
  "records_pending": 1000,
  "rate_limit_remaining": 10,
  "rate_limit_reset_at": "2025-01-15T15:00:00Z"
}
```

AI will interpret low `rate_limit_remaining` as a signal to slow down.
```

### 4. Add Quick Start Example

In `quick-start.md`, add:

```markdown
### Example: Data Sync Job

Sync data from an external system with volume-aware polling:

1. **Create Job**: "External CRM Sync"

2. **Add Endpoint**:
   - Name: `crm-changes`
   - URL: `https://api.crm.example.com/changes`
   - Baseline: 5 minutes
   - Min: 30 seconds
   - Max: 15 minutes

3. **Design Response**:
   ```json
   {
     "changes": [...],
     "pending_count": 500,
     "has_more": true
   }
   ```

4. **AI Adapts**: Polls faster when `pending_count` is high, returns to baseline when sync completes.
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add data sync use case | **HIGH** | Low | High - direct answer to question |
| Add volume-based section to AI docs | **HIGH** | Low | High - explains mechanism |
| Add configuration guidance | **MEDIUM** | Low | Medium - practical advice |
| Add quick start example | **MEDIUM** | Low | Medium - easy entry point |

## Expected Score Improvement

With documentation improvements:
- Current: 41/100
- Expected: 80-85/100

The functionality fully supports this use case. Documentation is the primary gap.

## Summary

**Primary Gap**: Documentation - volume-based scheduling is a core AI capability but lacks specific examples for data synchronization use cases.

**No Functionality Gap**: The AI Planner already interprets volume indicators (`pending_count`, `queue_depth`, `has_more`) and adjusts intervals accordingly.

**Recommendation**: Add comprehensive documentation with:
1. Data sync-specific use case example
2. Response body structure guidance for volume indicators
3. Expected AI behavior at different volume levels
4. Configuration recommendations for sync workloads
