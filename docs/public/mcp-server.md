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
  lastModified: 2026-02-03T00:00:00Z
---

# MCP Server

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

Manage cron jobs by talking to your AI assistant.

```
You: "Check my API health every 5 minutes"

AI: ✅ Done! Health check running every 5 minutes.
```

## Quick Start

**Claude Code (CLI):**
```bash
claude mcp add cronicorn -- npx -y @cronicorn/mcp-server
```

**Other assistants** (Claude Desktop, Copilot, Cursor, etc.):
```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"]
    }
  }
}
```

See the [full README](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server#setup) for platform-specific config locations.

First use triggers OAuth in your browser. Approve once, stay connected for 30 days.

## What You Can Do

**Create jobs:**
```
"Check https://api.myapp.com/health every 5 minutes"
```

**Debug failures:**
```
"My payment-processor job is timing out - fix it"
```

**Monitor:**
```
"Show me my dashboard stats"
```

**AI-adaptive scheduling:**
```
"Monitor my API. Check more often if slow, relax when healthy."
```

## 21 Tools Available

| Category | Tools |
|----------|-------|
| **Jobs** | `createJob`, `listJobs`, `getJob`, `updateJob`, `archiveJob`, `pauseJob`, `resumeJob` |
| **Endpoints** | `addEndpoint`, `listEndpoints`, `getEndpoint`, `updateEndpoint`, `archiveEndpoint`, `pauseResumeEndpoint` |
| **AI Scheduling** | `applyIntervalHint`, `scheduleOneShot`, `clearHints`, `resetFailures` |
| **Monitoring** | `listEndpointRuns`, `getRunDetails`, `getEndpointHealth`, `getDashboardStats` |

## Built-In Guides

| Command | Description |
|---------|-------------|
| `/setup-first-job` | Interactive setup for your first scheduled job |
| `/troubleshoot-failures` | Debug failing endpoints with systematic diagnosis |

## Works With

GitHub Copilot, Claude Desktop, Cursor, Cline, Continue, and any MCP-compatible assistant.

## Security

- OAuth 2.0 Device Flow (same as AWS CLI, GitHub CLI)
- Credentials stored locally with strict file permissions
- Tokens auto-refresh, re-auth every 30 days

---

## See Also

- [Full README & Tool Reference](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server)
- [Core Concepts](./core-concepts.md) - Understanding jobs and endpoints
- [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) - AI tools and hints
- [API Reference](./api-reference.md) - HTTP API for programmatic access
