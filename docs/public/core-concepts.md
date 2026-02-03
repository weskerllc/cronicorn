---
id: core-concepts
title: Core Concepts
description: Key terminology for using Cronicorn
tags:
  - user
  - assistant
  - essential
sidebar_position: 2
mcp:
  uri: file:///docs/core-concepts.md
  mimeType: text/markdown
  priority: 0.95
  lastModified: 2026-02-03T00:00:00Z
---

# Core Concepts

Understand the key concepts for working with Cronicorn.

## Jobs and Endpoints

### Job

A **Job** is a container that groups related endpoints together.

**Example**: A "Data Sync" job might contain endpoints for syncing users, products, and orders from different APIs.

**Properties:**
- **Name**: Descriptive label (e.g., "API Health Checks")
- **Description**: Optional details about what this job does
- **Status**: Active, paused, or archived

### Endpoint

An **Endpoint** is the actual work to be executed - an HTTP request that runs on a schedule.

**Example**: `POST https://api.example.com/sync/users` that runs every 5 minutes.

**Required:**
- **Name**: What this endpoint does (e.g., "Sync Users")
- **URL**: The HTTP endpoint to call
- **Method**: GET, POST, PUT, PATCH, or DELETE
- **Schedule**: Either a cron expression OR an interval in milliseconds

**Optional:**
- **Headers**: Custom HTTP headers
- **Body**: Request body (for POST/PUT/PATCH)
- **Min/Max Intervals**: Safety constraints (see below)
- **Timeout**: Maximum execution time

## Scheduling

### Baseline Schedule

Your **baseline schedule** is the default timing for an endpoint. You must choose ONE:

**Option 1: Cron Expression**
```
"0 */5 * * *"  // Every 5 minutes
"0 2 * * *"    // Daily at 2am
"0 9 * * 1"    // Mondays at 9am
```

**Option 2: Interval (milliseconds)**
```
60000      // Every 60 seconds
300000     // Every 5 minutes
3600000    // Every hour
```

The baseline schedule is always active and provides a fallback when AI hints expire.

### AI Hints (Optional)

When AI is enabled, it can suggest temporary scheduling adjustments called **hints**:

**AI Interval Hint** - Adjust how often the endpoint runs:
- "Run every 30 seconds for the next hour" (instead of every 5 minutes)
- "Run every 15 minutes for the next 4 hours" (instead of every 5 minutes)
- Hints expire automatically (TTL) and revert to baseline

**AI One-Shot Hint** - Schedule a single immediate or future run:
- "Run once right now" (for immediate execution)
- "Run once at 2:30 PM" (for specific time)
- Happens once, then endpoint returns to baseline schedule

**How AI Decides:**
- Analyzes recent execution history (last 24 hours)
- Looks at success rates, failure patterns, response times
- Suggests adjustments while respecting your min/max constraints
- All hints have expiration times (TTL) - typically 15-60 minutes

### Pause State

You can temporarily **pause** an endpoint:

- Stops all execution until a specified time
- Useful for maintenance windows or debugging
- Set to `null` to resume immediately
- Overrides all other scheduling (baseline and AI hints)

## How Scheduling Works

The system picks the next run time using this priority order:

1. **Paused?** → If yes, return the pause-until time
2. **AI one-shot hint active?** → If yes, use that time
3. **AI interval hint active?** → If yes, use last run + AI interval
4. **Baseline cron configured?** → If yes, calculate next cron time
5. **Baseline interval configured?** → Use last run + baseline interval

**Then apply safety constraints:**
- Clamp to minimum interval (if configured)
- Clamp to maximum interval (if configured)

This ensures AI suggestions always stay within your safety boundaries.

## Safety Constraints

### Minimum Interval

Prevents over-execution:

```
minIntervalMs: 30000  // At least 30 seconds between runs
```

**Use when:**
- Protecting API rate limits
- Preventing database overload
- Avoiding costs from too-frequent polling

**Example**: Health check every 5 minutes, but AI can't go faster than every 30 seconds.

### Maximum Interval

Ensures timely execution:

```
maxIntervalMs: 3600000  // At most 1 hour between runs
```

**Use when:**
- Data must stay fresh (max 1 hour old)
- SLAs require regular checks
- Compliance needs frequent execution

**Example**: Sync every 5 minutes, but even if AI backs off, run at least every hour.

### Execution Timeout

Maximum time for the HTTP request:

```
timeoutMs: 30000  // Request must complete within 30 seconds
```

If the request takes longer, it's cancelled and marked as timeout.

## Execution Tracking

### Run History

Every execution creates a **run** record with:

- **Status**: success, failure, timeout, or cancelled
- **Duration**: How long the execution took (milliseconds)
- **Timestamps**: When it started and finished
- **Error**: Error message (if failed)
- **Source**: Why it ran (baseline-cron, baseline-interval, ai-interval, ai-oneshot, etc.)

### Failure Tracking

Endpoints track consecutive failures:

- **Failure count**: Increments on failure, resets to 0 on success
- **AI uses this**: To decide on backoff strategies
- **You see this**: In the UI for monitoring health

## Multi-Tenancy

Every job and endpoint belongs to your account (tenant):

- **Complete isolation**: You only see your own jobs and data
- **Secure execution**: Endpoints run with your credentials
- **Per-account quotas**: Usage limits apply per account

## Common Patterns

### Health Check with Adaptive Frequency

```
Baseline: Every 5 minutes (300000ms)
Min: 30 seconds (30000ms)
Max: 15 minutes (900000ms)

AI behavior:
- Normal: Runs every 5 minutes
- Errors detected: Increases to every 30 seconds
- All healthy: Backs off to every 15 minutes
```

### Daily Maintenance with Safety Net

```
Baseline: "0 2 * * *" (daily at 2am)
Max: 26 hours

Behavior:
- Normally runs at 2am daily
- If it fails, max interval ensures retry within 26 hours
- Won't accidentally skip days
```

### API Polling with Rate Limit Protection

```
Baseline: Every minute (60000ms)
Min: 30 seconds (30000ms) - protects rate limit
Max: 5 minutes (300000ms) - keeps data fresh

AI behavior:
- Adjusts between 30s and 5min based on data changes
- Never exceeds API rate limits (min)
- Ensures data freshness (max)
```

---

## See Also

- **[Quick Start](./quick-start.md)** - Create your first job
- **[How Scheduling Works](./technical/how-scheduling-works.md)** - Detailed scheduling logic
- **[Configuration and Constraints](./technical/configuration-and-constraints.md)** - Advanced configuration
