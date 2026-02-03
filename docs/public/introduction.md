---
id: introduction
slug: /
title: Introduction to Cronicorn
description: AI-powered adaptive scheduling for modern applications
sidebar_label: Introduction
displayed_sidebar: docsSidebar
tags:
  - user
  - assistant
  - essential
sidebar_position: 1
mcp:
  uri: file:///docs/introduction.md
  mimeType: text/markdown
  priority: 0.95
  lastModified: 2026-02-03T00:00:00Z
---

# Introduction to Cronicorn

[![GitHub Release](https://img.shields.io/github/v/release/weskerllc/cronicorn?style=flat-square)](https://github.com/weskerllc/cronicorn/releases)
[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

**Cronicorn** is an intelligent scheduler that automatically adapts to your application's behavior. Set baseline schedules and let AI optimize execution timing based on real-world patterns.

---

## 🤖 Recommended: Use the MCP Server

**The easiest way to use Cronicorn is through your AI assistant.** Just chat to create jobs, monitor executions, and debug issues—no forms, no clicking.

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

```bash
npm install -g @cronicorn/mcp-server
```

Configure it with GitHub Copilot, Claude Desktop, or any MCP-compatible AI assistant. Then just talk:

- *"Set up a job that checks my API health every 5 minutes"*
- *"Show me why that endpoint is failing"*
- *"Migrate my 10 Vercel cron jobs to Cronicorn"*

**[→ Learn more about the MCP Server](./mcp-server.md)**

---

## Quick Navigation

**Getting Started**
- [Quick Start](./quick-start.md) - Create your first scheduled job in 5 minutes
- [Core Concepts](./core-concepts.md) - Understand jobs, endpoints, and scheduling
- [MCP Server](./mcp-server.md) - Manage jobs via AI assistant

**Reference**
- [API Reference](./api-reference.md) - Programmatic access to Cronicorn
- [Use Cases](./use-cases.md) - Real-world scenarios and examples
- [Troubleshooting](./troubleshooting.md) - Diagnose and fix common issues

**Technical Deep Dive**
- [System Architecture](./technical/system-architecture.md) - Dual-worker design
- [How Scheduling Works](./technical/how-scheduling-works.md) - Governor and constraints
- [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) - AI tools and hints

---

## What is Cronicorn?

Cronicorn is a scheduling service that combines:

- **Traditional cron scheduling** - Set fixed intervals or cron expressions
- **AI-powered adaptation** (optional) - Automatically adjust timing based on success rates, failure patterns, and performance
- **HTTP endpoint execution** - Call any HTTP endpoint on your schedule
- **Real-time monitoring** - Track execution history, success rates, and performance

## Why Use Cronicorn?

### Problems with Static Schedulers

Traditional cron jobs have limitations:

- **Fixed timing** - Run every 5 minutes whether needed or not
- **No learning** - Repeated failures don't trigger automatic backoff
- **Manual intervention** - You adjust schedules manually based on metrics
- **Resource waste** - Over-polling wastes API rate limits and costs

### How Cronicorn Helps

**For all users:**
- Set it and forget it - Define baseline schedules that just work
- Real-time visibility - Track all executions with detailed history
- Flexible scheduling - Use cron expressions or simple intervals
- Constraint protection - Set min/max intervals to prevent over/under execution

**With AI enabled (optional):**
- Automatic adaptation - Schedules adjust based on actual performance
- Intelligent backoff - Reduces frequency after failures automatically
- Dynamic optimization - Increases frequency when needed, decreases when idle
- Always respects your constraints - AI suggestions stay within your min/max limits

## Key Features

### 🗓️ Flexible Scheduling

- **Cron expressions**: `"0 */5 * * *"` for traditional cron syntax
- **Simple intervals**: `300000` (milliseconds) for straightforward timing
- **One-time runs**: Schedule immediate or future single executions
- **Pause/resume**: Temporarily disable endpoints for maintenance

### 🤖 AI Adaptation (Optional)

When enabled, the AI planner:

- Analyzes execution patterns (success rates, failure streaks, response times)
- Suggests interval adjustments with expiration times (TTL)
- Respects your configured min/max constraints
- Gracefully degrades - baseline schedule continues if AI is unavailable

**Note**: Cronicorn works perfectly without AI. The baseline scheduler is production-ready and reliable.

### 📊 Complete Visibility

- **Run history**: Every execution with timestamps, duration, status
- **Error tracking**: Detailed error messages for failures
- **Success metrics**: Track success rates and identify patterns
- **Scheduling transparency**: See why each run happened (baseline, AI hint, etc.)

### 🛡️ Production Ready

- **Reliable execution**: Database-backed with distributed locking
- **Constraint protection**: Min/max intervals prevent runaway schedules
- **Multi-tenant isolation**: Secure separation between accounts
- **API & Web UI**: Manage jobs programmatically or visually

## How It Works

1. **Create a Job** - Logical container for related endpoints
2. **Add Endpoints** - HTTP endpoints with baseline schedules
3. **Set Constraints** (optional) - Min/max intervals for safety
4. **Enable AI** (optional) - Let AI optimize timing automatically
5. **Monitor** - Track execution history and performance

## Who Is Cronicorn For?

- **SaaS developers** monitoring API health across services
- **E-commerce teams** syncing inventory and order data
- **DevOps engineers** running scheduled maintenance tasks
- **Integration developers** managing webhook retries and polling
