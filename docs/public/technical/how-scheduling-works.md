---
id: how-scheduling-works
title: How Scheduling Works
description: Scheduler loop, Governor safety, and nextRunAt calculation
tags: [assistant, technical, scheduler]
sidebar_position: 2
mcp:
  uri: file:///docs/technical/how-scheduling-works.md
  mimeType: text/markdown
  priority: 0.90
  lastModified: 2026-02-03T00:00:00Z
---

# How Scheduling Works

**TL;DR:** The Scheduler claims due endpoints, executes them, records results, and uses the Governor (a pure function) to calculate the next run time. AI hints override baseline schedules, constraints are hard limits, and the system includes safety mechanisms for locks, failures, and zombie runs.

This document explains how the Scheduler worker executes jobs and calculates next run times. If you haven't read [System Architecture](./system-architecture.md), start there for context on the dual-worker design.

## The Scheduler's Job

The Scheduler worker has one responsibility: execute endpoints on time, record results, and schedule the next run. It doesn't analyze patterns, make AI decisions, or try to be clever. It's a reliable execution engine.

Every 5 seconds (configurable), the Scheduler wakes up and runs a **tick**:

1. **Claim** due endpoints from the database
2. **Execute** each endpoint's HTTP request
3. **Record** results (status, duration, response body)
4. **Calculate** when to run next using the Governor
5. **Update** the database with the new schedule

Then it goes back to sleep. Simple, predictable, fast.

## The Tick Loop in Detail

### Step 1: Claiming Due Endpoints

The Scheduler asks the database: "Which endpoints have `nextRunAt <= now`?" 

But there's a catch—in production, you might run multiple Scheduler instances for redundancy. To prevent two Schedulers from executing the same endpoint simultaneously, the claim operation uses a **lock**.

Here's how claiming works:

- Query for endpoints where `nextRunAt <= now` and `_lockedUntil <= now` (not currently locked)
- Atomically update those endpoints to set `_lockedUntil = now + lockTtlMs` (typically 30 seconds)
- Return the list of endpoint IDs that were successfully locked

The lock TTL serves as a safety mechanism. If a Scheduler crashes while executing an endpoint, the lock expires and another Scheduler can claim it. This prevents endpoints from getting stuck if a worker dies mid-execution.

The Scheduler claims up to `batchSize` endpoints per tick (default: 10). This provides flow control—if the system is backlogged, it processes endpoints in manageable batches rather than trying to execute hundreds at once.

### Step 2: Executing the Endpoint

For each claimed endpoint, the Scheduler:

1. Reads the full endpoint configuration from the database
2. Creates a run record with status `"running"` and the current attempt number
3. Makes the HTTP request (GET, POST, etc.) to the endpoint's URL
4. Waits for the response (up to the configured timeout)
5. Records the outcome: success/failure, duration, status code, response body

The response body is stored in the database. This is important—the AI Planner will read these response bodies later to make scheduling decisions. Structure your endpoint responses to include metrics the AI should monitor (queue depth, error rate, load indicators).

### Step 3: Recording Results

After execution completes (or times out), the Scheduler writes a complete run record:

- Status: `"success"` or `"failure"`
- Duration in milliseconds
- HTTP status code
- Response body (the JSON returned by your endpoint)
- Error message (if failed)

This creates a historical record. You can query past runs to see execution patterns, investigate failures, or debug scheduling behavior.

### Step 4: The Governor Decides Next Run Time

After recording results, the Scheduler needs to answer: "When should this endpoint run next?"

This is where the **Governor** comes in. The Governor is a pure function that takes three inputs:

- **Current time** (`now`)
- **Endpoint state** (baseline schedule, AI hints, constraints, failure count)
- **Cron parser** (for evaluating cron expressions)

It returns a single output:

- **Next run time** and **source** (why this time was chosen)

The Governor is deterministic—same inputs always produce the same output. It makes no database calls, has no side effects, and contains no I/O. This makes it easy to test, audit, and understand.

Let's walk through how the Governor makes its decision.

### Building Scheduling Candidates

The Governor starts by building a list of **candidates**—possible next run times based on different scheduling sources:

**Baseline Candidate**

Every endpoint has a baseline schedule. This is either:
- A cron expression: `"0 */5 * * *"` → next cron occurrence after `now`
- An interval: `300000ms` → `now + 300000ms` (with exponential backoff on failures)

The baseline represents your intent. It never expires.

If the endpoint uses interval-based scheduling and has failures, the Governor applies **exponential backoff**: `interval * 2^failureCount` (capped at 5 failures = 32x multiplier). This prevents hammering a failing endpoint while still retrying.

**AI Interval Candidate**

If there's an active AI interval hint (not expired), the Governor creates a candidate:
- `now + aiHintIntervalMs`
- Source: `"ai-interval"`

This candidate only exists if `aiHintExpiresAt > now`. Expired hints are ignored.

**AI One-Shot Candidate**

If there's an active AI one-shot hint (not expired), the Governor creates a candidate:
- `aiHintNextRunAt` (specific timestamp)
- Source: `"ai-oneshot"`

Again, only if `aiHintExpiresAt > now`.

### Choosing the Winning Candidate

Now the Governor has 1-3 candidates. Which one wins?

**The rules:**

1. **If both AI hints exist**: Choose the earliest between interval and one-shot (baseline ignored)
2. **If only AI interval exists**: AI interval wins (baseline ignored)
3. **If only AI one-shot exists**: Choose earliest between one-shot and baseline
4. **If no AI hints exist**: Baseline wins

This logic ensures that:
- AI interval hints **override** baseline (enables tightening/relaxing schedule)
- AI one-shot hints **compete** with other candidates (enables immediate runs)
- Baseline is the fallback when AI has no opinion

