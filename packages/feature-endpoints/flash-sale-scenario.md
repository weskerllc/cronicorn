# The Flash Sale Scenario: Intelligent E-commerce Monitoring

> **Watch your monitoring system get smarter under pressure** — A showcase of adaptive scheduling in action

---

## Why This Matters

Traditional monitoring systems treat every moment the same. They check your server health every 5 minutes at 3 AM when nobody's shopping, and they check every 5 minutes during Black Friday when 10,000 customers are trying to checkout simultaneously.

**That's wasteful during quiet times and dangerous during busy ones.**

Our AI-driven scheduler adapts in real time. It notices when things get busy, tightens monitoring automatically, investigates problems intelligently, attempts recovery before bothering humans, and only escalates when truly necessary.

This scenario simulates a 40-minute flash sale where traffic surges 5× normal levels, pages slow down, the database struggles, and our scheduler orchestrates a coordinated response across 10 different monitoring endpoints.

---

## The Story: Black Friday Sale Goes Live

Your e-commerce store is about to launch a major flash sale. At exactly minute 5, you announce it on social media and traffic explodes.

**What happens next is where the magic begins.**

### The 10 Monitoring Endpoints

Think of these as different "workers" watching different parts of your system, each with its own job:

#### **🩺 Health Check Tier** (Always Running)

These three endpoints are your basic vitals — they always run, but speed up when things get busy:

1. **`traffic_monitor`** — Tracks how many visitors per minute and page load times
   - _Baseline_: Checks every 5 minutes during normal hours
   - _Surge behavior_: Tightens to every 30 seconds when traffic spikes

2. **`order_processor_health`** — Monitors checkout system performance
   - _Baseline_: Checks every 3 minutes
   - _Strain behavior_: Tightens to every 45 seconds when orders slow down

