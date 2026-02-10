---
id: introduction
slug: /
title: Introduction to Cronicorn
description: HTTP job scheduler where AI reads response bodies and adapts frequency based on natural language descriptions
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
  lastModified: 2026-02-10T00:00:00Z
---

# Introduction to Cronicorn

[![GitHub Release](https://img.shields.io/github/v/release/weskerllc/cronicorn?style=flat-square)](https://github.com/weskerllc/cronicorn/releases)
[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

**Cronicorn** is an HTTP job scheduler where endpoints read their own response data, adapt their timing, and trigger each other — controlled by plain English descriptions, not code. Set a baseline schedule, describe what matters, and let the AI handle the rest.

---

## Getting Started

| Path | Link |
|------|------|
| **Web UI** — create and manage jobs visually | [cronicorn.com](https://cronicorn.com) |
| **MCP Server** — manage jobs from Claude, Cursor, or any MCP client | [MCP Server docs](./mcp-server.md) |
| **API** — integrate programmatically with the REST API | [API Reference](./api-reference.md) |
| **Self-Host** — run Cronicorn on your own infrastructure | [Self-Hosting Guide](./self-hosting/index.md) |

---

## Quick Navigation

**Getting Started**
- [Quick Start](./quick-start.md) - Create your first scheduled job in 5 minutes
- [Core Concepts](./core-concepts.md) - Understand jobs, endpoints, and scheduling
- [MCP Server](./mcp-server.md) - Manage jobs via AI assistant

**Reference**
- [API Reference](./api-reference.md) - Programmatic access to Cronicorn
- [Recipes](./recipes.md) - Common patterns and working examples
- [Use Cases](./use-cases.md) - Real-world scenarios and examples
- [Troubleshooting](./troubleshooting.md) - Diagnose and fix common issues

**Self-Hosting**
- [Overview & Installation](./self-hosting/index.md) - Docker Compose setup
- [Configuration](./self-hosting/configuration.md) - Environment variables and settings
- [Monitoring](./self-hosting/monitoring.md) - Observability and health checks

**Technical Deep Dive**
- [System Architecture](./technical/system-architecture.md) - Dual-worker design
- [How Scheduling Works](./technical/how-scheduling-works.md) - Governor and constraints
- [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) - AI tools and hints

---

## What is Cronicorn?

Cronicorn is a **hosted scheduling service** that replaces traditional cron with adaptive, AI-powered HTTP job scheduling. It is not a library, not an SDK, and there are no configuration files to deploy. You configure everything through the service — there is no code to write.

It combines:

- **Traditional cron scheduling** - Set fixed intervals or cron expressions
- **AI-powered adaptation** (optional) - Automatically adjust timing based on success rates, failure patterns, and response data
- **Plain English descriptions** - Describe what matters in natural language, no config files or rules engines
- **HTTP endpoint execution** - Call any HTTP endpoint on your schedule
- **Multi-endpoint coordination** - Endpoints in the same job are aware of siblings and adapt together
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
- Automatic error recovery - Exponential backoff and recovery actions out of the box

**With AI enabled (optional):**
- Automatic adaptation - Schedules adjust based on actual response data
- Intelligent backoff - Reduces frequency after failures automatically
- Dynamic optimization - Increases frequency when needed, decreases when idle
- Surge detection - Tightens polling during activity spikes, returns to baseline when stable
- Always respects your constraints - AI suggestions stay within your min/max limits

## Key Features

### 🗓️ Flexible Scheduling

- **Cron expressions**: `"0 */5 * * *"` for traditional cron syntax
- **Simple intervals**: `300000` (milliseconds) for straightforward timing
- **One-time runs**: Schedule immediate or future single executions
- **Pause/resume**: Temporarily disable endpoints for maintenance

### 🤖 AI Adaptation (Optional)

When enabled, the AI planner:

- Reads HTTP response bodies and interprets field values against your description
- Suggests interval adjustments with expiration times (TTL)
- Coordinates across sibling endpoints in the same job
- Respects your configured min/max constraints
- Gracefully degrades - baseline schedule continues if AI is unavailable

**Note**: Cronicorn works perfectly without AI. The baseline scheduler is production-ready and reliable. No per-endpoint AI setup is required — it runs automatically for all endpoints.

### 📊 Complete Visibility

- **Run history**: Every execution with timestamps, duration, status
- **Error tracking**: Detailed error messages for failures
- **Success metrics**: Track success rates and identify patterns
- **Scheduling transparency**: See why each run happened (baseline, AI hint, etc.)

### 🛡️ Production Ready

- **Reliable execution**: Database-backed with distributed locking
- **Constraint protection**: Min/max intervals prevent runaway schedules
- **Multi-tenant isolation**: Secure separation between accounts
- **Three interfaces**: Web UI, MCP Server, and HTTP API — all accept the same configuration
- **Self-hostable**: Run on your own infrastructure with [Docker Compose](./self-hosting/index.md)

## How It Works

1. **Create a Job** - A container for related endpoints
2. **Add Endpoints** - HTTP requests with baseline schedules and optional natural language descriptions
3. **Cronicorn executes them** - The Scheduler worker makes HTTP calls on schedule
4. **AI adapts automatically** (optional) - The AI Planner analyzes responses and adjusts frequency based on your descriptions
5. **Monitor results** - View run history, AI decisions, and scheduling changes

You manage everything through the [Web UI](https://cronicorn.com), [MCP Server](./mcp-server.md), or [HTTP API](./api-reference.md) — all three interfaces accept the same configuration.

## Who Is Cronicorn For?

- **SaaS developers** monitoring API health across services
- **E-commerce teams** syncing inventory and order data
- **DevOps engineers** running scheduled maintenance tasks
- **Integration developers** managing webhook retries and polling

---

## Next Steps

- **[Quick Start](./quick-start.md)** - Create your first job in 5 minutes
- **[Core Concepts](./core-concepts.md)** - Understand jobs, endpoints, descriptions, and scheduling
- **[Self-Hosting](./self-hosting/index.md)** - Run Cronicorn on your own infrastructure
