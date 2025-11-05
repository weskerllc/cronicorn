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
  priority: 0.9
---

# Chat Your Way to Scheduled Jobs

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

**What if you could manage cron jobs by just talking to your AI assistant?**

```
You: "Set up a job that checks my API health every 5 minutes"

AI: *Creates the job, adds the endpoint, configures the schedule*
    ✅ Done! Your health check is now running every 5 minutes.
```

**No forms. No clicking. Just conversation.**

## Quick Start

### Install

```bash
npm install -g @cronicorn/mcp-server
```

### Configure Your AI Assistant

Add the Cronicorn MCP server to your AI assistant's configuration. The exact setup varies by tool:

- **GitHub Copilot**: Add to VS Code settings
- **Claude Desktop**: Add to `claude_desktop_config.json`
- **Cline/Continue/Cursor**: Check your extension's MCP settings

See the [full installation guide](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server#installation) for platform-specific instructions.

### Authenticate

First time you use it, you'll authenticate once via OAuth (browser opens, you approve, done). The MCP server remembers you for 30 days.

## What You Can Do

**Create jobs instantly:**
```
"Check https://api.myapp.com/health every 5 minutes"
```

**Debug failures:**
```
"My payment-processor job is timing out - fix it"
```

**Monitor everything:**
```
"Show me my dashboard stats"
"What's wrong with that failing endpoint?"
```

**Migrate from other systems:**
```
"Help me move my 15 Vercel cron jobs to Cronicorn"
```

## Built-In Guides

The MCP server includes interactive slash commands that guide you through common workflows:

**`/setup-first-job`** - Perfect for getting started or migrating
- Learn jobs vs endpoints, baseline schedules, AI adaptation, safety constraints
- Get step-by-step guidance for your first scheduled task

**`/troubleshoot-failures`** - Debug failing endpoints
- Systematic diagnostic process
- Common issues and fixes (timeouts, rate limits, auth)
- Emergency actions when needed

## 30+ Tools Available

Your AI assistant has access to tools for:

- **Job Management** - Create, list, update, pause, resume, delete
- **Endpoint Control** - Add, configure, update URLs/timeouts/schedules
- **AI Scheduling** - Apply hints, trigger immediate runs, pause/resume
- **Monitoring** - Health summaries, execution history, run details, dashboard stats

[See all available tools →](https://github.com/weskerllc/cronicorn/tree/main/apps/mcp-server#available-tools)

## Example Use Cases

**Health monitoring with AI adaptation:**
```
"Monitor https://api.acme.com/health every minute. 
Check more frequently if slow, relax to 5 minutes when healthy."
```
→ AI auto-adjusts interval based on latency in response

**Data sync with queue monitoring:**
```
"Sync https://api.acme.com/sync every 5 minutes.
Speed up when queue_depth > 100, slow down when < 10."
```
→ AI monitors queue_depth and adjusts schedule dynamically

**Daily cleanup:**
```
"Run cleanup at https://api.acme.com/cleanup daily at 2 AM Pacific"
```
→ Simple cron-based schedule

## Security & Compatibility

**Secure authentication** via OAuth 2.0 Device Flow (same as AWS CLI, GitHub CLI). Credentials stored locally with strict permissions. Tokens refresh automatically, re-auth every 30 days.

**Works with** GitHub Copilot, Claude Desktop, Cline, Continue, Cursor, and any MCP-compatible AI assistant.

