# Q3: How do I create a job with scheduled endpoints?

**Estimated Score: 7/10**
**Priority: 4 (Medium)**

## Question Analysis

This is the core use case for Cronicorn. Context7 evaluates whether documentation provides clear, complete examples for the primary workflow.

## Current Documentation Coverage

### What Exists

1. **Quick Start** (`quick-start.md`):
   - UI walkthrough: Create Job → Add Endpoint
   - Common patterns with pseudo-code examples
   - Screenshots implied but not present

2. **API Reference** (`api-reference.md`):
   - Complete curl examples for Jobs API
   - Complete curl examples for Endpoints API
   - Field documentation with required/optional

3. **Core Concepts** (`core-concepts.md`):
   - Explains relationship between jobs and endpoints
   - Scheduling options (cron vs interval)
   - Constraint configuration

### What Works Well

1. **Two paths documented**: UI (quick-start) and API (api-reference)
2. **Complete field documentation** in API reference
3. **Common patterns section** with real-world examples
4. **Clear job/endpoint hierarchy** explained

### What's Missing

1. **No TypeScript/SDK examples**
2. **No end-to-end programmatic example** (create job + add endpoint)
3. **No "complete working example"** that can be copy-pasted
4. **API examples are separate** - job and endpoint not combined
5. **No response body design examples** for AI integration

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 8/10 | Both UI and API documented |
| Relevant Examples | 6/10 | Curl good, missing SDK and combined examples |
| Formatting | 7/10 | Good structure, could have more code blocks |
| Initialization | 5/10 | No SDK initialization |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No Combined Example (Medium)

**Problem**: API examples show creating job and adding endpoint separately. Developer wants complete flow.

**Context7's Expectation**:
```bash
# Complete example: Create job and add endpoint

# Step 1: Create a job
JOB_ID=$(curl -s -X POST https://api.cronicorn.com/api/jobs \
  -H "x-api-key: $CRONICORN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Monitoring",
    "description": "Monitor production APIs"
  }' | jq -r '.id')

echo "Created job: $JOB_ID"

# Step 2: Add an endpoint
curl -X POST "https://api.cronicorn.com/api/jobs/$JOB_ID/endpoints" \
  -H "x-api-key: $CRONICORN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Health Check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000,
    "minIntervalMs": 30000,
    "maxIntervalMs": 900000
  }'
```

### Gap 2: No SDK Example (Medium)

**Problem**: Modern developers prefer TypeScript over curl.

**Context7's Expectation**:
```typescript
import { CronicornClient } from '@cronicorn/client';

const client = new CronicornClient({
  apiKey: process.env.CRONICORN_API_KEY
});

// Create a job with endpoints
const job = await client.jobs.create({
  name: 'API Monitoring',
  description: 'Monitor production APIs'
});

const endpoint = await client.endpoints.create(job.id, {
  name: 'Health Check',
  url: 'https://api.example.com/health',
  method: 'GET',
  baselineIntervalMs: 300000, // 5 minutes
  minIntervalMs: 30000,       // 30 seconds
  maxIntervalMs: 900000       // 15 minutes
});

console.log(`Created endpoint ${endpoint.id} in job ${job.id}`);
```

### Gap 3: Response Body Examples for AI (Low)

**Problem**: Documentation mentions AI uses response bodies but doesn't show how to design them.

**Improvement**: Add examples of response body design for AI analysis.

## Recommendations

### Documentation Improvements

1. **Add "Complete Example" section** to Quick Start:

```markdown
## Complete Example: Create Monitoring Job via API

Here's a complete example that creates a job and adds a health check endpoint:

```bash
#!/bin/bash
# complete-example.sh

API_KEY="your-api-key"
BASE_URL="https://api.cronicorn.com"

# Create job
JOB=$(curl -s -X POST "$BASE_URL/api/jobs" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "API Monitoring"}')

JOB_ID=$(echo $JOB | jq -r '.id')

# Add endpoint
curl -X POST "$BASE_URL/api/jobs/$JOB_ID/endpoints" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Health Check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "baselineIntervalMs": 300000
  }'
```
```

2. **Add TypeScript SDK example** (requires SDK first):

3. **Add "Response Body Design" section** to core-concepts:

```markdown
## Designing Response Bodies for AI

When AI scheduling is enabled, Cronicorn's AI reads your endpoint's response body.
Design responses that give the AI useful signals:

```json
// Good: Clear metrics AI can interpret
{
  "status": "healthy",
  "queue_depth": 45,
  "error_rate": 0.02,
  "avg_latency_ms": 150
}

// Bad: Opaque or missing context
{
  "ok": true
}
```
```

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add combined bash example | Low | High | Do first |
| Add response body design docs | Low | Medium | Do soon |
| Add TypeScript SDK example | High (needs SDK) | High | Later |

## Expected Score Improvement

- **Current**: 7/10
- **After bash combined example**: 8/10
- **After SDK + response body docs**: 9/10

## Related Files

- `docs/public/quick-start.md` - UI walkthrough
- `docs/public/api-reference.md` - API examples (jobs: 69-143, endpoints: 146-236)
- `docs/public/core-concepts.md` - Response body explanation