3. **`inventory_sync_check`** — Ensures stock counts stay accurate
   - _Baseline_: Checks every 10 minutes (inventory doesn't change that fast)
   - _Lag behavior_: Tightens to every 2 minutes if sync falls behind

**Technical note:** These use `propose_interval` hints to dynamically adjust cadence while respecting min/max clamps (20s minimum, 15m maximum). The scheduler's governor picks the tightest active interval.

---

#### **🔍 Investigation Tier** (Conditional)

These only wake up when the health checks detect problems:

4. **`slow_page_analyzer`** — Identifies which pages are lagging
   - _Default_: Asleep (paused)
   - _Activation_: Wakes and runs every 2 minutes when traffic is high AND pages are slow
   - _Dependencies_: Only runs if `traffic_monitor` shows issues

5. **`database_query_trace`** — Finds slow database operations
   - _Default_: Asleep (paused)
   - _Activation_: Fires a one-shot investigation when orders are struggling AND slow pages detected
   - _Dependencies_: Requires both order processor issues AND page analyzer findings

**Technical note:** These use `pause_until` to stay dormant, then combine `propose_next_time` (one-shots) with `propose_interval` for ongoing investigation. This demonstrates conditional activation based on other endpoint results.

---

#### **🔧 Recovery Tier** (Automatic Fixes)

These try to solve problems before bothering humans:

6. **`cache_warm_up`** — Pre-loads popular products into fast memory
   - _Default_: Asleep
   - _Trigger_: One-shot execution when page analyzer identifies slow product pages
   - _Effect_: Speeds up subsequent page loads by 60-80%
   - _Cooldown_: 15 minutes (caching is expensive)

7. **`scale_checkout_workers`** — Adds more checkout processing capacity
   - _Default_: Asleep
   - _Trigger_: One-shot when order backlog forms OR database is overloaded
   - _Effect_: Increases throughput, reduces queue time
   - _Cooldown_: 20 minutes (infrastructure changes take time)

**Technical note:** Recovery actions use one-shot scheduling to avoid repeated expensive operations. Success/failure is tracked in metrics to inform alert priority. This showcases the scheduler's ability to coordinate complex dependencies: "Only scale if investigation found the cause."

---

#### **📢 Alert Tier** (Human Communication)

Smart escalation — only tell humans what they need to know, when they need to know it:

8. **`slack_operations`** — Quick heads-up to the tech team
   - _Default_: Asleep
   - _Trigger_: One-shot when traffic surge first detected
   - _Message_: "🚨 Flash sale traffic up 5×, monitoring tightened"
   - _Cooldown_: 10 minutes (don't spam the channel)

9. **`slack_customer_support`** — Alerts support team about user-facing issues
   - _Default_: Asleep
   - _Trigger_: One-shot if problems persist for 15+ minutes without recovery
   - _Message_: "⚠️ Checkout delays detected. Auto-scaling attempted. Be ready for customer questions."
   - _Cooldown_: 15 minutes
   - _Smart logic_: Doesn't fire if recovery succeeds within first 15 minutes

10. **`emergency_oncall_page`** — Wakes up the on-call engineer
    - _Default_: Asleep
    - _Trigger_: One-shot if recovery attempts fail OR checkout is completely broken
    - _Message_: "🔴 URGENT: Checkout critical. Auto-recovery failed. Manual intervention needed."
    - _Cooldown_: 2 hours (this is serious — only for real emergencies)
    - _Smart logic_: Only fires after cache_warm_up AND scale_workers both attempted

**Technical note:** Alerts demonstrate hierarchical cooldowns and cross-endpoint dependencies. Emergency page checks recovery attempt history before firing. This prevents alert fatigue while ensuring critical issues reach humans.

---

## The Timeline: What Happens When

### **Minutes 0-4: Baseline** 🟢

_Everything is calm. Normal monitoring._

- Traffic: 1,000 visitors/min
- Page load: 800ms average
- Orders: 40/min
- **Behavior**: All health checks run at baseline intervals. Investigation, recovery, and alert endpoints remain paused.

**Scheduler demonstrates:** Efficient baseline with minimal overhead.

---

### **Minutes 5-8: Surge Begins** ⚠️

_Sale announced! Traffic spikes 5×._

- Traffic: 5,000 visitors/min (5× increase)
- Page load: 1,800ms (starting to slow)
- Orders: 180/min (4.5× increase)
- **Behavior**:
  - `traffic_monitor` tightens to 30s intervals
  - `order_processor_health` tightens to 45s
  - `slack_operations` fires first alert: "Traffic surge detected"
  - Investigation tier stays asleep (pages slow but not critical yet)

**Scheduler demonstrates:** Rapid cadence adaptation without human input. First alert sent with 10-minute cooldown starting.

---

### **Minutes 9-12: System Strain** 🟡

_Pages slowing significantly. Database struggling._

- Traffic: 5,500 visitors/min (still climbing)
- Page load: 3,200ms (slow)
- Orders: 160/min (dropping despite high traffic — bad sign)
- Database: Query time 850ms (normal is 120ms)
- **Behavior**:
  - `slow_page_analyzer` wakes up, starts 2-minute investigations
  - First analysis identifies product detail pages as bottleneck
  - `database_query_trace` fires one-shot when order processor + page analyzer both signal problems
  - `cache_warm_up` triggers (one-shot) after page analyzer findings
  - All health checks remain at tight cadences

**Scheduler demonstrates:** Conditional activation chain (health → investigation → recovery). Multiple endpoints coordinating based on each other's results.

---

### **Minutes 13-20: Critical Period** 🔴

_Checkout degraded. Recovery attempts in progress._

- Traffic: 6,000 visitors/min (peak)
- Page load: 4,500ms (very slow despite cache warm-up)
- Orders: 120/min (significantly degraded)
- Database: Query time 1,200ms (overloaded)
- **Behavior**:
  - `scale_checkout_workers` fires (one-shot) — adding capacity
  - `slack_customer_support` fires after 15 minutes of sustained issues
  - `database_query_trace` continues finding slow queries
  - Health checks remain aggressive
  - Emergency page is _considered_ but not fired yet (recovery in progress)

**Scheduler demonstrates:**

- Recovery attempts before emergency escalation
- Alert hierarchy (ops → support → emergency)
- Cooldowns preventing alert spam
- One-shot vs interval strategies for expensive operations

---

### **Minutes 21-25: Recovery Begins** 🟡

_Scale-up taking effect. Metrics improving._

- Traffic: 5,200 visitors/min (stabilizing)
- Page load: 2,800ms (improving thanks to cache + scale-up)
- Orders: 175/min (recovering)
- Database: Query time 650ms (better)
- **Behavior**:
  - Investigation endpoints still active but seeing improvement
  - `emergency_oncall_page` never fired (recovery succeeded!)
  - Health checks remain tight but will relax soon
  - All alerts in cooldown (no new notifications)

**Scheduler demonstrates:** Self-healing system. Recovery success prevents emergency escalation.

---

### **Minutes 26-40: Back to Normal** 🟢

_Traffic normalizing. Monitoring relaxing._

- Traffic: 1,500 visitors/min (declining)
- Page load: 1,100ms (nearly normal)
- Orders: 50/min (normal)
- Database: Query time 180ms (normal)
- **Behavior**:
  - `traffic_monitor` gradually relaxes back to 3-5 minute intervals
  - `order_processor_health` returns to baseline
  - Investigation endpoints go back to sleep (paused)
  - Recovery endpoints reset cooldowns
  - Alert endpoints remain paused

**Scheduler demonstrates:** Graceful recovery. System returns to efficient baseline automatically.

---

## What This Showcases

### For Non-Technical Audiences

✅ **It gets smarter when busy** — Monitoring tightens automatically during surges, relaxes during quiet times
✅ **It investigates before panicking** — Runs diagnostics only when needed, not constantly
✅ **It tries to fix itself first** — Automatic cache warming and scaling before waking humans
✅ **It only bothers people when necessary** — Smart alert hierarchy with cooldowns prevents noise
✅ **It knows when to relax** — Returns to baseline after recovery without manual intervention

### For Technical Audiences

🔧 **Adaptive cadence** — `propose_interval` hints dynamically adjust check frequencies based on real-time conditions
🔧 **Dependency chains** — Investigation tier only activates when health tier detects issues; recovery only runs after investigation identifies root cause
🔧 **One-shot vs intervals** — Expensive operations (trace, cache, scale) use `propose_next_time` for single execution; monitoring uses intervals
🔧 **Coordinated cooldowns** — Each alert tier has different cooldown windows; emergency alerts check recovery attempt history before firing
🔧 **Governor integration** — All hints respect min/max clamps; scheduler picks tightest valid interval; pause overrides everything
🔧 **State-driven planning** — Planner logic reads metrics from other endpoints, tracks cooldown state, counts recovery attempts
🔧 **No hardcoded schedules** — Every timing decision is a hint that expires; system returns to baseline naturally

---

## The Technical Elegance

### Why This Is Hard (And Why Our Scheduler Solves It)

**The Traditional Approach:**

```yaml
# cron-style configuration
traffic_monitor: "*/5 * * * *" # every 5 minutes, always
page_analyzer: "*/10 * * * *" # every 10 minutes, always
alert_ops: "*/30 * * * *" # every 30 minutes, always
```

**Problems:**

- Wastes resources during quiet times
- Too slow during crises
- No coordination between checks
- Alert fatigue from constant notifications
- Manual intervention required to change timing

**Our Adaptive Approach:**

```typescript
// AI hints + governor coordination
if (traffic > threshold && pageLoad > 2000) {
  await propose_interval(trafficMonitor, 30_000, "Traffic surge");
  await pause_until(pageAnalyzer, null, "Activate investigation");
  await propose_next_time(slackOps, 5_000, "First alert");
}
```

**Wins:**
✅ Changes take effect immediately (nudge + hints)
✅ Each endpoint adapts independently but coordinates through shared metrics
✅ Expensive operations run once (one-shot) instead of repeatedly
✅ Cooldowns built into planning logic, not hardcoded
✅ System recovers to baseline without manual reset

---

## Architecture Highlights

### The Four-Tier Pattern

```
┌─────────────────────────────────────────┐
│   ALERT TIER (human communication)      │
│   ↑ Depends on recovery history         │
├─────────────────────────────────────────┤
│   RECOVERY TIER (automatic fixes)       │
│   ↑ Depends on investigation findings   │
├─────────────────────────────────────────┤
│   INVESTIGATION TIER (root cause)       │
│   ↑ Depends on health signals           │
├─────────────────────────────────────────┤
│   HEALTH TIER (continuous monitoring)   │
│   ↑ Always running, adapts to load      │
└─────────────────────────────────────────┘
```

Each tier:

1. Reads metrics/state from previous tier
2. Makes autonomous scheduling decisions via tools
3. Writes results that next tier can consume
4. Respects its own cooldowns/clamps

**No central coordinator needed.** The scheduler's governor + hint system provides the coordination layer.

---

## Running The Simulation

```bash
# From packages/feature-endpoints/
pnpm sim
```

**Output includes:**

- Per-minute snapshots showing traffic, orders, page load, active investigations
- Phase breakdowns (Baseline → Surge → Strain → Critical → Recovery)
- Alert timeline with cooldown tracking
- Recovery attempt history
- Assertions verifying expected behaviors

**Expected results:**

- 10 total endpoints
- ~150-200 total runs (health checks dominate)
- 3-5 investigation runs (only during strain)
- 2-3 recovery attempts (cache + scale)
- 2-3 alerts (ops + support, no emergency page)
- Fastest cadence: 30s (traffic monitor during surge)
- Longest cooldown: 2 hours (emergency page, unused)

---

## Extending This Scenario

Want to add more complexity? Try:

- **Geographic regions**: Multiple `traffic_monitor` endpoints (US, EU, APAC) with region-specific surge patterns
- **Payment gateway monitoring**: Track Stripe/PayPal success rates, fail over automatically
- **Customer segmentation**: VIP customers get priority during high load
- **Business hours awareness**: Tighten monitoring 9am-5pm, relax at night
- **Seasonal patterns**: Black Friday vs normal Tuesday

The beauty of this architecture: **each new endpoint is independent.** Add it, write its planning logic, let it coordinate through shared metrics. No refactoring of existing endpoints required.

---

## The Bigger Picture

This flash sale scenario demonstrates a fundamental shift in how we think about scheduled tasks:

**Old paradigm:** "Run this job every N minutes forever"
**New paradigm:** "Monitor this condition, adapt the check frequency dynamically, coordinate with related tasks, alert only when recovery fails"

The AI-driven scheduler isn't just "cron with extra steps" — it's a coordination layer that lets your monitoring system make intelligent decisions in real time, without hardcoded logic or manual intervention.

**And it all happens through three simple tools:**

1. `propose_interval` — "Run every N ms until I tell you otherwise"
2. `propose_next_time` — "Run once at time T"
3. `pause_until` — "Stay quiet until condition X"

Everything else — the cascading intelligence, the cooldown coordination, the adaptive cadence — emerges from how endpoints use these primitives to coordinate through shared state.

---

## Next Steps

1. **Run the simulation**: See the full timeline and output
2. **Read the architecture doc**: Understand the scheduler internals
3. **Explore the code**: Start with `src/sim/scenarios.ts`
4. **Build your own scenario**: Use the flash sale as a template

Questions? Check `ai-scheduler-architecture.md` for deep technical details.
