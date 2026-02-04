# Benchmark Analysis: Q5 - Multiple HTTP Jobs Influencing Each Other

**Score: 71/100**

## Question

> How would you configure multiple HTTP jobs in Cronicorn to work together, where one job's response data influences the scheduling rules of another job?

## Current Capability Assessment

### What Cronicorn CAN Do Today

1. **Within-Job Coordination**: AI can use `get_sibling_latest_responses` to see all endpoints in the same job and their responses.

2. **Response-Based Signals**: Endpoints can include coordination data that other endpoints read via shared state.

3. **Multi-Endpoint Jobs**: A single job can contain multiple related endpoints that coordinate through response data.

4. **Shared Status API Pattern**: Different jobs can read from a common status endpoint that aggregates state.

### What Cronicorn CANNOT Do Today

1. **Direct Cross-Job Visibility**: AI analyzing Job A cannot directly query endpoints in Job B.

2. **Native Job Dependencies**: No declarative "Job B depends on Job A" configuration.

3. **Cross-Job AI Coordination**: Each job's endpoints are analyzed independently.

### Current Documentation

`coordinating-multiple-endpoints.md` covers:
- 5 coordination patterns (all within-job)
- Standard coordination signals
- Best practices for response body design

**Gap**: Cross-job coordination is not addressed.

## Gap Analysis

### Documentation Gaps

| Gap | Impact | Current State |
|-----|--------|---------------|
| Cross-job coordination not documented | Question asks specifically about this | Missing |
| Shared status API pattern not fully explained | Key workaround not detailed | Brief mention only |
| Job organization guidance missing | Users don't know when to use 1 vs multiple jobs | Not addressed |
| Examples only show within-job patterns | Limited applicability | Current docs |

### Functionality Assessment

**No major functionality gap** - cross-job coordination works through application-layer patterns (shared status APIs). The gap is documentation.

## Recommended Documentation Improvements

### 1. Add Section to `coordinating-multiple-endpoints.md`

Add: **"Cross-Job Coordination"**

```markdown
## Cross-Job Coordination

While Cronicorn's AI Planner analyzes endpoints within a single job, you can coordinate across jobs using these patterns.

### Pattern: Shared Status API

Create a status API that aggregates state from multiple jobs:

```
Your Application: https://api.example.com/orchestration/status

Returns:
{
  "jobs": {
    "data-ingestion": {
      "status": "complete",
      "completed_at": "2025-01-15T14:30:00Z",
      "records_ingested": 50000
    },
    "data-processing": {
      "status": "running",
      "progress_pct": 65,
      "started_at": "2025-01-15T14:31:00Z"
    },
    "report-generation": {
      "status": "waiting",
      "waiting_for": ["data-processing"]
    }
  },
  "pipeline_healthy": true
}
```

Each job includes an endpoint that checks this shared status:

**Job A: Data Ingestion**
```
Endpoint: ingest-data
  └── Does actual ingestion work
  └── Updates shared status when complete

Endpoint: publish-status
  └── POST /orchestration/status { "data-ingestion": { "status": "complete" } }
```

**Job B: Data Processing**
```
Endpoint: check-ingestion-status
  └── GET /orchestration/status
  └── Returns: { "data-ingestion": { "status": "complete" } }
  └── AI sees this and triggers processing

Endpoint: process-data
  └── Does actual processing
  └── Long baseline, AI-triggered when ingestion ready
```

**Job C: Report Generation**
```
Endpoint: check-processing-status
  └── GET /orchestration/status
  └── AI waits until processing complete

Endpoint: generate-reports
  └── Long baseline, AI-triggered when processing ready
```

### Why Use Separate Jobs?

Consider separate jobs when:
- **Different owners**: Teams manage their own jobs
- **Different schedules**: Ingestion hourly, processing daily
- **Isolation**: One job's issues shouldn't affect another
- **Scaling**: Jobs can be paused/resumed independently

### Why Use Single Job with Multiple Endpoints?

Use a single job when:
- **Tight coordination**: Endpoints need real-time sibling visibility
- **Shared context**: All endpoints serve one business function
- **Simple management**: Easier to pause/resume together

### Implementation Example

**Shared Status Service** (your application):

```typescript
// Your status aggregation API
app.get('/orchestration/status', async (req, res) => {
  const ingestionStatus = await getIngestionStatus();
  const processingStatus = await getProcessingStatus();
  const reportingStatus = await getReportingStatus();

  res.json({
    jobs: {
      'data-ingestion': ingestionStatus,
      'data-processing': processingStatus,
      'report-generation': reportingStatus,
    },
    pipeline_healthy:
      ingestionStatus.status !== 'error' &&
      processingStatus.status !== 'error',
  });
});

