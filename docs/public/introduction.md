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
  priority: 0.9
  lastModified: 2025-11-02T00:00:00Z
---

# Introduction to Cronicorn

**Cronicorn** is an intelligent scheduler that automatically adapts to your application's behavior. Set baseline schedules and let AI optimize execution timing based on real-world patterns.

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

## Use Cases

### API Health Monitoring

Monitor your APIs with adaptive frequency:

- Baseline: Check every 5 minutes
- AI increases to every 30 seconds when errors detected
- AI backs off to every 15 minutes when stable
- Stays within your min (30s) and max (15min) constraints

### Data Synchronization

Sync data between systems efficiently:

- Baseline: Sync every hour
- AI increases during business hours when changes are frequent
- AI decreases overnight when activity is low
- Respects API rate limits with max interval constraints

### Scheduled Maintenance

Run cleanup and maintenance tasks:

- Baseline: Daily at 2am via cron expression
- Pause during known maintenance windows
- Monitor execution duration trends over time
- Track success/failure for audit compliance

### Webhook Retry Logic

Retry failed webhooks intelligently:

- Baseline: Immediate retry, then exponential backoff
- AI adjusts retry timing based on downstream service patterns
- Automatic pause after sustained failures
- Resume when downstream recovers

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

## Getting Started

- **Using Cronicorn as a service**: See [Quick Start](./quick-start.md)
- **Self-hosting Cronicorn**: See [Technical Documentation](./technical/system-architecture.md)
- **AI assistant integration**: Use our [MCP Server](https://www.npmjs.com/package/@cronicorn/mcp-server)

## Next Steps

- **[Core Concepts](./core-concepts.md)** - Understand jobs, endpoints, and scheduling
- **[Quick Start](./quick-start.md)** - Create your first scheduled job
- **[Technical Deep Dive](./technical/system-architecture.md)** - For developers and self-hosters
