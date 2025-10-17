# Cronicorn: Intelligent Job Scheduling That Adapts to Your Reality

## The Problem We Solve

Your services don't run in a vacuum. Traffic surges, systems slow down, databases struggle under load, and APIs have temporary issues. Traditional job schedulers treat every moment the same—running your monitoring, health checks, and automation on rigid schedules regardless of what's actually happening.

This creates two painful scenarios:

1. **During quiet periods**: You waste resources checking everything obsessively when nothing is wrong
2. **During critical moments**: You monitor at the same slow pace when you desperately need faster visibility

**You need a scheduler that thinks, not just ticks.**

---

## What Cronicorn Does

Cronicorn is an intelligent HTTP job scheduler that **adapts to real-time conditions**. It watches how your endpoints perform and automatically adjusts monitoring frequency, activates investigation tools, attempts recovery, and escalates alerts only when human intervention is truly needed.

Think of it as having an experienced DevOps engineer monitoring your systems 24/7—someone who knows when to check more frequently, when to dig deeper, when to take corrective action, and when to wake up the team.

---

## How It Works (The Simple Version)

### 1. You Define Your Jobs

Set up HTTP endpoints you want to run on a schedule:

- **Health checks** - Monitor your APIs, databases, and services
- **Data pipelines** - ETL jobs, data syncing, report generation  
- **Automation tasks** - Cache warming, cleanup jobs, batch processing
- **Alert workflows** - Notification systems, escalation chains

Each job gets a baseline schedule (like "every 5 minutes" or a cron expression).

### 2. Cronicorn Executes & Learns

Our scheduler runs your jobs and tracks performance:

- ✅ Success rates
- ⏱️ Response times  
- 📊 Historical patterns
- 🔄 Recent trends

### 3. AI Adapts the Schedule

When patterns emerge, our AI makes smart adjustments:

**High failure rate?** → Reduce frequency to give systems time to recover  
**Traffic spike detected?** → Tighten monitoring intervals for better visibility  
**Persistent issues?** → Activate investigation endpoints that usually stay paused  
**Service recovering?** → Gradually relax monitoring back to baseline

### 4. Coordinated Response

Unlike simple schedulers, Cronicorn orchestrates **intelligent workflows**:

```
Health Check Detects Issue
         ↓
Investigation Tool Activates (was paused)
         ↓
Root Cause Identified
         ↓
Auto-Recovery Attempted
         ↓
Smart Alerts (only if recovery fails)
```

This means **fewer false alarms** and **faster resolution** without waking your team at 3 AM for issues that fix themselves.

---

## Real-World Example: E-Commerce Flash Sale

Imagine you're running a Black Friday sale. Here's how Cronicorn adapts:

### Before the Sale (Baseline Operation)
- Traffic monitor: Every 5 minutes
- Order processing: Every 3 minutes  
- Page analyzers: **Paused** (not needed)
- Cache warming: **Paused** (not needed)
- Alerts: **Paused** (not needed)

### Sale Launches - Traffic Surges 5×

**Cronicorn automatically:**

1. **Tightens monitoring** (5min → 30sec) for real-time visibility
2. **Alerts operations team** with a quick heads-up (Slack notification)
3. **Activates page analyzer** (was paused) to identify slow pages
4. **Warms cache** for slow products (one-shot recovery action)
5. **Monitors recovery** and gradually relaxes intervals as performance stabilizes

### What You Didn't Have to Do

❌ Manually adjust monitoring frequencies  
❌ Remember to activate investigation tools  
❌ Trigger cache warming yourself  
❌ Get paged for issues that resolved automatically  
❌ Deal with notification spam during recovery

**Everything adapts automatically while keeping you informed at the right level.**

---

## Key Benefits

### 🧠 **Intelligent, Not Just Scheduled**

Stop treating every moment the same. Cronicorn adjusts to actual conditions, giving you **tight monitoring when it matters** and **relaxed checks during calm periods**.

### 💰 **Reduced Operational Costs**

- **Fewer false alarms** = Less alert fatigue
- **Automatic recovery** = Less manual intervention  
- **Optimized monitoring** = Lower API costs
- **Conditional activation** = Only run expensive analysis when needed