app.post('/orchestration/status', async (req, res) => {
  const { jobName, status } = req.body;
  await updateJobStatus(jobName, status);
  res.json({ updated: true });
});
```

**Cronicorn Configuration**:

```json
// Job B: Data Processing
{
  "name": "Data Processing Pipeline",
  "endpoints": [
    {
      "name": "check-ingestion-ready",
      "url": "https://api.example.com/orchestration/status",
      "method": "GET",
      "baselineIntervalMs": 60000,
      "description": "Checks if ingestion job is complete"
    },
    {
      "name": "process-batch",
      "url": "https://api.example.com/processing/run",
      "method": "POST",
      "baselineIntervalMs": 3600000,
      "minIntervalMs": 60000,
      "description": "AI triggers when ingestion ready"
    }
  ]
}
```

### AI Behavior

1. `check-ingestion-ready` returns `{ "data-ingestion": { "status": "complete" } }`
2. AI sees completion signal
3. AI calls `get_sibling_latest_responses` to check `process-batch`
4. AI proposes immediate execution for `process-batch` via `propose_next_time`
5. Processing runs, updates shared status
6. Job C's check endpoint sees processing complete, triggers reports

### Best Practices

1. **Idempotent status updates**: Multiple calls shouldn't corrupt state
2. **Timestamp everything**: Include `completed_at`, `started_at` for ordering
3. **Include dependencies**: `"waiting_for": ["job-a", "job-b"]` helps debugging
4. **Health indicators**: `"pipeline_healthy": false` signals to pause downstream
```

### 2. Add: **"Job Organization Guide"**

New section in `core-concepts.md` or new document:

```markdown
## When to Use Multiple Jobs vs. One Job

### Single Job with Multiple Endpoints

**Best for**:
- Tightly coupled workflows
- Real-time sibling coordination
- Single owner/team
- Shared pause/resume needs

**Example**: E-commerce order processing
```
Job: "Order Fulfillment"
├── check-new-orders (every 30s)
├── validate-inventory (AI-triggered)
├── process-payment (AI-triggered)
└── notify-shipping (AI-triggered)
```

All endpoints can see each other via `get_sibling_latest_responses`.

### Multiple Jobs

**Best for**:
- Independent teams/owners
- Different scaling needs
- Loose coupling acceptable
- Different baseline schedules

**Example**: Data pipeline stages
```
Job A: "Data Ingestion" (runs hourly)
Job B: "Data Processing" (runs after ingestion)
Job C: "Report Generation" (runs daily)
```

Coordinate through shared status API.

### Decision Matrix

| Factor | Single Job | Multiple Jobs |
|--------|------------|---------------|
| Team ownership | Same team | Different teams |
| Failure isolation | Shared fate | Independent |
| Scheduling patterns | Similar | Different |
| Coordination needs | Real-time | Eventual |
| Management | Unified | Distributed |
```

### 3. Enhance Existing Coordination Docs

In `coordinating-multiple-endpoints.md`, add:

```markdown
### Pattern 6: Cross-Job Pipeline

**Scenario**: Multiple independent jobs that form a processing pipeline.

**Architecture**:
```
Shared Status API: /api/pipeline/status

Job A: Ingestion (hourly)
├── ingest-sources
└── update-status (POST completion to shared API)

Job B: Processing (triggered)
├── check-status (GET from shared API)
└── process-data (AI-triggered when ready)

Job C: Reporting (daily + triggered)
├── check-status (GET from shared API)
└── generate-report (AI-triggered when ready)
```

**Response Design**:
```json
// Shared status API returns
{
  "stages": {
    "ingestion": {
      "status": "complete",
      "ready_for_downstream": true,
      "batch_id": "2025-01-15-001"
    },
    "processing": {
      "status": "running",
      "ready_for_downstream": false
    },
    "reporting": {
      "status": "waiting"
    }
  }
}
```

**Key Points**:
- Each job has a "check" endpoint for upstream status
- "Worker" endpoints have long baselines, AI triggers them
- Shared API is source of truth for cross-job state
- Your application manages the shared state
```

## Priority Assessment

| Action | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Add cross-job coordination section | **HIGH** | Medium | High - direct answer |
| Add job organization guide | **HIGH** | Low | High - foundational understanding |
| Add cross-job pipeline pattern | **MEDIUM** | Low | Medium - practical example |
| Clarify AI visibility boundaries | **MEDIUM** | Low | Medium - prevents confusion |

## Expected Score Improvement

With documentation improvements:
- Current: 71/100
- Expected: 85-90/100

The pattern works well; documentation just needs to explain it clearly.

## Summary

**Primary Gap**: Documentation - cross-job coordination via shared status APIs works but isn't documented.

**No Functionality Gap**: The shared status API pattern provides effective cross-job coordination.

**Recommendation**:
1. Document the shared status API pattern for cross-job coordination
2. Add job organization guidance (when to use 1 job vs. multiple)
3. Provide implementation examples showing the complete pattern
4. Clarify that AI visibility is per-job, with cross-job coordination via application layer
