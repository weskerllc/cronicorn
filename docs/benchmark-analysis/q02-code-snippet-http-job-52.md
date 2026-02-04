# Benchmark Analysis: Q2 - Code Snippet for HTTP Job with Status Code Rules

**Score: 52/100**

## Question

> Write a code snippet showing how to define an HTTP job in Cronicorn that targets a specific endpoint and establish a rule that interprets the response status code to determine scheduling behavior.

## Root Cause of Low Score

**Paradigm mismatch.** The question assumes you write code rules like traditional schedulers. Cronicorn uses **natural language descriptions** - you describe what you want, and the AI interprets status codes automatically.

## Cronicorn's Actual Approach

**You don't write code rules.** You write a description:

```
Endpoint: "api-monitor"
  URL: https://api.example.com/health
  Baseline: Every 5 minutes
  Min: 30 seconds

  Description:
  "Monitors API health. When the service returns error status codes
  (5xx errors), increase polling frequency to monitor recovery. When
  healthy (2xx responses), maintain normal baseline polling. If rate
  limited (429), back off and poll less frequently."
```

The AI reads this description, sees the HTTP status codes in responses, and adapts accordingly. No code needed.

## Why No Code Rules?

Cronicorn's design philosophy:
- **Natural language > DSL**: Descriptions are more flexible than rule syntax
- **AI interpretation > static rules**: AI understands context and nuance
- **Response body + status codes**: AI considers both automatically
- **Constraints for safety**: `minIntervalMs`/`maxIntervalMs` provide guardrails

## What Users Might Expect vs Reality

**Expected (traditional approach):**
```javascript
// This is NOT how Cronicorn works
job.addRule({
  condition: 'statusCode >= 500',
  action: { interval: '30s' }
});
job.addRule({
  condition: 'statusCode === 429',
  action: { interval: '5m' }
});
```

**Actual (Cronicorn approach):**
```
Description:
"Monitor API health. Poll more frequently during errors (5xx).
Back off when rate limited (429). Normal polling when healthy."
```

## Complete Setup Example

### Via API (for those who want code)

```typescript
// Create job via API
const job = await fetch('https://api.cronicorn.app/jobs', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({
    name: 'API Health Monitor',
    description: 'Monitors API with adaptive frequency based on status'
  })
}).then(r => r.json());

// Add endpoint with description-based "rules"
await fetch(`https://api.cronicorn.app/jobs/${job.id}/endpoints`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({
    name: 'health-check',
    url: 'https://api.example.com/health',
    method: 'GET',
    baselineIntervalMs: 300000,  // 5 minutes
    minIntervalMs: 30000,         // 30 seconds
    maxIntervalMs: 600000,        // 10 minutes

    // THIS IS YOUR "RULE" - natural language description
    description: `Monitors API health endpoint. When the service returns
      error status codes (5xx), increase polling frequency to 30 seconds
      to monitor recovery closely. When rate limited (429 responses),
      back off to longer intervals. During healthy operation (2xx),
      maintain the 5-minute baseline.`
  })
});
```

### Via MCP/Chat Interface

```
"Create a job called 'API Monitor' with an endpoint that checks
https://api.example.com/health every 5 minutes. When it returns
errors, poll every 30 seconds. When healthy, go back to 5 minutes."
```

## How Status Codes Are Handled

Cronicorn automatically:
1. **Captures status codes** in every response (stored in `runs.statusCode`)
2. **Classifies success/failure** (2xx = success, 4xx/5xx = failure)
3. **Applies exponential backoff** on consecutive failures
4. **AI sees health metrics** including success rates over time windows

Your description guides the AI on **how** to respond to these status patterns.

## What Documentation Needs

### 1. Explain the Paradigm

```markdown
## How Cronicorn Handles Status Codes

Unlike traditional schedulers with explicit rule configuration, Cronicorn
uses AI to interpret HTTP responses.

**Your description is your rule.**

### Example Descriptions for Status Code Handling

**Error monitoring:**
"Poll more frequently during 5xx errors to monitor recovery."

**Rate limit awareness:**
"Back off when receiving 429 responses. Resume normal polling after."

**Comprehensive:**
"Monitor health endpoint. Increase frequency during errors (5xx).
Respect rate limits (429) by backing off. Normal baseline when healthy."
```

### 2. Show the API for Code-Oriented Users

For users who want programmatic setup, show the API with clear emphasis that the `description` field is the "rule configuration."

## Gap Analysis

| Gap | Type | Fix |
|-----|------|-----|
| Paradigm not explained | Documentation | Add "descriptions as rules" section |
| No API code examples | Documentation | Add TypeScript/Python examples |
| Status code handling implicit | Documentation | Explain automatic handling |

## Priority

**HIGH** - Fundamental paradigm confusion.

## Expected Improvement

- Current: 52/100
- With paradigm explanation and examples: **75-85/100**

The remaining gap is that some users truly want declarative rules. Cronicorn's approach is more flexible but different. Documentation should explain the tradeoff clearly.