### ⚡ **Faster Issue Resolution**

Detect problems earlier with adaptive intervals, identify root causes with automated investigation, and attempt recovery before escalating to humans.

### 🔧 **Zero Maintenance Scheduling**

Set your baseline schedules once. Cronicorn handles the rest—no complex rules to maintain, no schedules to adjust manually, no runbooks to follow.

### 📈 **Scales With Your Complexity**

Works for simple monitoring (single health check) or sophisticated orchestration (10+ coordinated endpoints across health → investigation → recovery → alerts).

---

## Perfect For

### DevOps & Site Reliability Teams

Adaptive infrastructure monitoring with auto-remediation that tries pod restarts, cache flushes, and scaling before paging oncall.

### E-Commerce Platforms

Handle traffic surges intelligently with automatic monitoring adjustments, performance analysis, and proactive cache optimization.

### Data Engineering

Coordinate ETL pipelines where extraction completes → transformation activates → loading triggers downstream—all with adaptive intervals based on data volume.

### SaaS Companies

Track usage, enforce quotas, run billing cycles, and send usage alerts that increase frequency as customers approach limits.

### Web Scraping & Data Collection

Respect rate limits with adaptive slowdown, pause on validation failures, and adjust intervals based on proxy pool health.

---

## How It's Different

### Traditional Cron/Schedulers
❌ Fixed intervals regardless of conditions  
❌ No awareness of success/failure patterns  
❌ Manual investigation and recovery  
❌ Rigid workflows  
❌ Alert spam during incidents

### Cronicorn
✅ Adaptive intervals based on real-time signals  
✅ AI learns from execution patterns  
✅ Automated investigation and recovery  
✅ Coordinated multi-tier workflows  
✅ Smart escalation with appropriate cooldowns

---

## Getting Started is Simple

### 1. Sign Up & Get Your API Key

Create an account and receive your authentication credentials.

### 2. Define Your First Job

```bash
curl -X POST https://api.cronicorn.com/v1/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Health Monitor",
    "endpoints": [{
      "name": "API Latency Check",
      "url": "https://your-api.com/health",
      "method": "GET",
      "baselineIntervalMs": 300000,
      "minIntervalMs": 30000,
      "maxIntervalMs": 900000
    }]
  }'
```

### 3. Watch It Adapt

Monitor your dashboard as Cronicorn executes jobs and learns patterns. See AI adjustments in real-time with clear explanations for every decision.

### 4. Add Coordination (Optional)

Expand from simple scheduling to intelligent workflows by adding investigation, recovery, and alert tiers.

---

## Transparent AI Decisions

Every AI adjustment includes a **clear reason**:

- "Traffic surge detected - tightening monitoring to 30 seconds"
- "3 consecutive failures - scheduling immediate investigation"
- "High failure rate - pausing for 1 hour to allow recovery"

You always know **why** the scheduler made a decision, not just **what** it did.

---

## Pricing That Makes Sense

We're in early access. Get started today and help shape the product.

**Early Access Benefits:**
- 🎯 Direct input into feature development
- 💬 Priority support from our founding team
- 🔒 Locked-in pricing when we launch publicly
- 🚀 Access to advanced features before everyone else