### Safety: Handling Past Candidates

Sometimes a candidate time is in the past. This happens when:
- Execution took longer than the interval
- System was backlogged
- One-shot hint targeted a time that already passed

The Governor handles this by rescheduling from `now`:

- **Interval-based** (baseline or AI interval): Add the interval to `now` to preserve cadence
- **Cron-based**: Use cron.next() which handles past times correctly
- **One-shot**: Floor to `now` (run immediately)

This prevents the endpoint from being immediately reclaimed in the next tick, which would cause a tight execution loop.

### Applying Constraints (Clamping)

After choosing a candidate, the Governor applies **min/max interval constraints** (if configured):

- **Min interval**: If `chosen < (now + minIntervalMs)`, move it forward to `now + minIntervalMs` (source becomes `"clamped-min"`)
- **Max interval**: If `chosen > (now + maxIntervalMs)`, move it back to `now + maxIntervalMs` (source becomes `"clamped-max"`)

These constraints are hard limits. They override even AI hints. Use them to enforce invariants like rate limits or maximum staleness.

### The Pause Override

After all candidate evaluation and clamping, the Governor checks one final thing: **Is the endpoint paused?**

If `pausedUntil` is set and `pausedUntil > now`, the Governor returns:
- `nextRunAt = pausedUntil`
- Source: `"paused"`

Pause **always wins**. It overrides baseline, AI hints, and constraints. This gives you an emergency brake to stop an endpoint immediately.

### Step 5: Database Update

The Scheduler writes back to the database:

- `lastRunAt = now` (when this execution started)
- `nextRunAt = governor result` (when to run next)
- `failureCount`: reset to 0 on success, increment on failure
- Clear consumed one-shot hints (if `aiHintNextRunAt <= now`)
- Clear all AI hints if TTL expired (if `aiHintExpiresAt <= now`)

The database update is atomic. If two Schedulers somehow claimed the same endpoint (shouldn't happen due to locks, but defensive programming), only one update succeeds.

After the update, the endpoint's lock expires naturally (when `_lockedUntil` passes), and it becomes claimable again when `nextRunAt` arrives.

## Safety Mechanisms

The Scheduler includes several safety mechanisms to handle edge cases:

### Zombie Run Cleanup

A **zombie run** is a run record stuck in `"running"` status because the Scheduler crashed mid-execution.

The Scheduler periodically (every few minutes) scans for runs where:
- Status is `"running"`
- Created more than `zombieThresholdMs` ago (default: 5 minutes)

These runs are marked as `"timeout"` or `"cancelled"` to clean up the database and prevent confusion in the UI.

### Lock Expiration

The `_lockedUntil` field prevents double execution. Locks are short-lived (30 seconds by default). If a Scheduler crashes, the lock expires and another Scheduler can pick up the work.

This means endpoints can't get permanently stuck. At worst, there's a delay equal to the lock TTL before another Scheduler claims the endpoint.

### Past Candidate Protection

As mentioned earlier, the Governor reschedules past candidates from `now` rather than allowing them to remain in the past. This prevents immediate reclaiming, which would create a tight loop.

The Scheduler also has a second layer of protection: after calling the Governor, it checks if the returned `nextRunAt` is still in the past (due to slow execution). If so, it recalculates from the current time using the intended interval.

This double-check ensures that even if execution is very slow, the system doesn't spiral into a reclaim loop.

### Failure Count and Backoff

When an endpoint fails repeatedly, the Governor applies exponential backoff to interval-based schedules:

- 0 failures: Normal interval
- 1 failure: 2x interval
- 2 failures: 4x interval
- 3 failures: 8x interval
- 4 failures: 16x interval
- 5+ failures: 32x interval (capped)

This prevents hammering a failing service while still retrying. The backoff resets to 0 on the first success.

## Sources: Tracing Scheduling Decisions

Every scheduling decision records its **source**. This tells you why an endpoint ran at a particular time. Possible sources:

- `"baseline-cron"`: Ran on cron schedule
- `"baseline-interval"`: Ran on fixed interval
- `"ai-interval"`: Ran using AI interval hint
- `"ai-oneshot"`: Ran using AI one-shot hint
- `"clamped-min"`: Chosen time was too soon, moved to min interval
- `"clamped-max"`: Chosen time was too late, moved to max interval
- `"paused"`: Endpoint is paused

These sources are stored in run records and logs. When debugging "why did this endpoint run at 3:47 AM?", check the source. It shows the decision trail.

## What Happens Between Ticks

While the Scheduler sleeps (the 5 seconds between ticks), other things can happen:

- The AI Planner might write new hints
- You might update the endpoint configuration via the API
- You might pause an endpoint
- External systems might change state

None of this disrupts the Scheduler. When it wakes up for the next tick, it reads fresh state from the database and makes decisions based on current reality.

This is the power of database-mediated communication: the Scheduler and AI Planner stay in sync without ever talking directly.

## Key Takeaways

1. **The Scheduler is simple**: Claim, execute, record, schedule, repeat
2. **The Governor is deterministic**: Pure function, same inputs = same output
3. **AI hints override baseline**: This enables adaptation
4. **Constraints are hard limits**: Min/max and pause override everything
5. **Safety mechanisms prevent failures**: Locks, zombie cleanup, backoff, past protection
6. **Sources provide auditability**: Every decision is traceable

Understanding how scheduling works gives you the foundation to configure endpoints effectively, debug unexpected behavior, and reason about how AI adaptation affects execution timing.

---

## See Also

- **[System Architecture](./system-architecture.md)** - High-level dual-worker design
- **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - AI tools, response body design, and decision framework
- **[Configuration and Constraints](./configuration-and-constraints.md)** - Setting up endpoints effectively
