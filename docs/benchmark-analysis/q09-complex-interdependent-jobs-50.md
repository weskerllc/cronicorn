# Benchmark Analysis: Q9 - Complex Interdependent Jobs

**Score: 50/100**

## Question

> How would you design a complex scenario where Cronicorn manages multiple interdependent HTTP jobs that must coordinate their execution based on cascading response data, while ensuring the AI adaptation doesn't create conflicting scheduling decisions across jobs?

## Root Cause of Low Score

**Job vs Endpoint confusion.** The question assumes you need multiple separate jobs that somehow communicate. In Cronicorn, most "interdependent" scenarios are solved with **multiple endpoints in one job** where AI has automatic sibling visibility.

## Cronicorn's Approach

### Key Insight: One Job, Multiple Endpoints

"Complex interdependent jobs" is usually **one job with multiple endpoints**:
- All endpoints in a job share sibling visibility
- AI sees all responses via `get_sibling_latest_responses`
- Coordination happens automatically through response data
- No explicit configuration needed - just good descriptions

### When You Actually Need Multiple Jobs

Separate jobs only when:
- Completely independent workflows
- Different teams/owners
- Very different baseline schedules
- No coordination needed

## Solution: Multi-Endpoint Job for Cascading Pipeline

```
Job: "Data Processing Pipeline"

Endpoint 1: "extract-data"
  URL: https://api.example.com/extract
  Method: POST
  Baseline: Every 1 hour

  Description:
  "Extracts data from source systems. When extraction completes
  successfully with data ready, the transform-data endpoint should
  process it. Include batch_id and record count in response."

Endpoint 2: "transform-data"
  URL: https://api.example.com/transform
  Method: POST
  Baseline: Every 4 hours (runs independently if no trigger)
  Min Interval: 5 minutes

  Description:
  "Transforms extracted data. Should run after extract-data completes
  with data ready. Check sibling extract-data response for batch_id.
  When transform completes, load-data should be triggered."

Endpoint 3: "load-data"
  URL: https://api.example.com/load
  Method: POST
  Baseline: Every 4 hours
  Min Interval: 5 minutes

  Description:
  "Loads transformed data to destination. Run after transform-data
  completes successfully. Check sibling responses for pipeline status."

Endpoint 4: "verify-pipeline"
  URL: https://api.example.com/verify
  Method: GET
  Baseline: Every 30 minutes

  Description:
  "Monitors overall pipeline health. Checks status of all sibling
  endpoints. If any stage is stuck or errored, increase monitoring
  frequency. Reports pipeline completion status."
```

## Expected Response Bodies

**Extract Stage:**
```json
{
  "stage": "extract",
  "batch_id": "2025-01-15-001",
  "status": "complete",
  "records_extracted": 5000,
  "ready_for_transform": true,
  "completed_at": "2025-01-15T14:30:00Z"
}
```

**Transform Stage:**
```json
{
  "stage": "transform",
  "batch_id": "2025-01-15-001",
  "status": "complete",
  "records_transformed": 4850,
  "ready_for_load": true,
  "completed_at": "2025-01-15T14:45:00Z"
}
```

**Load Stage:**
```json
{
  "stage": "load",
  "batch_id": "2025-01-15-001",
  "status": "complete",
  "records_loaded": 4850,
  "pipeline_complete": true,
  "completed_at": "2025-01-15T15:00:00Z"
}
```

## How AI Coordinates

1. **Extract completes**: Returns `ready_for_transform: true`
2. **AI analyzes transform**: Sees sibling extract response, proposes immediate run
3. **Transform completes**: Returns `ready_for_load: true`
4. **AI analyzes load**: Sees sibling transform response, proposes immediate run
5. **Pipeline completes**: Verify endpoint sees all stages complete
6. **Return to baseline**: All endpoints return to normal schedules

## Conflict Prevention (Built-In)

The question asks about preventing conflicting AI decisions. Cronicorn handles this:

1. **Endpoint-level analysis**: Each endpoint analyzed independently (no cascade failures)
2. **TTL-based hints**: All AI decisions expire, preventing permanent conflicts
3. **Clear priority**: Governor has deterministic precedence (pause > AI > baseline)
4. **Sibling awareness**: AI sees full context before making decisions

**Best practice for complex workflows:**
- Use clear descriptions stating dependencies
- Include status flags in responses (`ready_for_next_stage`)
- Set appropriate `minIntervalMs` to prevent thrashing

## What Documentation Needs

### 1. Job vs Endpoint Mental Model

```markdown
## Understanding Jobs and Endpoints

**Job**: A container for related endpoints that should coordinate.
**Endpoint**: An individual HTTP target with its own schedule.

### Key Insight

"Multiple interdependent jobs" is usually **one job with multiple endpoints**.

Endpoints in the same job:
- Share sibling visibility (AI sees all responses)
- Coordinate automatically through response data
- Are analyzed with full context

### When to Use One Job

- Endpoints are part of the same workflow
- Coordination between endpoints is needed
- You want cascading triggers (A completes → B runs)

### When to Use Separate Jobs

- Truly independent workflows
- Different owners/teams
- No coordination needed
```

### 2. Pipeline Pattern Example

```markdown
## Use Case: Multi-Stage Processing Pipeline

**Scenario**: Data flows through extract → transform → load stages.

**Solution**: One job with four endpoints.

### Endpoint Descriptions

**extract-data:**
"Extracts source data. When complete with data ready, transform-data
should process it. Include batch_id in response."

**transform-data:**
"Transforms data after extraction. Run when extract-data shows
ready_for_transform. When complete, load-data should run."

**load-data:**
"Loads to destination. Run when transform-data shows ready_for_load."

**verify-pipeline:**
"Monitors pipeline health. Checks all sibling stages for completion
or errors."

### Why This Works

AI sees all sibling responses, detects readiness signals, and triggers
the next stage. No explicit pipeline configuration needed - the
relationships are expressed in natural language descriptions.
```

### 3. Clarify Cross-Job (Edge Case)

```markdown
## Cross-Job Coordination (When Needed)

If you truly need separate jobs to coordinate (different teams, etc.):

**Solution**: Shared status API

Each job has a "check status" endpoint that reads from a shared API
where other jobs publish their state. This is the application layer
handling coordination, with Cronicorn scheduling the checks.

**Note**: This is rarely needed. Most "multi-job" scenarios are better
modeled as multi-endpoint within one job.
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Job vs endpoint not clearly explained | Documentation | Add mental model guide |
| Multi-endpoint pipeline example missing | Documentation | Add use case |
| Cross-job clarified as edge case | Documentation | Add brief section |

## Priority

**HIGH** - This confusion affects multiple questions (Q5, Q9).

## Expected Improvement

- Current: 50/100
- With job/endpoint clarification and pipeline example: **80-85/100**

Most of the improvement comes from reframing: it's not "complex multi-job coordination" - it's "one job with multiple endpoints."
