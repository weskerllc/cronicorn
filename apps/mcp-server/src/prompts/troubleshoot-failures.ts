import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

export function registerTroubleshootFailuresPrompt(server: McpServer) {
  server.registerPrompt(
    "troubleshoot-failures",
    {
      title: "Troubleshoot Endpoint Failures",
      description: "Debug failing job executions and identify solutions",
      argsSchema: {
        job_or_endpoint_name: z
          .string()
          .optional()
          .describe("Name or ID of the failing job or endpoint"),
        error_description: z
          .string()
          .optional()
          .describe("What error are you seeing? (e.g., timeout, 500 status, connection refused)"),
        when_started: z
          .enum(["just-now", "today", "this-week", "longer"])
          .optional()
          .describe("When did the failures start?"),
      },
    },
    ({ job_or_endpoint_name, error_description, when_started }) => {
      const hasIdentifier = !!job_or_endpoint_name;
      const hasError = !!error_description;
      const hasTimeline = !!when_started;

      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Troubleshooting Endpoint Failures 🔍

I'll help you debug and fix failing job executions.

${hasIdentifier ? `**Endpoint:** ${job_or_endpoint_name}` : "**Endpoint:** We'll identify the failing endpoint first"}
${hasError ? `**Error:** ${error_description}` : "**Error:** What symptoms are you seeing?"}
${hasTimeline ? `**Timeline:** Started ${when_started}` : "**Timeline:** When did this start?"}

---

## Diagnostic Approach

We'll investigate in this order:
1. **Identify the endpoint** - Find the exact endpoint having issues
2. **Review run history** - Look for patterns in failures
3. **Analyze error details** - Understand what's actually failing
4. **Check AI hints** - See if adaptive scheduling is causing issues
5. **Inspect response bodies** - Look for metric anomalies
6. **Apply fixes** - Adjust configuration or pause endpoint

---

## Step 1: Find the Failing Endpoint

${hasIdentifier ? `Since you mentioned **${job_or_endpoint_name}**, let's start there.` : "First, we need to identify which endpoint is failing."}

\`\`\`
Use list_jobs tool to see all your jobs
Then use list_endpoints tool with the job ID to see endpoints
Look for endpoints with high failure counts or recent errors
\`\`\`

**Red flags to watch for:**
- \`failureCount > 0\` - Consecutive failures
- \`pausedUntil\` set - Endpoint is paused
- \`nextRunAt\` far in future - Exponential backoff active

---

## Step 2: Review Run History

Once you've identified the endpoint, check its execution history:

\`\`\`
Use list_runs tool:
- endpointId: "<endpoint-id>"
- status: "failure" (to see only failures)
- limit: 10 (recent failures)
\`\`\`

**Look for patterns:**
- **All failures**: Endpoint configuration issue (URL, auth, timeout)
- **Intermittent failures**: External service instability
- **Recent failures only**: Something changed (deployment, API update)
- **Time-based failures**: Rate limiting or scheduled downtime

---

## Step 3: Analyze Failure Details

Get detailed information about specific failed runs:

\`\`\`
Use get_run_details tool:
- runId: "<run-id-from-history>"
\`\`\`

**What to check in the response:**

### Status Code
- \`statusCode: 500\` - Server error (check your endpoint logs)
- \`statusCode: 404\` - Wrong URL or endpoint removed
- \`statusCode: 401/403\` - Authentication/authorization issue
- \`statusCode: 429\` - Rate limited (need to slow down)
- \`statusCode: null\` - Network/timeout issue (didn't reach server)

### Error Message
- \`"ECONNREFUSED"\` - Service is down or unreachable
- \`"ETIMEDOUT"\` - Request took too long (increase timeoutMs)
- \`"ENOTFOUND"\` - DNS resolution failed (check URL)
- \`"Certificate error"\` - SSL/TLS issue

### Duration
- Very short duration + failure = Connection issue
- Long duration near timeout = Slow endpoint (increase timeout)
- Varies widely = Inconsistent performance

### Response Body
- Check if error details are in the response
- Look for API error messages
- Verify expected JSON structure

---

## Step 4: Check Scheduling State

Investigate if AI hints or scheduling are causing issues:

\`\`\`
Use get_endpoint tool to see full configuration:
- Check aiHintIntervalMs - AI might be running too frequently
- Check aiHintExpiresAt - Old hint might be interfering
- Check pausedUntil - Endpoint might be paused
- Check failureCount - Exponential backoff in effect
\`\`\`

**Common scheduling issues:**

### Exponential Backoff
When \`failureCount > 0\`, interval-based endpoints use exponential backoff:
- 1 failure: 2x interval
- 2 failures: 4x interval
- 3 failures: 8x interval
- etc.

This prevents hammering a failing service, but means execution gets slower.

**Fix:** Reset failure count after addressing the issue
\`\`\`
Use reset_failure_count tool
\`\`\`

### Aggressive AI Hints
AI might have tightened the interval too much (< minIntervalMs), causing rate limits.

**Fix:** Clear AI hints to revert to baseline
\`\`\`
Use clear_ai_hints tool
\`\`\`

### Min/Max Constraints
If \`minIntervalMs\` is too aggressive for your endpoint, you'll hit rate limits.

**Fix:** Update endpoint constraints
\`\`\`
Use update_endpoint tool:
- minIntervalMs: 300000 (increase minimum to 5 minutes)
\`\`\`

---

## Step 5: Inspect Response Bodies

Check recent successful runs for metric anomalies:

\`\`\`
Use list_runs tool:
- status: "success"
- limit: 5
Then get_run_details for each to see response bodies
\`\`\`

**What to look for:**
- **Missing response bodies** - Endpoint not returning JSON (can't adapt)
- **Error indicators** - High error rates, queue depths, latency spikes
- **Changing patterns** - Metrics that suddenly shifted
- **Threshold crossings** - Values exceeding expected ranges

---

## Common Issues & Solutions

### Issue: Timeout Errors
**Symptoms:** 
- \`statusCode: null\`
- \`errorMessage: "ETIMEDOUT"\`
- \`durationMs\` near or at timeout value

**Solutions:**
1. Increase timeout:
\`\`\`
Use update_endpoint tool:
- timeoutMs: 30000 (increase to 30 seconds)
\`\`\`

2. Optimize your endpoint to respond faster

3. If endpoint legitimately takes long, increase \`maxExecutionTimeMs\`:
\`\`\`
Use update_endpoint tool:
- maxExecutionTimeMs: 120000 (2 minutes)
\`\`\`

---

### Issue: Rate Limiting (429 Errors)
**Symptoms:**
- \`statusCode: 429\`
- Error message about rate limits
- Happens when AI tightens interval

**Solutions:**
1. Increase minimum interval:
\`\`\`
Use update_endpoint tool:
- minIntervalMs: 60000 (minimum 1 minute between runs)
\`\`\`

2. Clear aggressive AI hints:
\`\`\`
Use clear_ai_hints tool
\`\`\`

3. Pause endpoint temporarily:
\`\`\`
Use pause_resume_endpoint tool:
- pausedUntil: "2025-11-05T16:00:00Z" (pause until 4 PM)
\`\`\`

---

### Issue: Service Unavailable (500/503 Errors)
**Symptoms:**
- \`statusCode: 500 or 503\`
- Error messages about server errors
- May be intermittent

**Solutions:**
1. Check your endpoint's health separately (outside Cronicorn)

2. Pause endpoint while investigating:
\`\`\`
Use pause_resume_endpoint tool:
- pausedUntil: "2025-11-05T17:00:00Z"
- reason: "Investigating service issues"
\`\`\`

3. If endpoint needs maintenance, pause indefinitely:
\`\`\`
Use pause_resume_endpoint tool:
- pausedUntil: "2025-12-31T23:59:59Z"
- reason: "Under maintenance"
\`\`\`

4. Resume when fixed:
\`\`\`
Use pause_resume_endpoint tool:
- pausedUntil: null (resume immediately)
\`\`\`

---

### Issue: Wrong URL or Authentication
**Symptoms:**
- \`statusCode: 404\` (not found)
- \`statusCode: 401/403\` (unauthorized)
- Consistent failures from the start

**Solutions:**
1. Update endpoint URL:
\`\`\`
Use update_endpoint tool:
- url: "https://correct-url.com/endpoint"
\`\`\`

2. Add or fix authentication headers:
\`\`\`
Use update_endpoint tool:
- headersJson: {
    "Authorization": "Bearer your-token-here",
    "X-API-Key": "your-api-key"
  }
\`\`\`

---

### Issue: Response Body Issues
**Symptoms:**
- Runs succeed but AI doesn't adapt
- Response bodies are null or empty
- Response bodies are too large

**Solutions:**
1. Ensure endpoint returns JSON with metrics:
\`\`\`json
{
  "status": "healthy",
  "queue_depth": 50,
  "error_rate_pct": 1.2,
  "latency_ms": 145
}
\`\`\`

2. If responses are too large, increase limit:
\`\`\`
Use update_endpoint tool:
- maxResponseSizeKb: 100 (increase to 100KB)
\`\`\`

3. Or modify your endpoint to return smaller summaries

---

### Issue: Intermittent Network Failures
**Symptoms:**
- \`errorMessage: "ECONNREFUSED" or "ENOTFOUND"\`
- Works sometimes, fails other times
- No pattern to failures

**Solutions:**
1. Check if endpoint is behind a firewall or VPN

2. Verify DNS is stable (try IP address instead of domain)

3. Add retry logic by relying on Cronicorn's natural retry:
   - Failed runs increment \`failureCount\`
   - Next run uses exponential backoff
   - Successful run resets \`failureCount\`

4. For critical endpoints, keep \`minIntervalMs\` low to retry faster

---

## Step 6: Monitor After Fixes

After applying fixes, verify the endpoint recovers:

\`\`\`
Use get_endpoint_health_summary tool:
- endpointId: "<endpoint-id>"
- hours: 1 (last hour since fix)
\`\`\`

**Healthy indicators:**
- Success rate improving (> 95%)
- Failure count decreasing
- Average duration stable
- No recent failures

**Still problematic:**
- Success rate still low (< 80%)
- Failure streak continuing
- Errors persisting

If issues continue, we may need to:
- Pause endpoint for deeper investigation
- Review endpoint implementation (your code)
- Check external dependencies
- Adjust expectations (maybe 100% success isn't realistic)

---

## Emergency Actions

### Pause Immediately
If endpoint is causing problems (cost, cascading failures, etc.):

\`\`\`
Use pause_resume_endpoint tool:
- pausedUntil: "2099-12-31T23:59:59Z"
- reason: "Emergency pause - investigating critical issue"
\`\`\`

### Delete Endpoint
If endpoint is no longer needed or completely broken:

\`\`\`
Use delete_endpoint tool:
- endpointId: "<endpoint-id>"
WARNING: This deletes all run history!
\`\`\`

### Clear Everything and Start Fresh
Reset endpoint to baseline state:

1. Clear AI hints: \`clear_ai_hints\`
2. Reset failures: \`reset_failure_count\`
3. Resume if paused: \`pause_resume_endpoint\` with \`null\`
4. Update configuration: \`update_endpoint\` with corrected values

---

## Proactive Monitoring

To catch issues early, regularly check:

\`\`\`
Use get_dashboard_stats tool to see overview:
- Total runs today
- Success rate
- Failing endpoints
- Recent activity
\`\`\`

Set up external alerts based on:
- Success rate drops below 90%
- Failure count > 3
- No successful runs in last hour (for frequent endpoints)

---

## Next Steps

${!hasIdentifier ? "1. Tell me which job or endpoint is failing" : ""}
${!hasError ? `${!hasIdentifier ? "2" : "1"}. Describe the error symptoms you're seeing` : ""}
${!hasTimeline ? `${!hasIdentifier && !hasError ? "3" : !hasIdentifier || !hasError ? "2" : "1"}. When did the failures start?` : ""}

Then I'll help you run the diagnostic tools and apply the appropriate fixes!

---

📚 **Resources:**
- How Scheduling Works: https://docs.cronicorn.com/technical/how-scheduling-works
- How AI Adaptation Works: https://docs.cronicorn.com/technical/how-ai-adaptation-works
- Configuration Guide: https://docs.cronicorn.com/technical/configuration-and-constraints
- Bundled Docs: file:///docs/technical/how-scheduling-works.md

💡 **Available Tools:**
- list_jobs, list_endpoints - Find failing endpoints
- list_runs, get_run_details - Review execution history
- get_endpoint_health_summary - Health metrics
- update_endpoint - Fix configuration
- pause_resume_endpoint - Temporarily stop execution
- clear_ai_hints - Reset AI scheduling
- reset_failure_count - Clear backoff
- delete_endpoint - Remove endpoint (permanent)
`,
            },
          },
        ],
      };
    },
  );
}
