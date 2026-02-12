---
id: mcp-server
title: MCP Server
description: Control Cronicorn through your AI assistant - no forms, no clicking, just conversation
tags:
  - getting-started
  - integrations
  - ai
sidebar_position: 3
mcp:
  uri: file:///docs/mcp-server.md
  mimeType: text/markdown
  priority: 0.95
  lastModified: 2026-02-11T00:00:00Z
---

# MCP Server

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

Manage cron jobs by talking to your AI assistant.

```
You: "Check my API health every 5 minutes"

AI: ✅ Done! Health check running every 5 minutes.
```

## Quick Start

```bash
claude mcp add cronicorn -- npx -y @cronicorn/mcp-server
```

For other assistants (Claude Desktop, Copilot, Cursor, Cline), see the [setup guide](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server#setup) for platform-specific config.

First use triggers OAuth in your browser. Approve once, stay connected for 30 days.

## Works at Every Stage

From first idea to production — your AI assistant knows Cronicorn inside and out.

### Before you build

```
"Give me 5 profitable SaaS app ideas that use Cronicorn as the scheduling backbone"
```
```
"I have a Next.js app with 3 cron jobs in node-cron — help me migrate them to Cronicorn"
```

### Setting up

```
"Check https://api.myapp.com/health every 5 minutes"
```
```
"Monitor my API. Check more often if slow, relax when healthy."
```

### Day-to-day operations

```
"My payment-processor job is timing out — fix it"
```
```
"Show me my dashboard stats for the last 24 hours"
```

### Growing

```
"Add a new endpoint to my monitoring job that checks the database connection"
```
```
"My app is getting more traffic — should I tighten my health check intervals?"
```

## 25 Tools Available

| Category | Tools |
|----------|-------|
| **Jobs** | `createJob`, `listJobs`, `getJob`, `updateJob`, `archiveJob`, `pauseJob`, `resumeJob` |
| **Endpoints** | `addEndpoint`, `listEndpoints`, `getEndpoint`, `updateEndpoint`, `archiveEndpoint`, `pauseResumeEndpoint` |
| **AI Scheduling** | `applyIntervalHint`, `scheduleOneShot`, `clearHints`, `resetFailures` |
| **Monitoring** | `listEndpointRuns`, `getRunDetails`, `getEndpointHealth`, `getDashboardStats`, `testEndpoint` |
| **Security** | `getSigningKey`, `createSigningKey`, `rotateSigningKey` |

## Built-In Documentation

The server bundles comprehensive docs as MCP resources. Ask your AI assistant anything — it has access to concepts, recipes, API reference, troubleshooting guides, and self-hosting instructions.

## Works With

GitHub Copilot, Claude Desktop, Cursor, Cline, Continue, and any MCP-compatible assistant.

## Security

- OAuth 2.0 Device Flow (same as AWS CLI, GitHub CLI)
- Credentials stored locally with strict file permissions
- Tokens auto-refresh, re-auth every 30 days

## Example Tool Calls

Concrete examples of MCP tool invocations showing inputs and responses.

### Creating a Health Monitoring Job

```json
// Tool: createJob
// Input:
{ "name": "Production API Monitoring", "description": "Monitors API health with adaptive frequency" }
// Response:
{ "id": "job_abc123", "name": "Production API Monitoring", "status": "active" }

// Tool: addEndpoint
// Input:
{
  "jobId": "job_abc123",
  "name": "api-health-check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "baselineIntervalMs": 300000,
  "minIntervalMs": 30000,
  "maxIntervalMs": 900000,
  "description": "Poll every 30s when status is degraded or error_rate_pct > 5%. Return to baseline when healthy."
}
// Response:
{ "id": "ep_xyz789", "name": "api-health-check", "jobId": "job_abc123" }
```

### Manually Overriding Frequency During an Incident

```json
// Tool: applyIntervalHint
// Input:
{ "id": "ep_xyz789", "intervalMs": 30000, "ttlMinutes": 60, "reason": "Incident detected" }
// Response:
{ "success": true, "intervalMs": 30000, "expiresAt": "2026-02-03T13:00:00Z" }
```

### Checking Endpoint Health

```json
// Tool: getEndpointHealth
// Input:
{ "id": "ep_xyz789", "sinceHours": 24 }
// Response:
{ "successCount": 285, "failureCount": 3, "successRate": 98.96, "failureStreak": 0 }
```

### Debugging a Failing Endpoint

```json
// Tool: listEndpointRuns
// Input:
{ "id": "ep_xyz789", "limit": 5, "status": "failed" }
// Response:
{ "runs": [
  { "id": "run_001", "status": "failed", "statusCode": 503, "error": "Service Unavailable" },
  { "id": "run_002", "status": "failed", "statusCode": 500, "error": "Internal Server Error" }
]}

// Tool: resetFailures
// Input:
{ "id": "ep_xyz789" }
// Response:
{ "success": true, "failureCount": 0 }
```

For more language examples (JavaScript, TypeScript, Python), see [Code Examples](./code-examples.md).

---

## See Also

- [Full README & Tool Reference](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server)
- [Core Concepts](./core-concepts.md) - Understanding jobs and endpoints
- [Code Examples](./code-examples.md) - JavaScript, TypeScript, Python examples
- [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) - AI tools and hints
- [API Reference](./api-reference.md) - HTTP API for programmatic access
