---
id: troubleshooting
title: Troubleshooting Guide
description: Diagnose and fix common issues with endpoints, AI adaptation, and authentication
tags:
  - user
  - troubleshooting
  - support
sidebar_position: 8
mcp:
  uri: file:///docs/troubleshooting.md
  mimeType: text/markdown
  priority: 0.85
  lastModified: 2026-02-03T00:00:00Z
---

# Troubleshooting Guide

**TL;DR:** Most issues fall into three categories: endpoint not running (check pause state, `nextRunAt`, locks), AI not adapting (check hint expiry, response bodies, quota), or authentication problems (check API key, OAuth flow).

---

## Endpoint Issues

### Endpoint Not Running

**Symptoms:** No executions appear in run history

**Check pause state:**
1. Open endpoint details
2. Look for "Paused until" field
3. If paused, click **Resume** or wait until the pause time passes

**Check `nextRunAt`:**
1. View endpoint details
2. Check when next run is scheduled
3. If far in the future, verify baseline schedule or check for long `maxIntervalMs`

**Check for stuck lock (`_lockedUntil`):**

If a Scheduler crashed mid-execution, the endpoint may be locked. Locks expire after 30 seconds, but in rare cases:
1. Wait 30-60 seconds
2. If still stuck, check if the scheduler worker is running
3. The endpoint should auto-recover when the lock expires

**Check job status:**

If the parent job is paused or archived, endpoints won't run.

### Endpoint Running Too Frequently

**Symptoms:** Runs more often than expected, potentially hitting rate limits

**Check active AI interval hint:**
1. View endpoint details
2. Look for "AI Hint" section
3. If present, the AI has temporarily changed the interval
4. Wait for TTL to expire, or use **Clear Hints** to revert immediately

**Check `minIntervalMs`:**

If set too low, AI can tighten the schedule aggressively.

**Check for one-shot hint loop:**

If `propose_next_time` is called repeatedly, the endpoint runs frequently. Check AI analysis sessions for reasoning.

### Endpoint Running Too Slowly

**Symptoms:** Long gaps between executions

**Check `maxIntervalMs`:**

This constraint caps how far apart runs can be. If not set, AI can relax the schedule significantly.

**Check exponential backoff:**

After failures, the interval increases exponentially (up to 32x baseline):

| Failures | Multiplier |
|----------|------------|
| 0 | 1x |
| 1 | 2x |
| 2 | 4x |
| 3 | 8x |
| 4 | 16x |
| 5+ | 32x |

To reset: use **Reset Failures** in the UI or API.

**Check baseline configuration:**

Verify the baseline cron or interval is what you intended.

### Endpoint Timing Out

**Symptoms:** Runs fail with timeout errors

**Increase timeout:**
1. Edit endpoint
2. Increase `timeoutMs` (default: 30 seconds, max: 30 minutes)

**Check if your API is slow:**
- Look at run durations in history
- If consistently near timeout, your API may need optimization

### Endpoint Returning Errors

**Symptoms:** Runs complete but show failure status

**Check run details:**
1. Click on a failed run
2. View error message and response body
3. Check HTTP status code

**Common causes:**
- 401/403: Authentication issue with your endpoint
- 404: Endpoint URL changed
- 500: Your API is returning errors
- Timeout: Request took too long

---

## AI Adaptation Issues

### AI Not Adapting

**Symptoms:** Schedule never changes despite varying conditions

**Check if AI hints are active:**
1. View endpoint details
2. Look for "AI Hint" section
3. If empty, AI hasn't proposed changes

**Check hint expiry:**

Hints have TTLs (default: 60 minutes). If expired:
- AI hasn't re-analyzed yet
- Or AI decided no changes needed

**Verify response bodies include metrics:**

AI needs data to analyze. Structure responses with:
```json
{
  "queue_depth": 45,
  "error_rate_pct": 1.2,
  "healthy": true
}
```

If responses are empty or lack metrics, AI can't detect patterns.

**Check analysis sessions:**

View recent AI analysis for the endpoint:
- Look for reasoning explaining decisions
- Check token usage (quota issues)
- Verify `next_analysis_at` is reasonable

**Check quota limits:**

If quota is exceeded, AI analysis is skipped. Check your plan limits.

### AI Making Bad Decisions

**Symptoms:** AI tightens when it should relax, or vice versa

**Use constraints to limit AI range:**
- Set `minIntervalMs` to prevent too-frequent runs
- Set `maxIntervalMs` to prevent too-infrequent runs
- Constraints are hard limits AI cannot override

**Clear hints to revert:**

Use **Clear Hints** to immediately return to baseline. Then:
1. Review AI analysis sessions for reasoning
2. Consider adjusting response body data
3. Add better thresholds to guide AI

**Review AI reasoning:**

Each analysis session logs the AI's reasoning. Look for:
- What data it saw
- What trends it detected
- Why it made its decision

### AI Analysis Not Running

**Symptoms:** No recent analysis sessions

**Check if endpoint has recent runs:**

AI only analyzes endpoints that ran recently.

**Check AI Planner worker:**

The AI Planner runs as a separate service. Verify it's running.

**Check AI re-analysis schedule:**

AI controls when it next analyzes. A stable endpoint might not be re-analyzed for hours.

