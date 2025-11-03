---
id: system-architecture
title: System Architecture
description: Dual-worker architecture with Scheduler and AI Planner
tags: [assistant, technical, architecture]
sidebar_position: 1
mcp:
  uri: file:///docs/technical/system-architecture.md
  mimeType: text/markdown
  priority: 0.85
  lastModified: 2025-11-02T00:00:00Z
---

# System Architecture

**TL;DR:** Cronicorn uses two independent workers (Scheduler and AI Planner) that communicate only through a shared database. The Scheduler executes jobs reliably on schedule, while the AI Planner analyzes execution patterns and suggests schedule adjustments through time-bounded hints. This separation makes the system both reliable and adaptive.

---

## The Big Picture

Cronicorn uses a **dual-worker architecture** where job scheduling is both reliable and intelligent. Instead of one worker doing everything, we split responsibilities into two independent workers:

1. **The Scheduler Worker** - Executes jobs on schedule
2. **The AI Planner Worker** - Analyzes patterns and suggests schedule adjustments

These workers never communicate directly. All coordination happens through the database. This separation is why the system works.

## Why Two Workers?

When you build intelligence directly into a scheduler, every job execution must:

- Analyze execution history
- Make API calls to AI models  
- Wait for responses
- Process recommendations
- Handle AI failures gracefully

All of this happens *in the critical path*. If the AI is slow, jobs run late. If the AI crashes, the scheduler might crash. If you update AI logic, you risk breaking job execution.

Cronicorn separates execution from decision-making. The Scheduler executes endpoints reliably and on time. The AI Planner analyzes patterns and suggests adjustments. Neither worker depends on the other.

This separation provides:

- **Reliability**: The Scheduler keeps running even if AI fails
- **Performance**: Jobs execute immediately without waiting for AI analysis
- **Safety**: Bugs in AI logic can't break job execution
- **Flexibility**: We can upgrade, restart, or replace either worker independently
- **Scalability**: We can scale Schedulers and AI Planners separately based on load

## How Workers Communicate: The Database as Message Bus

Since the workers don't talk to each other, they coordinate through **shared database state**. The database is both storage and message bus—workers leave information for each other.

Here's how it works:

### The Scheduler's Perspective

The Scheduler wakes up every 5 seconds and asks the database: "Which endpoints are due to run right now?" It gets back a list of endpoint IDs, executes each one, and then writes the results back to the database:

- Execution status (success or failure)
- Duration and performance metrics
- Response body data (the actual JSON returned by the endpoint)
- Updated failure counts

After recording results, the Scheduler calculates when each endpoint should run next and updates the `nextRunAt` field. Then it goes back to sleep for 5 seconds.

Notice what the Scheduler *doesn't* do: analyze patterns, make AI decisions, or try to be clever. It executes, records, schedules next run, repeat.

### The AI Planner's Perspective

The AI Planner wakes up every 5 minutes (or on a different schedule entirely) and asks the database: "Which endpoints have been active recently?" It gets back a list of endpoint IDs that ran in the last few minutes.

For each active endpoint, the Planner reads execution history from the database:
- Success rates over the last 24 hours
- Recent response bodies
- Current failure streaks
- Existing schedule configuration

It sends all this context to an AI model and asks: "Should we adjust this endpoint's schedule?" The AI might decide:
- "Tighten the interval to 30 seconds because load is increasing" (writes an interval hint)
- "Run this immediately to investigate an issue" (writes a one-shot hint)
- "Pause until the maintenance window ends" (sets pausedUntil)
- "Everything looks good, no changes needed" (does nothing)

Any decisions get written to the database as **hints**—temporary scheduling suggestions with expiration times. Then the Planner moves to the next endpoint.

Notice what the AI Planner *doesn't* do: execute jobs, manage locks, or worry about reliability. It analyzes and suggests.

### The Database as Coordination Medium

This database-mediated architecture means:

1. **Eventually consistent**: The Scheduler might execute a job before the AI Planner has analyzed its previous run. That's fine—the next execution will use the AI's recommendations.

2. **Non-blocking**: The Scheduler never waits for AI. It reads hints already in the database (or finds none) and makes instant decisions.

3. **Fault-tolerant**: If the AI Planner crashes, the Scheduler keeps running jobs on baseline schedules. When AI comes back, it resumes making recommendations.