[**Request Early Access →**](https://cronicorn.com/early-access)

---

## Built by Engineers, For Engineers

Cronicorn was born from real frustration: managing production systems that needed different monitoring frequencies at different times. We were tired of:

- Being paged for issues that would resolve themselves
- Missing critical signals because we were checking too slowly
- Manually adjusting monitoring schedules during incidents
- Fighting alert fatigue from notification spam

So we built the scheduler we wished existed—one that **adapts like a human operator would**, but runs 24/7 without getting tired.

---

## Frequently Asked Questions

### What types of jobs can I schedule?

Anything triggered by HTTP requests:
- API health checks and monitoring
- Webhook calls to third-party services
- Data pipeline triggers
- Notification workflows
- Batch processing jobs
- Cache warming operations
- Automated testing

### How does AI make scheduling decisions?

The AI analyzes execution patterns (success rate, response time, failure streaks) and applies proven strategies:
- Increase monitoring frequency when metrics deteriorate
- Pause endpoints during persistent failures to avoid waste
- Activate investigation tools when health checks detect issues
- Schedule immediate retries after failure streaks
- Gradually relax monitoring as systems recover

### Can I disable AI and use fixed schedules?

Absolutely. You can:
- Use Cronicorn as a traditional scheduler with fixed intervals
- Enable AI only for specific endpoints
- Set strict min/max bounds that AI respects
- Review all AI suggestions before they apply (coming soon)

### What happens if the AI makes a bad decision?

AI hints have **time-to-live (TTL)** and automatically expire. Plus:
- You set min/max intervals that AI cannot violate
- Manual overrides always take priority
- Dashboard shows all AI decisions with explanations
- You can pause endpoints manually anytime

### How reliable is the scheduler?

- **Distributed architecture** - Multiple workers for redundancy
- **Idempotent execution** - Safe retries without duplicates
- **Graceful degradation** - Scheduler works even if AI worker is down
- **Transaction guarantees** - Job claims use database locks to prevent duplicates

### How do you handle authentication?

Two options:
- **API Keys** - Simple token-based auth for server-to-server
- **OAuth 2.0** - Secure user authentication via GitHub (more providers coming)

### Can I self-host?

We're focused on our managed service during early access, but self-hosting is on our roadmap. Join our early access program to influence priorities.

---

## What Our Early Users Say

> *"We went from manually adjusting our monitoring dashboards during incidents to just letting Cronicorn handle it. It tightens checks when we need visibility and relaxes when things calm down. Feels like having an extra engineer on the team."*
> 
> — DevOps Lead, SaaS Startup

> *"The coordinated workflows are a game-changer. Our flash sale monitoring used to require manual coordination—now health checks trigger investigation, which triggers auto-recovery, which only alerts us if nothing works. We sleep better."*
> 
> — Platform Engineer, E-Commerce

> *"Finally, a scheduler that doesn't wake us up at 3 AM for every transient error. The AI learns what's a real problem versus what resolves itself."*
> 
> — SRE, Financial Services

---

## Ready to Stop Fighting Your Scheduler?

Let Cronicorn adapt to your reality instead of forcing your operations into rigid time slots.

[**Get Early Access**](https://cronicorn.com/early-access) • [**View Documentation**](https://docs.cronicorn.com) • [**See Examples**](https://cronicorn.com/examples)

---

## Technical Deep Dive (For the Curious)

### Clean Architecture

Cronicorn uses **hexagonal architecture** with clear boundaries:

- **Domain Layer** - Pure scheduling logic, no infrastructure dependencies
- **Ports** - Interface contracts defining capabilities  
- **Adapters** - Infrastructure implementations (HTTP, database, AI SDK)
- **Composition Roots** - Apps that wire everything together

This means **rock-solid reliability** and **easy extensibility** as your needs grow.

### Decoupled AI Worker

The AI analysis worker runs independently from job execution:

- **Scheduler Worker** - Executes jobs on schedule (fast, lightweight)
- **AI Planner Worker** - Analyzes patterns and writes hints (separate process)
- **Database Integration** - Workers communicate via shared state

**Result:** If AI goes down, jobs keep running. If scheduler restarts, AI keeps learning. Each scales independently.

### Smart Execution

- **Lease-based claiming** - Distributed workers coordinate via database locks
- **Jitter & backoff** - Prevents thundering herd problems  
- **Idempotent runs** - Safe retries without duplication
- **Transaction-per-execution** - Atomicity guarantees

### Observable by Default

- **Structured logging** - Every decision and execution logged with context
- **Execution history** - Complete audit trail of all runs  
- **AI reasoning** - Clear explanations for every adjustment
- **Real-time dashboard** - Watch adaptive behavior in action

---

**Questions?** Reach out at [support@cronicorn.com](mailto:support@cronicorn.com) or [join our community](https://community.cronicorn.com).

We're here to help you build better, more adaptive operations.
