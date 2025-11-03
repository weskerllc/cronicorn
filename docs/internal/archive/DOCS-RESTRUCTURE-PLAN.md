# Documentation Restructure Plan (Pragmatic Approach)

**Goal:** Split the monolithic TECHNICAL_SYSTEM_EXPLANATION.md into a manageable set of focused documents that help AI agents and users understand how the system logic works to optimally orchestrate their apps.

**Date:** November 2, 2025  
**Approach:** Middle ground - not 15-20 docs, but not one massive doc either

---

## Core Principle

> **Users need to understand the system logic to configure endpoints intelligently and orchestrate their apps.**

This means explaining:
- How scheduling decisions are made (so they can predict behavior)
- How AI adapts based on response data (so they can structure their endpoints)
- How to coordinate multiple endpoints (so they can build workflows)
- What constraints and safety mechanisms exist (so they can configure safely)

---

## Proposed Structure: 6 Documents

### 1. **`system-architecture.md`** (~600-800 words)
**Purpose:** Big picture - what is the system and how do the pieces fit together

**Content:**
- The dual-worker architecture (Scheduler + AI Planner)
- How they communicate via database (no RPC, eventual consistency)
- The separation of concerns (execution vs. decision-making)
- Why this architecture enables adaptive scheduling
- Key data flows (endpoints → runs → analysis → hints → scheduling)

**Written as:** High-level narrative explaining the mental model users need

**Example opening:**
> "Cronicorn uses a two-worker architecture where one worker focuses purely on executing jobs on schedule, while a completely separate worker analyzes execution patterns and suggests schedule adjustments. They never talk to each other directly - all coordination happens through the database. This separation is what makes the system both reliable (scheduler keeps running even if AI fails) and adaptive (AI can influence scheduling without blocking execution)..."

---

### 2. **`how-scheduling-works.md`** (~1000-1200 words)
**Purpose:** Deep-dive on how jobs get scheduled and executed

**Content:**
- The scheduler's execution loop (claim → execute → record → schedule next)
- How the Governor calculates next run time
- Priority order: Pause > AI hints > Baseline
- How AI interval hints **override** baseline (key for adaptation)
- How AI one-shot hints **compete** with baseline
- Safety mechanisms (handling long executions, past candidates)
- Constraint enforcement (min/max intervals)
- Failure handling and backoff
- Lock management for distributed workers

**Written as:** Step-by-step narrative walking through the scheduling logic

**Example section:**
> "When the scheduler wakes up every 5 seconds, it asks the database for endpoints that are due to run. The database returns up to 10 endpoints where nextRunAt is less than or equal to now plus 5 seconds. This 5-second horizon ensures the scheduler can claim work slightly before it's due, accounting for network latency and execution time.
>
> For each endpoint, the scheduler follows a precise sequence. First, it creates a run record marking status as 'running'. This serves two purposes: it provides an audit trail, and it establishes when execution began for timeout detection. Then it calls the endpoint's URL and waits for the response..."

**Key focus:** Explain the governor's decision logic in prose, not pseudocode

---

### 3. **`how-ai-adaptation-works.md`** (~1000-1200 words)
**Purpose:** Deep-dive on how AI makes the system adaptive

**Content:**
- AI Planner's analysis loop (discover → analyze → suggest → persist)
- Discovery mechanism (finding recently-active endpoints)
- What AI analyzes (health metrics + response bodies)
- The 7 tools AI has access to (3 read, 3 write, 1 final)
- How hints work (interval vs. one-shot, TTLs, expiration)
- The nudging mechanism (immediate effect via setNextRunAtIfEarlier)
- How hints influence the Governor
- Quota enforcement and cost control
- Session persistence (why reasoning is captured)

**Written as:** Explanation of AI's perspective and decision-making process

**Example section:**
> "The AI planner doesn't try to analyze every endpoint constantly - that would be expensive and wasteful. Instead, every 5 minutes it discovers which endpoints have been active recently. It queries the database for any endpoint that executed in the last 5 minutes. This discovery mechanism keeps AI focused on the parts of the system that are actually doing work.
>
> For each active endpoint, the planner first checks quota. If the tenant has exceeded their AI analysis quota, the endpoint is skipped. This prevents runaway costs and ensures fair resource sharing across tenants.
>
> Next, the planner gathers context. It fetches the last 24 hours of execution history to calculate success rates, average durations, and failure streaks. It combines this with the job's description (if any) to understand the endpoint's purpose. This context becomes the foundation for AI analysis..."

**Key focus:** Help users understand what AI looks at so they can structure response bodies helpfully

