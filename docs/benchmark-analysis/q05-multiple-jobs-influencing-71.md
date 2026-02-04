# Benchmark Analysis: Q5 - Multiple HTTP Jobs Influencing Each Other

**Score: 71/100**

## Question

> How would you configure multiple HTTP jobs in Cronicorn to work together, where one job's response data influences the scheduling rules of another job?

## Root Cause of Low Score

**Job vs endpoint confusion.** The question assumes you need multiple separate jobs that somehow communicate. In Cronicorn, most "multi-job coordination" is actually **multiple endpoints in one job** where AI has automatic sibling visibility.

## Cronicorn's Approach

### Key Insight: One Job, Multiple Endpoints

"Multiple jobs influencing each other" is usually **one job with multiple endpoints**:
- All endpoints in a job share sibling visibility
- AI sees all responses via `get_sibling_latest_responses`
- Describe relationships in endpoint descriptions
- No explicit cross-job configuration needed

### When You Actually Need Multiple Jobs

Separate jobs only when:
- Completely independent workflows
- Different teams/owners
- Very different baseline schedules
- No coordination needed

## Solution: Multi-Endpoint Job with Coordinated Descriptions

```
Job: "Order Processing Pipeline"

Endpoint 1: "check-new-orders"
  URL: https://api.example.com/orders/pending
  Baseline: Every 30 seconds

  Description:
  "Checks for new orders. When new orders are found, the process-orders
  endpoint should run to handle them. Returns order count and status."

Endpoint 2: "process-orders"
  URL: https://api.example.com/orders/process
  Method: POST
  Baseline: Every 5 minutes (runs independently)
  Min: 30 seconds

  Description:
  "Processes pending orders. Should run frequently when check-new-orders
  shows orders waiting. Can relax when no orders pending. Check sibling
  response to coordinate timing."

Endpoint 3: "notify-shipping"
  URL: https://api.example.com/shipping/notify
  Method: POST
  Baseline: Every 10 minutes
  Min: 1 minute

  Description:
  "Notifies shipping of processed orders. Should run after process-orders
  completes successfully. Check sibling responses for order status."
```

## Key Insight: Descriptions Express Relationships

Instead of explicit job dependencies, describe the relationships:
- **"when check-new-orders shows orders waiting"**
- **"should run after process-orders completes"**
- **"check sibling response to coordinate"**

AI reads all descriptions and coordinates accordingly.

## Expected Response Bodies

**check-new-orders:**
```json
{
  "pending_orders": 15,
  "oldest_order_age_minutes": 5,
  "needs_processing": true
}
```

**process-orders:**
```json
{
  "orders_processed": 15,
  "processing_complete": true,
  "ready_for_shipping": true
}
```

**notify-shipping:**
```json
{
  "notifications_sent": 15,
  "shipping_notified": true
}
```

## How AI Coordinates

1. **check-new-orders** returns `pending_orders: 15`
2. AI sees sibling context, reads **process-orders** description
3. Description says "run frequently when orders waiting"
4. AI proposes immediate run for **process-orders**
5. **process-orders** completes, returns `ready_for_shipping: true`
6. AI sees this, triggers **notify-shipping**
7. When orders clear, all endpoints return to baseline

## When Separate Jobs Are Needed

If you truly have separate teams/workflows, use a shared status API:

```
Your Status API: https://api.example.com/orchestration/status

Job A: "Ingestion" (Team A)
├── ingest-data
└── update-status (POST to shared API)

Job B: "Processing" (Team B)
├── check-ingestion-status (GET from shared API)
└── process-data
```

But this is the exception. Most "multi-job" scenarios are better as multi-endpoint in one job.

## What Documentation Needs

### 1. Job vs Endpoint Guide

```markdown
## Understanding Jobs and Endpoints

**Job**: A container for related endpoints that should coordinate.
**Endpoint**: An individual HTTP target with its own schedule.

### Key Insight

"Multiple jobs influencing each other" is usually **one job with multiple endpoints**.

### When to Use One Job (Most Cases)

- Endpoints are part of the same workflow
- Coordination is needed
- You want sibling visibility

### When to Use Multiple Jobs (Rare)

- Truly independent workflows
- Different teams/owners
- No coordination needed
```

### 2. Description Examples for Coordination

```markdown
## Coordinating Endpoints with Descriptions

**Triggering sibling:**
"When endpoint-A shows data ready, endpoint-B should run."

**Sequencing:**
"Run after sibling process-data completes successfully."

**Conditional:**
"Only run when sibling health-check shows healthy status."
```

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Job vs endpoint not explained | Documentation | Add mental model guide |
| Description-based coordination examples | Documentation | Add samples |
| Cross-job as exception not clarified | Documentation | Add brief section |

## Priority

**MEDIUM** - Score is 71/100; improvements are refinements.

## Expected Improvement

- Current: 71/100
- With job/endpoint clarification and description examples: **85-90/100**

Most improvement comes from reframing: it's not "multiple jobs coordinating" - it's "one job with multiple endpoints coordinated through descriptions."