### AI Oscillating Between Intervals

**Symptoms:** Endpoint interval changes frequently, alternating between fast and slow

**Causes:**
1. Response data is volatile (instantaneous values that spike)
2. Constraints allow too wide a range
3. AI hints expiring too quickly

**Solutions:**

1. **Add/tighten constraints**:
```json
{
  "minIntervalMs": 30000,
  "maxIntervalMs": 120000
}
```
A 4x range limits oscillation even with volatile AI decisions.

2. **Return smoothed metrics in response**:
```json
{ "avg_error_rate_5min": 2.3 }  // Instead of instant rate
```

3. **Request stability in description**:
```
"Monitors volatile metrics. Prioritize stability - don't overreact
to momentary spikes. Only adjust for sustained state changes."
```

4. **Include trend signals**:
```json
{ "trend": "stable", "within_normal_range": true }
```

See [Stability and Oscillation Prevention](./technical/how-ai-adaptation-works.md#stability-and-oscillation-prevention) for details.

### AI Not Following My Description

**Symptoms:** AI adapts differently than your description specifies

**Check response body data:**

AI uses both description AND response data. If response data strongly suggests a different action, AI may prioritize that.

**Be explicit in description:**

Use clear phrases:
- ✅ "Poll LESS when load is HIGH" (explicit inverse)
- ❌ "Adapt to load" (ambiguous)

**Add thresholds:**
```
"Poll more frequently when error_rate exceeds 5%."
```

**Check constraints:**

Constraints override everything. If you describe "poll every 10 seconds" but `minIntervalMs` is 30000, the constraint wins.

---

## Authentication Issues

### API Key Not Working

**Symptoms:** 401 Unauthorized responses

**Check header format:**
```bash
# Correct
curl -H "x-api-key: cron_abc123..."

# Wrong (case-sensitive)
curl -H "X-API-Key: cron_abc123..."
```

**Check key is active:**
1. Go to Settings → API Keys
2. Verify the key hasn't been revoked
3. Check key permissions

**Check key hasn't expired:**

API keys may have expiration dates set at creation.

### OAuth Flow Failing

**Symptoms:** Can't complete device authorization

**Token polling returns "pending":**

This is normal—keep polling until the user completes authorization in the browser.

**Authorization denied:**

The user clicked "Deny" instead of "Approve". Restart the flow.

**Token expired:**

Device codes expire after 30 minutes. Restart the flow.

### Session Issues

**Symptoms:** Logged out unexpectedly, session errors

**Clear cookies and retry:**

1. Log out completely
2. Clear browser cookies for the Cronicorn domain
3. Log in again

---

## MCP Server Issues

### Can't Connect

**Symptoms:** MCP server doesn't respond or errors on startup

**Check installation:**
```bash
npx -y @cronicorn/mcp-server --version
```

**Check configuration path:**

Verify MCP config is in the correct location for your assistant.

### OAuth Not Working

**Symptoms:** Device flow fails or no browser opens

**Manual verification:**

If the browser doesn't open automatically:
1. Copy the URL from the terminal output
2. Open it manually in your browser
3. Complete authorization

**Check network:**

The MCP server needs internet access to reach the Cronicorn API.

### Credentials Not Persisting

**Symptoms:** Must re-authorize every time

**Check file permissions:**

Credentials are stored locally. Verify the MCP server can write to its config directory.

**Reset credentials:**
```bash
npx -y @cronicorn/mcp-server logout
npx -y @cronicorn/mcp-server login
```

---

## Self-Hosting Issues

### Database Connection Errors

**Check PostgreSQL is running:**
```bash
docker ps | grep postgres
# Or
pnpm db
```

**Check connection string:**

Verify `DATABASE_URL` environment variable is correct.

**Check migrations:**
```bash
pnpm db:migrate
```

### Workers Not Starting

**Check environment variables:**

Both Scheduler and AI Planner need proper configuration.

**Check logs:**
```bash
pnpm dev:scheduler
pnpm dev:ai-planner
```

Look for startup errors.

### Docker Issues

**Container not starting:**
```bash
docker compose logs
```

**Port conflicts:**

Check if ports (3333, 5173, 6666) are already in use.

---

## Getting More Help

### Useful Diagnostics

When reporting issues, include:
- Endpoint ID
- Recent run IDs
- AI analysis session IDs
- Error messages from logs

### Checking System State

**Via UI:**
- Dashboard shows overall health
- Endpoint details show current state
- Run history shows execution patterns

**Via API:**
```bash
# Get endpoint health
curl -H "x-api-key: KEY" \
  https://cronicorn.com/api/api/endpoints/ID/health

# Get recent runs
curl -H "x-api-key: KEY" \
  https://cronicorn.com/api/api/endpoints/ID/runs?limit=10
```

**Via MCP:**
```
"Show me the health of my main-api endpoint"
"What's the run history for payment-processor?"
```

---

## See Also

- **[Quick Start](./quick-start.md)** - Basic setup guide
- **[How Scheduling Works](./technical/how-scheduling-works.md)** - Understand scheduling logic
- **[How AI Adaptation Works](./technical/how-ai-adaptation-works.md)** - Understand AI decisions
- **[Configuration and Constraints](./technical/configuration-and-constraints.md)** - Setting up constraints
