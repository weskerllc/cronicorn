---
id: system-architecture
title: System Architecture
description: Dual-worker architecture with Scheduler and AI Planner
tags: [assistant, technical, architecture]
sidebar_position: 1
mcp:
  uri: file:///docs/technical/system-architecture.md
  mimeType: text/markdown
  priority: 0.80
  lastModified: 2026-02-03T00:00:00Z
---

# System Architecture

**TL;DR:** Cronicorn uses two independent workers (Scheduler and AI Planner) that communicate only through a shared database. The Scheduler executes jobs reliably on schedule, while the AI Planner analyzes execution patterns and suggests schedule adjustments through time-bounded hints.

---

## The Big Picture

Cronicorn uses a **dual-worker architecture** where job scheduling is both reliable and intelligent:

1. **The Scheduler Worker** - Executes jobs on schedule
2. **The AI Planner Worker** - Analyzes patterns and suggests schedule adjustments

These workers never communicate directly. All coordination happens through the database.

## Why Two Workers?

When you build intelligence directly into a scheduler, every job execution must analyze history, call AI models, wait for responses, and handle failures—all in the critical path. If the AI is slow, jobs run late. If the AI crashes, the scheduler might crash.

Cronicorn separates execution from decision-making:

- **Reliability**: The Scheduler keeps running even if AI fails
- **Performance**: Jobs execute immediately without waiting for AI analysis
- **Safety**: Bugs in AI logic can't break job execution
- **Scalability**: Scale Schedulers and AI Planners independently based on load

## How Workers Communicate

Workers coordinate through **shared database state**. The database is both storage and message bus.

### The Scheduler's Perspective

Every 5 seconds, the Scheduler:
1. Claims due endpoints from the database
2. Executes each endpoint's HTTP request
3. Writes results back (status, duration, response body)
4. Calculates next run time using the Governor
5. Updates `nextRunAt` and goes back to sleep

The Scheduler doesn't analyze patterns or make AI decisions. It executes, records, schedules, repeat.

### The AI Planner's Perspective

The AI Planner wakes up periodically and analyzes recently active endpoints. For each endpoint, it:
1. Reads execution history (success rates, response bodies, failure streaks)
2. Sends context to an AI model
3. Writes **hints** to the database—temporary scheduling suggestions with expiration times

The AI Planner doesn't execute jobs or manage locks. It analyzes and suggests.

### Database as Coordination Medium

This database-mediated architecture means:

- **Eventually consistent**: The Scheduler might execute a job before the AI has analyzed its previous run
- **Non-blocking**: The Scheduler never waits for AI—it reads hints already in the database
- **Fault-tolerant**: If AI crashes, the Scheduler keeps running on baseline schedules
- **Scalable**: Scale Schedulers and AI Planners independently

## Three Types of Scheduling Information

### 1. Baseline Schedule (Permanent)

What you configure when creating an endpoint:
- A cron expression: `"0 */5 * * *"` (every 5 minutes)
- A fixed interval: `300000` milliseconds

The baseline never expires or changes unless you update it.

### 2. AI Hints (Temporary, Time-Bounded)

Recommendations from the AI Planner with automatic expiration:

**Interval Hints**: "Run every 30 seconds for the next hour"
- Used when AI wants to change run frequency
- Example: Tightening monitoring during a load spike

**One-Shot Hints**: "Run at 2:30 PM today"
- Used when AI wants to trigger a specific execution
- Example: Immediate investigation of a failure

When hints expire, the system falls back to baseline. This is a safety mechanism.

### 3. Pause State (Manual Override)

Manually pause an endpoint until a specific time. While paused, the endpoint won't run regardless of baseline or hints.

## The Governor

The **Governor** is a pure function inside the Scheduler that decides when a job runs next. After executing an endpoint, the Scheduler calls the Governor with current time, endpoint configuration, and constraints.

The Governor evaluates all scheduling information and returns: "Run this endpoint next at [timestamp]."

The Governor is deterministic—same inputs always produce the same output. It has no side effects and makes no database calls.

For detailed Governor logic, see [How Scheduling Works](./how-scheduling-works.md).

## Data Flow

```
[User Creates Endpoint]
       ↓
   Database (nextRunAt set based on baseline)
       ↓
   Scheduler claims endpoint
       ↓
   Scheduler executes HTTP request
       ↓
   Database (run record with response body)
       ↓
   AI Planner discovers active endpoint
       ↓
   AI Planner analyzes response data + history
       ↓
   Database (AI writes hints)
       ↓
   Scheduler claims endpoint again
       ↓
   Governor sees hints, calculates next run
       ↓
   [Cycle continues...]
```

## Trade-offs

**Pros:**
- Reliability (execution never blocked by AI)
- Performance (no AI in critical path)
- Scalability (independent worker scaling)
- Safety (AI bugs can't break execution)
- Testability (deterministic components)

**Cons:**
- Eventual consistency (hints applied after next execution)
- Database as bottleneck (all coordination through DB)
- More complex deployment (two worker types)

The slight delay in applying AI hints (typically 5-30 seconds) is acceptable because scheduling adjustments aren't time-critical—we're optimizing for hours/days, not milliseconds.

## What You Need to Know as a User

1. **Your baseline schedule is your safety net**: The system returns to baseline when hints expire
2. **Response bodies matter**: The AI analyzes the JSON you return
3. **Constraints are hard limits**: Min/max intervals and pause states override AI hints
4. **The system is eventually consistent**: Plan for minutes, not seconds

---

## See Also

- **[How Scheduling Works](./how-scheduling-works.md)** - Detailed Governor logic and safety mechanisms
- **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - AI tools, response body design, and decision framework
- **[Configuration and Constraints](./configuration-and-constraints.md)** - Setting up endpoints effectively
