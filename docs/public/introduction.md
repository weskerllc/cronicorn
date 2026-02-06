---
id: introduction
slug: /
title: Introduction to Cronicorn
description: A hosted scheduling service that replaces traditional cron with adaptive, AI-powered HTTP job scheduling — controlled by natural language descriptions, not code
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
  lastModified: 2026-02-06T00:00:00Z
---

# Introduction to Cronicorn

[![GitHub Release](https://img.shields.io/github/v/release/weskerllc/cronicorn?style=flat-square)](https://github.com/weskerllc/cronicorn/releases)
[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

**Cronicorn** is a hosted scheduling service that replaces traditional cron with adaptive, AI-powered HTTP job scheduling. Describe behavior in natural language, and the AI reads your endpoint's response data to adjust frequency, coordinate endpoints, and recover from failures — no scheduling code required.

---

## Recommended: Use the MCP Server

**The easiest way to use Cronicorn is through your AI assistant.** Just chat to create jobs, monitor executions, and debug issues — no forms, no clicking.

[![npm version](https://badge.fury.io/js/@cronicorn%2Fmcp-server.svg)](https://www.npmjs.com/package/@cronicorn/mcp-server)

```bash
npm install -g @cronicorn/mcp-server
```

Configure it with GitHub Copilot, Claude Desktop, or any MCP-compatible AI assistant. Then just talk:

- *"Set up a job that checks my API health every 5 minutes"*
- *"Show me why that endpoint is failing"*
- *"Migrate my 10 Vercel cron jobs to Cronicorn"*

**[-> Learn more about the MCP Server](./mcp-server.md)**

---

## Quick Navigation

**Getting Started**
- [Quick Start](./quick-start.md) - Create your first scheduled job
- [Core Concepts](./core-concepts.md) - Understand jobs, endpoints, descriptions, and scheduling
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

Cronicorn is a hosted scheduling service — not a library, not an SDK, and there are no configuration files to deploy. You configure everything through the service and it handles execution, adaptation, and monitoring.

It combines:

- **HTTP endpoint execution** — Call any URL on a schedule (cron or interval)
- **Natural language descriptions** — Tell the AI what matters: thresholds, coordination logic, when to speed up or slow down
- **Response body awareness** — The AI reads your endpoint's JSON responses and interprets field values against your descriptions
- **Adaptive scheduling** — Frequency tightens during activity surges and returns to baseline when conditions normalize
- **Safety constraints** — Min/max intervals the AI cannot exceed, plus TTL-based hints that auto-expire

You can manage Cronicorn through three interfaces — **Web UI**, **MCP Server**, or **HTTP API** — all sharing the same data model.

## Why Cronicorn?

### The Problem with Static Schedulers

Traditional cron jobs run at fixed intervals regardless of what's happening:

- **Blind execution** — Same frequency whether your system is healthy or on fire
- **No response awareness** — Ignores what your endpoints actually return
- **Manual tuning** — You adjust schedules by hand based on dashboards and alerts
- **Wasted resources** — Over-polling when idle, under-polling during incidents

### How Cronicorn Is Different

Instead of writing code rules (`if errors > 5 then interval = 30s`), you write a description:

> "Monitor API health. Tighten to 30 seconds when error_rate_pct > 5%. Return to baseline when healthy."

The AI reads response bodies, interprets fields against your description, and adjusts scheduling automatically. Your `minIntervalMs` / `maxIntervalMs` constraints guarantee the AI stays within bounds.

See [Core Concepts](./core-concepts.md) for the full description paradigm and response body field mapping.

## How It Works

1. **Create a Job** — A container for related endpoints
2. **Add Endpoints** — HTTP requests with baseline schedules and natural language descriptions
3. **Cronicorn executes them** — The Scheduler worker makes HTTP calls on schedule
4. **AI adapts automatically** — The AI Planner reads responses and adjusts frequency based on your descriptions. No per-endpoint setup required.
5. **Monitor results** — View run history, AI decisions, and scheduling changes

## Key Features

### Flexible Scheduling

- **Cron expressions**: `"0 */5 * * *"` for traditional cron syntax
- **Simple intervals**: `300000` (milliseconds) for straightforward timing
- **One-time runs**: Schedule immediate or future single executions
- **Pause/resume**: Temporarily disable endpoints for maintenance

### AI-Powered Adaptation

The AI Planner runs automatically for all endpoints:

- Reads response bodies and interprets field values against your descriptions
- Suggests interval adjustments with expiration times (TTL)
- Coordinates sibling endpoints within the same job
- Respects your min/max constraints — always
- Degrades gracefully — baseline schedule continues if AI is unavailable

**Note**: If AI is unavailable (quota exceeded, outage), the Scheduler continues on baseline schedules and existing hints expire naturally. No manual intervention required.

### Complete Visibility

- **Run history**: Every execution with timestamps, duration, and status
- **AI reasoning**: See why the AI made each scheduling decision
- **Response data**: The fields and values the AI interpreted
- **Scheduling source**: Whether each run came from baseline, AI hint, or manual override

### Safety by Design

- **Constraint protection**: Min/max intervals prevent runaway schedules
- **TTL-based hints**: AI adjustments expire automatically and revert to baseline
- **Multi-tenant isolation**: Complete separation between accounts
- **Graceful degradation**: If AI is unavailable, baseline scheduling continues uninterrupted

## Who Is Cronicorn For?

Anyone scheduling HTTP calls who wants adaptive behavior without writing scheduling logic:

- **API monitoring** — Health checks that tighten during incidents
- **Data synchronization** — Polling that speeds up when backlogs grow
- **Webhook management** — Retries with intelligent backoff
- **Batch processing** — Frequency that adapts to queue depth
- **Multi-service coordination** — Endpoints that react to each other's responses
