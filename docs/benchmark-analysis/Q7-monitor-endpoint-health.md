# Q7: How do I monitor endpoint health?

**Estimated Score: 7/10**
**Priority: 5 (Medium)**

## Question Analysis

Monitoring is essential for operations. Context7 evaluates whether docs explain how to view health status, metrics, and alerts.

## Current Documentation Coverage

### What Exists

1. **Quick Start** (`quick-start.md`):
   - "View Execution History" section
   - UI path to view runs

2. **API Reference** (`api-reference.md`):
   - **Monitoring API**: `GET /endpoints/:id/health`
   - **Dashboard Stats**: `GET /dashboard`
   - **Runs API**: List and detail endpoints

3. **Troubleshooting** (`troubleshooting.md`):
   - Diagnostic steps for common issues

### What Works Well

1. **Health API documented** with response format
2. **Run history API** available
3. **Dashboard stats** endpoint exists
4. **UI path** mentioned in quick-start

### What's Missing

1. **No metrics explanation** - what do the numbers mean?
2. **No alerting documentation** - how to set up alerts
3. **No webhook/notification** integration docs
4. **No dashboard screenshots** or visual guide
5. **No health threshold guidance** - what's "good"?

## Context7 Scoring Criteria Analysis

| Metric | Score | Reason |
|--------|-------|--------|
| Question Coverage | 7/10 | APIs exist, missing guidance |
| Relevant Examples | 6/10 | API examples good, missing interpretation |
| Formatting | 7/10 | Good code blocks |
| Initialization | 7/10 | Clear API usage |
| Metadata | 8/10 | Good frontmatter |

## Gap Analysis

### Gap 1: No Metrics Interpretation Guide (Medium)

**Problem**: API returns numbers but what do they mean?

**Context7's Expectation**:
```markdown
## Understanding Health Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | >99% | 95-99% | <95% |
| Avg Duration | <p95 | p95-p99 | >p99 |
| Failure Streak | 0 | 1-2 | 3+ |

**Success Rate**: Percentage of successful runs
- Above 99%: Healthy endpoint
- Below 95%: Investigate failures

**Failure Streak**: Consecutive failures
- 3+ failures triggers exponential backoff
- Consider investigating at 2+ failures
```

### Gap 2: No Alerting/Webhook Docs (Medium)

**Problem**: How do I get notified of issues?

**Context7's Expectation**:
```markdown
## Setting Up Alerts

### Option 1: Webhook Integration
Configure your endpoint to call a webhook on failure...

### Option 2: External Monitoring
Poll the health API from your monitoring system:
```bash
# Example: Datadog/PagerDuty integration
SUCCESS_RATE=$(curl -s ... | jq '.successRate')
if (( $(echo "$SUCCESS_RATE < 95" | bc -l) )); then
  # Trigger alert
fi
```
```

### Gap 3: Missing Visual Guide (Low)

**Problem**: No screenshots of dashboard/UI.

## Recommendations

### Documentation Improvements

1. **Add metrics interpretation guide** to API reference or new monitoring guide:

```markdown
## Health Metrics Explained

### Success Rate
Percentage of successful executions over the time window.

| Value | Status | Action |
|-------|--------|--------|
| ≥99% | Healthy | None needed |
| 95-99% | Warning | Monitor closely |
| <95% | Critical | Investigate immediately |

### Failure Streak
Count of consecutive failed executions.

| Value | Impact |
|-------|--------|
| 0 | Normal operation |
| 1-2 | Watch for pattern |
| 3+ | Exponential backoff active |
```

2. **Add monitoring integration section**:

```markdown
## Integrating with External Monitoring

### Polling Health API

Set up a cron job to check health and alert:

```bash
#!/bin/bash
# monitor-cronicorn.sh

ENDPOINT_ID="ep_xyz789"
API_KEY="cron_your_key"

HEALTH=$(curl -s -H "x-api-key: $API_KEY" \
  "https://api.cronicorn.com/api/endpoints/$ENDPOINT_ID/health?sinceHours=1")

SUCCESS_RATE=$(echo $HEALTH | jq '.successRate')

if (( $(echo "$SUCCESS_RATE < 95" | bc -l) )); then
  # Send alert (customize for your alerting system)
  curl -X POST https://your-alerting-service/webhook \
    -d "Cronicorn endpoint $ENDPOINT_ID has $SUCCESS_RATE% success rate"
fi
```
```

3. **Add to troubleshooting**: How to interpret health metrics

## Implementation Priority

| Item | Effort | Impact | Recommendation |
|------|--------|--------|----------------|
| Add metrics interpretation | Low | High | Do soon |
| Add monitoring integration | Medium | Medium | Do soon |
| Add dashboard screenshots | Medium | Low | Nice to have |

## Expected Score Improvement

- **Current**: 7/10
- **After metrics guide**: 8/10
- **After integration docs**: 8.5/10

## Related Files

- `docs/public/api-reference.md` - Monitoring API (lines 330-358)
- `docs/public/quick-start.md` - View history section
- `docs/public/troubleshooting.md` - Diagnostic steps