4. **Scalable**: Want faster AI analysis? Run more AI Planner instances. Want to handle more job executions? Run more Scheduler instances. They scale independently.

## The Three Types of Scheduling Information

Understanding how the system works requires understanding the three types of scheduling information stored in the database:

### 1. Baseline Schedule (Permanent)

This is what you configure when creating an endpoint. It's either:
- A cron expression: `"0 */5 * * *"` (every 5 minutes)  
- A fixed interval: `300000` milliseconds (5 minutes)

The baseline represents your *intent*—how often you want the job to run under normal circumstances. It never expires or changes unless you update it.

### 2. AI Hints (Temporary, Time-Bounded)

These are recommendations from the AI Planner. They come in two flavors:

**Interval Hints**: "Run every 30 seconds for the next hour"
- Used when AI wants to change run frequency
- Has a TTL (time-to-live)—expires after N minutes
- Example: Tightening monitoring during a load spike

**One-Shot Hints**: "Run at 2:30 PM today"  
- Used when AI wants to trigger a specific execution
- Has a TTL—expires if not used within N minutes
- Example: Immediate investigation of a failure

Both hint types have expiration times. When a hint expires, the system falls back to the baseline schedule. This is a safety mechanism—if the AI makes a bad decision, it's time-bounded.

### 3. Pause State (Manual Override)

You can manually pause an endpoint until a specific time. While paused, the endpoint won't run at all, regardless of baseline or hints. This is useful for:
- Maintenance windows
- Temporarily disabling misbehaving endpoints
- Coordinating with external system downtime

Setting `pausedUntil = null` resumes the endpoint immediately.

## How Adaptation Happens

Let's walk through a concrete example.

**Scenario**: You have a traffic monitoring endpoint checking visitor counts every 5 minutes (baseline interval).

**T=0**: Normal day, 2,000 visitors per minute
- Scheduler runs the endpoint on its 5-minute baseline
- Response body: `{ "visitorsPerMin": 2000, "status": "normal" }`
- Scheduler calculates next run at T+5min and updates database

**T+5min**: AI Planner analyzes the endpoint
- Reads last 24 hours of execution history
- Sees steady 2,000 visitors with 100% success rate
- AI decision: "Everything looks stable, no changes needed"
- No hints written to database

**T+10min**: Flash sale starts, traffic spikes
- Scheduler runs endpoint on 5-minute baseline
- Response body: `{ "visitorsPerMin": 5500, "status": "elevated" }`
- Scheduler records results and schedules next run at T+15min

**T+12min**: AI Planner analyzes again
- Sees visitor count jumped from 2,000 to 5,500
- Looks at trend over last few runs—increasing
- AI decision: "High load detected, need tighter monitoring"
- Writes interval hint to database: 30 seconds, expires in 60 minutes
- **Nudges** `nextRunAt` to T+12min+30sec

**T+12min+30sec**: Scheduler wakes up, claims endpoint (now due)
- Reads endpoint state from database
- Sees fresh AI hint (30-second interval, expires at T+72min)
- Governor chooses: AI hint (30 sec) overrides baseline (5 min)
- Executes endpoint, gets response: `{ "visitorsPerMin": 6200, "status": "high" }`
- Calculates next run: T+13min (30 seconds from now)

**T+13min through T+72min**: Runs every 30 seconds
- AI hint remains active
- Scheduler uses 30-second interval for every run
- System monitors flash sale closely

**T+72min**: AI hint expires
- Scheduler reads endpoint state
- No valid hints found (aiHintExpiresAt < now)
- Governor chooses: Baseline (5 min)
- System returns to normal 5-minute interval
- AI can propose new hints if load remains high

This example shows several key principles:

1. **AI hints override baseline**—This is what makes the system adaptive
2. **Hints have TTLs**—Bad AI decisions auto-correct
3. **Nudging provides immediacy**—Changes take effect within seconds, not minutes
4. **Eventual consistency works**—There's a delay between analysis and application, but it's acceptable
5. **System self-heals**—When hints expire, it returns to known-good baseline

## The Role of the Governor

Who decides when a job runs next? That's the **Governor**—a pure function inside the Scheduler worker.

After executing an endpoint, the Scheduler calls the Governor with:
- Current time
- Endpoint configuration (baseline, hints, constraints)
- Cron parser (for cron expressions)

