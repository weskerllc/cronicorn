---
id: core-concepts
title: Core Concepts
description: Key terminology and mental models for understanding Cronicorn
tags:
  - user
  - assistant
  - essential
sidebar_position: 2
mcp:
  uri: file:///docs/core-concepts.md
  mimeType: text/markdown
  priority: 0.95
  lastModified: 2025-11-02T00:00:00Z
---

# Core Concepts

Understanding these core concepts will help you work effectively with Cronicorn.

## Jobs and Endpoints

### Job

A **Job** is a container for organizing related endpoints. It provides:

- Logical grouping of endpoints
- Shared metadata (name, description)
- Status management (active, paused, archived)
- Tenant isolation

**Example**: A "Data Sync" job might contain endpoints for syncing users, products, and orders.

### Endpoint

An **Endpoint** is the actual schedulable unit that executes work. Each endpoint has:

- **URL**: The HTTP endpoint to call
- **Method**: HTTP method (GET, POST, etc.)
- **Schedule**: When and how often to run
- **Headers/Body**: Optional request configuration
- **Constraints**: Min/max intervals, timeouts, response size limits

**Example**: An endpoint might be `POST https://api.example.com/sync/users` scheduled to run every 5 minutes.

## Scheduling Modes

Cronicorn supports multiple scheduling approaches that work together:

### Baseline Schedule

The **baseline** is your default, static schedule. It can be defined as either:

- **Cron Expression**: `"0 */5 * * *"` (every 5 minutes)
- **Interval**: `300000` milliseconds (5 minutes)

The baseline is always active and provides a fallback when AI hints expire.

### AI Hints

**AI hints** are temporary scheduling adjustments suggested by the AI planner. There are two types:

#### AI Interval Hint

Adjusts the execution interval for a period of time:

```json
{
  "intervalMs": 60000,      // Run every 1 minute
  "ttlMinutes": 30,         // For the next 30 minutes
  "reason": "High failure rate detected"
}
```

#### AI One-shot Hint

Schedules a single execution at a specific time:

```json
{
  "nextRunAt": "2025-11-02T14:30:00Z",  // Run at 2:30 PM
  "ttlMinutes": 60,                      // Valid for 1 hour
  "reason": "Immediate sync required"
}
```

### Pause State

Endpoints can be temporarily paused until a specific time:

```json
{
  "pausedUntil": "2025-11-02T15:00:00Z",
  "reason": "Maintenance window"
}
```

Set `pausedUntil` to `null` to resume immediately.

## Governor: Schedule Selection

The **Governor** is the component that decides when an endpoint should run next. It follows this priority order:

1. **Paused**: If `pausedUntil > now`, return that time
2. **AI One-shot**: If valid (not expired), use `aiHintNextRunAt`
3. **AI Interval**: If valid (not expired), use `lastRunAt + aiHintIntervalMs`
4. **Baseline Cron**: If configured, use `Cron.next()`
5. **Baseline Interval**: Use `lastRunAt + baselineIntervalMs`

The governor also applies **clamping** to respect min/max constraints:

- `nextRunAt` must be ≥ `lastRunAt + minIntervalMs`
- `nextRunAt` must be ≤ `lastRunAt + maxIntervalMs`

### Scheduling Sources

Each run is tagged with its scheduling source:

- `baseline-cron`: From cron expression
- `baseline-interval`: From interval setting
- `ai-interval`: From AI interval hint
- `ai-oneshot`: From AI one-shot hint
- `clamped-min`: Clamped to minimum interval
- `clamped-max`: Clamped to maximum interval
- `paused`: Endpoint is paused

## Execution Lifecycle

### 1. Claiming

The scheduler worker claims due endpoints:

```
claimDueEndpoints(limit=10, withinMs=5000)
```

This returns endpoints where `nextRunAt ≤ now + 5s`, using database-level locking to prevent duplicate execution in distributed environments.

### 2. Execution

For each claimed endpoint:

1. Create a run record (status: "running")
2. Execute via dispatcher (HTTP request)
3. Record result (status, duration, error)
4. Update failure count (increment on failure, reset on success)
5. Calculate next run time via Governor
6. Update endpoint state

### 3. Next Run Calculation

The Governor determines the next run time based on:

- Current time
- Endpoint configuration
- Active AI hints
- Configured constraints

## Failure Handling

### Failure Count

Endpoints track consecutive failures:

- **On failure**: Increment failure count
- **On success**: Reset to 0

The failure count can be used by:

- AI planner for adaptive backoff
- Alerting systems for notifications
- Monitoring dashboards for health status

### Failure Count Policy

Two policies are available:

- **Reset** (default): Set to 0 on success
- **Increment**: Add 1 on failure

The policy is applied after each execution in `updateAfterRun`.

## Constraints and Quotas

### Interval Constraints

Protect against over/under-scheduling:

- **minIntervalMs**: Minimum time between runs (prevents over-execution)
- **maxIntervalMs**: Maximum time between runs (ensures timely execution)

Example: For a sync endpoint, you might set:
- `minIntervalMs`: 60000 (at least 1 minute between syncs)
- `maxIntervalMs`: 3600000 (at most 1 hour between syncs)

### Execution Constraints

Protect against resource exhaustion:

- **timeoutMs**: Maximum execution time for HTTP request
- **maxExecutionTimeMs**: Maximum time the worker holds the endpoint lock
- **maxResponseSizeKb**: Maximum response body size

### Quotas

System-wide rate limiting:

- **Endpoint quota**: Limit total endpoint executions
- **AI quota**: Limit AI planner invocations

Quotas are checked before expensive operations and can be scoped per tenant.

## Multi-tenancy

Every entity in Cronicorn is scoped to a **tenant**:

- Jobs belong to a tenant
- Endpoints belong to a job (and transitively, a tenant)
- Runs belong to an endpoint (and transitively, a tenant)

Tenancy ensures:

- Data isolation between customers
- Per-tenant quotas and rate limiting
- Secure access control

## Time and Determinism

### Clock Abstraction

Cronicorn uses a **Clock** port for all time operations:

```typescript
interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}
```

This enables:

- Deterministic testing with fake clocks
- Consistent time handling across the system
- Easy simulation of time-based scenarios

### Timestamps

All timestamps are stored as UTC and represented as:

- **ISO 8601 strings** in API responses
- **Date objects** in domain logic
- **Unix milliseconds** in calculations

## Observability

### Run History

Every execution is recorded with:

- Start and end timestamps
- Execution duration
- Status (success, failure, timeout, cancelled)
- Error messages
- HTTP response details

### Metadata Tracking

Runs include metadata about:

- Scheduling source (why it ran)
- Failure count at time of execution
- Active AI hints
- Constraint violations

### Monitoring Endpoints

Query run history to:

- Calculate success rates
- Identify failure patterns
- Track performance trends
- Debug scheduling issues

## Next Steps

- **[Introduction](./introduction.md)** - Overview of Cronicorn
- **[Quick Start](./quick-start.md)** - Get started in 5 minutes