---

### 4. **`coordinating-multiple-endpoints.md`** (~800-1000 words)
**Purpose:** Practical patterns for orchestrating apps with multiple endpoints

**Content:**
- Why coordination matters (workflows, dependencies, cascading actions)
- The flash sale example (told as a story, not code)
- Tier-based organization (Health → Investigation → Recovery → Alerts)
- Coordination via response bodies (shared state, ready flags)
- Using the get_sibling_latest_responses tool
- Cooldown patterns for one-shot actions
- Example: ETL pipeline coordination
- Example: Service health monitoring with auto-remediation

**Written as:** Real-world scenarios and patterns users can copy

**Example scenario:**
> "Imagine you're monitoring a microservices architecture with 10 services. You create a health-check endpoint for each service that runs every minute. Each endpoint's response body includes the service name, status, and dependency health.
>
> Now you create an 'aggregator' endpoint that runs every 5 minutes. This endpoint uses the get_sibling_latest_responses tool to fetch the latest health check from all 10 services. It analyzes the combined state to detect patterns - are multiple services unhealthy? Are failures cascading from a common dependency?
>
> Based on this analysis, the aggregator endpoint can return coordination signals in its response body. For example, if it detects widespread database connection issues, it sets a flag 'database_degraded: true'. Other endpoints can check for this flag and adjust their retry logic or temporarily pause database-heavy operations..."

**Key focus:** Show how users can build sophisticated workflows using coordination

---

### 5. **`configuration-and-constraints.md`** (~600-800 words)
**Purpose:** Practical guide to configuring endpoints safely and effectively

**Content:**
- Choosing between cron and interval schedules
- Setting min/max intervals (when and why)
- Timeout and execution time limits
- Response size limits
- Pause for maintenance windows
- Structuring response bodies for AI analysis
- Common configuration patterns by use case
- Configuration anti-patterns to avoid

**Written as:** Decision guide with concrete recommendations

**Example section:**
> "When choosing between a cron expression and a fixed interval, consider predictability vs. adaptability. Cron expressions are great when timing matters - you want the job to run at 9am sharp every day, not '24 hours after the last run'. Intervals are better when you care about spacing between executions - you want at least 5 minutes between syncs, but don't care about exact clock times.
>
> For min/max intervals, think about what could go wrong. The minimum interval protects the system you're calling - if you're hitting an external API, set minIntervalMs to respect their rate limits. The maximum interval protects your monitoring - if you're checking system health, set maxIntervalMs to ensure you never go more than 1 hour without checking, even if AI tries to relax the schedule too much..."

**Key focus:** Help users make good configuration decisions

---

### 6. **`reference.md`** (~800-1000 words)
**Purpose:** Quick reference for looking up specifics

**Content:**

**Glossary:**
- Baseline schedule
- AI hint (interval vs. one-shot)
- Governor
- Nudging
- TTL (Time To Live)
- Claiming/Lock
- Source (scheduling source)
- Failure count
- etc.

**Database Schema Summary:**
- High-level table descriptions (not full SQL)
- Key fields and their purposes
- Relationships

**Configuration Defaults:**
- Worker polling intervals
- Claim horizons
- TTLs
- Timeouts
- Quotas

**Scheduling Sources:**
- All possible source values with explanations

**Tool Reference:**
- Quick list of AI tools with 1-sentence descriptions

**Written as:** Scannable reference, not narrative

---

## What About the Current Docs App?

Looking at `apps/docs/docs/`, I see there's already:
- `introduction.md`
- `core-concepts.md` (good user-facing explanations!)
- `quick-start.md`

**Recommendation:** Keep these separate!

- **`apps/docs/docs/`** → User-facing documentation (how to use Cronicorn as a product)
  - Concepts, quick starts, API references, guides
  - Target: users configuring jobs via UI or API

- **`docs/technical/`** → System logic documentation (how Cronicorn works internally)
  - Architecture, scheduling logic, AI behavior
  - Target: power users, AI agents, developers integrating deeply

The technical docs explain "how the system thinks" so users can predict and optimize behavior. They're the bridge between "I can create a job" and "I understand how to orchestrate complex workflows."

---

## Writing Style: Prose Over Code

### ❌ Don't do this:
```typescript
function planNextRun(now, endpoint, cron) {
  if (aiInterval && aiOneShot) {
    chosen = earliest(aiInterval, aiOneShot)
  } else if (aiInterval) {
    chosen = aiInterval
  }
  // ... 30 more lines
}
```

### ✅ Do this instead:

> "The governor evaluates three types of scheduling inputs: the baseline schedule you configured, any active AI hints, and the endpoint's current state. It builds candidate times for each and then selects one using a priority system.
>
> When both AI interval and one-shot hints are active, they compete with each other but the baseline is ignored entirely. This makes sense - if AI has suggested both a recurring interval adjustment and a specific next run time, those are the most recent, data-driven recommendations. We pick whichever would run sooner.
>
> When only an AI interval hint is active, it completely overrides the baseline. This is the key to adaptive scheduling. Your baseline might say 'every 5 minutes,' but if AI detects load increasing, it can tighten that to 'every 30 seconds' for the next hour. The baseline doesn't compete - the AI hint wins. This override behavior is what allows the system to adapt to real-time conditions while still returning to your baseline when the hint expires.
>
> When only a one-shot hint is active, it competes with the baseline. Whichever would run sooner wins. This makes sense for one-time adjustments - if AI suggests running at 2:30pm but your baseline says 2:00pm, the baseline wins and you run at 2:00pm. If AI suggests 'run now' and your baseline is 30 minutes away, the one-shot wins..."

**Notice:**
- Explains the "why" behind each rule
- Uses concrete examples
- Flows as a story
- No code syntax to parse

---

## Migration Plan

### Step 1: Create the 6 New Documents (8-12 hours)
- Write each document in prose, extracting content from TECHNICAL_SYSTEM_EXPLANATION.md
- Focus on natural language explanations
- Include real-world examples and scenarios
- Add TL;DR summaries at the top of each

### Step 2: Add Frontmatter and Cross-Links (2-3 hours)
```yaml
---
title: "How Scheduling Works"
description: "Deep-dive into the Governor's decision logic and execution flow"
tags: ["scheduling", "governor", "execution"]
target_audience: "power users, AI agents"
prerequisites: ["system-architecture"]
related: ["how-ai-adaptation-works", "configuration-and-constraints"]
---
```

### Step 3: Create Index/Navigation (1-2 hours)
- Create `docs/technical/README.md` with:
  - Overview of the technical docs
  - Recommended reading order
  - Quick navigation by topic
  - Links to user-facing docs

### Step 4: Archive Old Doc (30 min)
- Rename TECHNICAL_SYSTEM_EXPLANATION.md → `_ARCHIVE_TECHNICAL_SYSTEM_EXPLANATION.md`
- Add note at top pointing to new structure
- Keep for reference/verification

### Step 5: Update MCP Server (2-3 hours)
- Configure MCP server to serve the 6 technical docs as resources
- Test retrieval with sample queries
- Verify AI agents can find relevant content

**Total Effort: 14-21 hours** (2-3 days of focused work)

---

## Success Criteria

✅ **Completeness:** All critical system logic explained (nothing missing from original)

✅ **Clarity:** Someone who's never seen the code can understand how scheduling works

✅ **Usability:** AI agent asked "how does the governor work?" gets the right doc

✅ **Practicality:** Users learn how to build multi-endpoint workflows from examples

✅ **Maintainability:** Updating a doc when code changes takes <30 minutes

✅ **No Code Blocks:** All algorithms explained in prose (schemas/examples OK)

---

## Document Ownership

| Document | Primary Topic | Who Benefits Most |
|----------|---------------|-------------------|
| system-architecture | Big picture | First-time learners, AI agents needing context |
| how-scheduling-works | Execution & Governor | Users debugging "why didn't it run?" |
| how-ai-adaptation-works | AI behavior | Users optimizing response bodies |
| coordinating-multiple-endpoints | Workflows | Users building complex orchestrations |
| configuration-and-constraints | Settings | Users configuring new endpoints |
| reference | Quick lookup | Everyone, for specific details |

---

## Next Steps

1. **Get approval** on this 6-document structure
2. **Write one document first** (suggest starting with `system-architecture.md`) to validate approach
3. **Get feedback** before writing remaining 5
4. **Complete all 6** documents
5. **Update MCP server** integration
6. **Celebrate** 🎉 having excellent technical docs

---

## Alternative: Even Smaller (4 Documents)

If 6 still feels like too much, we could consolidate to 4:

1. **`architecture-and-concepts.md`** - Merge architecture + core concepts
2. **`scheduling-and-ai-system.md`** - Merge scheduling + AI (how the whole system works)
3. **`coordination-patterns.md`** - Multi-endpoint examples and patterns
4. **`reference.md`** - Glossary, schema, config defaults

This might be too consolidated though - each would be 1500+ words.

**Recommendation: Stick with 6** - it's the sweet spot between maintainability and comprehensiveness.