The Governor evaluates all scheduling information and returns a single answer: "Run this endpoint next at [timestamp]."

The Governor is deterministic—same inputs always produce the same output. It has no side effects, makes no database calls, and contains no business logic beyond "what time should this run next?"

This determinism makes the Governor:
- **Testable**: We can verify scheduling logic with unit tests
- **Auditable**: Every scheduling decision has a clear source ("baseline-cron", "ai-interval", etc.)
- **Debuggable**: You can trace why a job ran when it did
- **Portable**: The algorithm can be understood, documented, and reimplemented

The Governor's logic is covered in detail in [How Scheduling Works](./how-scheduling-works.md).

## Why This Architecture Works for Adaptation

Traditional cron systems are static—you set a schedule and it runs forever on that schedule. Cronicorn's architecture enables adaptive scheduling because:

1. **Separation allows continuous learning**: While the Scheduler executes jobs, the AI Planner can analyze patterns without disrupting execution. Analysis happens in parallel, not blocking execution.

2. **Hints enable safe experimentation**: Because hints have TTLs, the AI can try aggressive schedule changes knowing they'll auto-expire if wrong. This allows quick adaptation without risk.

3. **Database state captures context**: Every execution records response bodies. The AI can see the data returned by endpoints—not just success/failure, but real metrics like queue depths, error rates, latency. This rich context enables intelligent decisions.

4. **Override semantics enable tightening**: AI interval hints *override* baseline (not just compete), so the system can tighten monitoring during incidents. Without this override, the baseline would always win and adaptation would be limited to relaxation only.

5. **Independent scaling supports different workloads**: Execution workload (Scheduler) and analysis workload (AI Planner) have different characteristics. Separating them allows optimizing each independently.

## Data Flows: Putting It All Together

Here's how information flows through the system:

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
   Database (nextRunAt updated with hint influence)
       ↓
   [Cycle continues...]
```

Notice how the database is the central hub. Workers don't communicate—they share state through database reads and writes. This is **database-mediated communication**, and it's the foundation of the architecture.

## Trade-offs and Design Decisions

No architecture is perfect. Here are the trade-offs we made:

**✅ Pros:**
- Reliability (execution never blocked by AI)
- Performance (no AI in critical path)
- Scalability (independent worker scaling)
- Safety (AI bugs can't break execution)
- Testability (deterministic components)

**⚠️ Cons:**
- Eventual consistency (hints applied after next execution, not immediately)
- Database as bottleneck (all coordination through DB)
- More complex deployment (two worker types to run)
- Debugging requires understanding async flows

We believe the pros outweigh the cons for adaptive scheduling. The slight delay in applying AI hints (typically 5-30 seconds) is acceptable because scheduling adjustments aren't time-critical—we're optimizing for hours/days, not milliseconds.

## What You Need to Know as a User

To use Cronicorn effectively, you need to understand:

1. **Your baseline schedule is your safety net**: Even if AI does something unexpected, the system returns to your baseline when hints expire. Configure baselines conservatively.

2. **Response bodies matter**: The AI analyzes the JSON you return. Structure it to include metrics the AI should monitor (queue depths, error rates, status flags).

3. **Constraints are hard limits**: Min/max intervals and pause states override even AI hints. Use them to enforce invariants (rate limits, maintenance windows).

4. **Coordination happens via response bodies**: To orchestrate multiple endpoints, have them write coordination signals to their response bodies. Other endpoints can read these via the `get_sibling_latest_responses` tool.

5. **The system is eventually consistent**: Don't expect instant reactions to every change. The AI analyzes every 5 minutes, and hints apply on the next execution. Plan for minutes, not seconds.

## Next Steps

Now that you understand the architecture, you can dive deeper:

- **[How Scheduling Works](./how-scheduling-works.md)** - Deep-dive into the Scheduler worker and Governor logic
- **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - Deep-dive into the AI Planner and hint system
- **[Coordinating Multiple Endpoints](./coordinating-multiple-endpoints.md)** - Patterns for building workflows
- **[Configuration and Constraints](./configuration-and-constraints.md)** - How to configure endpoints effectively

---

*This document explains how the system is designed. For implementation details, see the source code in `packages/worker-scheduler` and `packages/worker-ai-planner`.*
