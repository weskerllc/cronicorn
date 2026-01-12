# Cronicorn Demo Walkthrough Guide

**Purpose:** This guide maps the demo video rubric to the seeded dashboard, showing exactly what to show and say at each moment.

**Seeded Data Summary:**
- **Timeline:** 7 days (Days 1-3 baseline, Day 4 Black Friday 08:00-20:00, Days 5-7 recovery)
- **11 Endpoints:** 4 tiers (Health, Investigation, Recovery, Alert)
- **~20,000 Runs:** Color-coded by source (green=baseline, blue=AI interval, purple=one-shot, orange=clamped)
- **22 AI Sessions:** 6 baseline monitoring (Days 1-3) + 15 Black Friday adaptations (Day 4) + 1 post-event
- **Visual Story:** Centered peak on Day 4 creates symmetric before/during/after visualization

---

## SHOT 1: Hook & Problem (0-12 seconds)

### What You Say:
> "Your workload just spiked. Could be a traffic surge, a live event, maybe a pipeline going nuts. But your scheduled jobs? They're still running every 5 minutes like nothing happened."

### What You Show:

**Dashboard View:** Home Dashboard (`/dashboard`)

**Navigation:**
1. Start with full 7-day timeline visible
2. Pan to Day 4, 08:00-20:00 (Black Friday window)
3. Zoom into mid-morning peak (10:00-12:00)

**What's Visible:**
- **Timeline spikes dramatically** at Day 4, 08:00 (all-day peak)
- **Centered visualization:** Days 1-3 baseline → Day 4 peak → Days 5-7 recovery
- **Color change:** Green baseline dots → Blue/Orange/Purple dots (AI taking over)
- **Run density increases** visibly across entire day (dots cluster tighter)
- **Endpoint Activity charts** show sustained high activity for 12 hours

**Specific Numbers to Highlight:**
- Baseline: ~1,000 visitors/min (Days 1-3)
- Black Friday peak: ~6,000 visitors/min (6x increase at 10am-2pm)
- Page load: 800ms → 4,500ms (5.6x slower at peak)

**On-Screen Text Overlays:**
```
Workload: 6x increase
Scheduled jobs: Still every 5 minutes
Static schedules can't adapt
```

**Pro Tips:**
- Keep this shot fast-paced and dramatic
- Don't explain anything yet—just show the problem
- The visual should feel overwhelming (lots of activity)

---

## SHOT 2: Solution Introduction (12-27 seconds)

### What You Say:
> "Meet Cronicorn. It's a job scheduler that actually adapts to what's happening. Instead of rigid schedules, it watches your workload and adjusts on the fly. Things heating up? It tightens. Things calm down? It backs off. And here's the thing—every decision is transparent. You're always in control."

### What You Show:

**Dashboard View:** Full 7-Day Timeline Overview

**Navigation:**
1. Show Cronicorn logo briefly (2 seconds)
2. Zoom out to show complete 7-day timeline
3. Slow pan from left (Day 1) → center (Day 4) → right (Day 7)

**What's Visible:**
- **Days 1-3:** Steady green baseline dots (normal operations)
- **Day 4, 08:00-20:00:** Blue, orange, purple dots (AI adaptation across 12 hours)
- **Days 5-7:** Return to green baseline dots (recovery)
- **Source attribution visible** in timeline colors
- **Centered peak:** Black Friday perfectly centered creates symmetric visual story

**Color Legend (add as annotation):**
- 🟢 **Green dots** = Baseline interval (your original schedule)
- 🔵 **Blue dots** = AI-adjusted interval (tightened/loosened)
- 🟣 **Purple dots** = AI one-shot action (recovery/alert)
- 🟠 **Orange dots** = Clamped to min/max (boundary enforced)

**Specific Patterns to Highlight:**
- 3 days of stability before event (credibility + allows centered visualization)
- AI responds progressively throughout 12-hour day (not just one spike)
- Gradual return to baseline Days 5-7 (automatic reversion after hints expire)
- Symmetric visual story: 3 days before, 1 day peak, 3 days after

**On-Screen Text Overlays:**
```
Schedules adapt to what's happening
Every decision explained
You set the boundaries
```

**Pro Tips:**
- This shot establishes trust (5 days of baseline = we're not making this up)
- Point out the automatic reversion (hints expire after 60 min)
- Emphasize transparency: every color change = AI decision

---

## SHOT 3A: Baseline Credibility (27-35 seconds)

### What You Say:
> "Let's see it in action. This is a monitoring job tracking an e-commerce site. For three days, everything's smooth. Baseline schedule, checking every minute. 98% success rate. Nice and calm."

### What You Show:

**Dashboard View:** Traffic Monitor Endpoint Details

**Navigation:**
1. Click "Traffic Monitor" endpoint from list
2. Show endpoint details panel
3. Scroll to show response body from Days 1-3

**Endpoint Configuration Visible:**
- **Name:** Traffic Monitor
- **Baseline Interval:** 60,000ms (1 minute)
- **Min Interval:** 20,000ms (20 seconds)
- **Max Interval:** 300,000ms (5 minutes)
- **Success Rate:** 98% (Days 1-3)

**Response Body Example (Day 2, 10:30am):**
```json
{
  "traffic": 1020,
  "ordersPerMin": 42,
  "pageLoadMs": 790,
  "inventoryLagMs": 95,
  "dbQueryMs": 118,
  "timestamp": "2025-12-31T10:30:00Z"
}
```

**Timeline View (Days 1-3):**
- Green dots evenly spaced (every 60 seconds)
- Continuous monitoring (~6,000 total runs for Traffic Monitor in 3 days)
- AI sessions show baseline monitoring (2 per day confirming normal ops)

**On-Screen Highlights:**
- Circle the baseline interval: **"1 minute baseline"**
- Arrow to response metrics: **"1,000 visitors/min, 800ms page load"**
- Success badge: **"98% success"**

**Pro Tips:**
- Emphasize the boring stability (this is good!)
- Show that baseline schedules are reliable
- Point out: "3 days of steady operations—perfect baseline"
- Mention: "Day 4 will show what happens when things change"

---

## SHOT 3B: Early Morning Surge (35-50 seconds)

### What You Say:
> "Then Black Friday hits. 8am—the sale goes live. Activity starts climbing immediately. The AI catches it and starts tightening. And here's what's cool—it shows you exactly why. 'Traffic trending upward. Monitoring closely.' This same pattern works for monitoring, scraping, pipelines... basically anything that needs to adapt."

### What You Show:

**Dashboard View:** AI Session #2 (Day 4, 08:03)

**Navigation:**
1. Pan timeline to Day 4, 08:00-10:00 (early morning surge)
2. Click on AI session marker around 08:03
3. Open **AI Session #2** details panel

**AI Session #2 Details:**

**Timestamp:** Day 4, 08:03 (3 minutes into Black Friday)

**Reasoning:**
> "Traffic trending upward (1000 → 2800 visitors/min). Monitoring closely for continued surge."

**Tool Calls Executed:**
1. `get_latest_response` → Found traffic: 2,800, pageLoadMs: 1,150
2. `get_response_history(limit: 3)` → Confirmed trend: 1,100 → 1,500 → 2,200 → 2,800
3. `submit_analysis` → Confidence: HIGH (watching but not adjusting yet)

**Metrics Visible:**
- Token usage: 890 tokens
- Duration: 320ms
- Next analysis: 08:06 (3 minutes later - AI monitoring more frequently)

**Response Body at 08:03:**
```json
{
  "traffic": 2800,
  "ordersPerMin": 95,
  "pageLoadMs": 1150,
  "inventoryLagMs": 180,
  "dbQueryMs": 240,
  "timestamp": "Day4-08:03:00Z"
}
```

**Timeline Change Visible:**
- Before 08:00: Green dots (60s apart) - baseline
- After 08:00: Dots start clustering tighter, some blue appearing
- Shows AI is watching closely, preparing to react

**On-Screen Highlights:**
- Highlight the upward trend: **"1,000 → 2,800 visitors (2.8x increase)"**
- Show AI reasoning: **"Monitoring closely for continued surge"**
- Point to next session timing: **"AI analyzing every 3 minutes now"**

**Pro Tips:**
- Emphasize this is just the beginning—"It's only 8am, wait until you see 10am"
- Show AI is being careful: watching first, then acting
- Mention: "This continues all day—15 AI sessions total"

---

## SHOT 3C: Critical Response & Multi-Tier Actions (50-68 seconds)

### What You Say:
> "Now things are getting critical. Watch how it responds. The AI maxes out at your minimum constraint. It wakes up related jobs that were paused. Triggers one-shot actions. Escalates when it needs to. All automatic. All visible."

### What You Show:

**Dashboard View:** AI Session #3 (Day 6, 12:15) + Endpoint Activity

**Navigation:**
1. Pan timeline to Day 6, 12:15 (minute 15 - critical phase)
2. Open **AI Session #3** details
3. Show endpoint list with all 4 tiers visible
4. Quick cuts between activated endpoints

**AI Session #3 Details:**

**Timestamp:** Day 6, 12:15 (critical escalation moment)

**Reasoning:**
> "CRITICAL: Page load times at 4,600ms (p95: 6,200ms). Database identified as bottleneck. Activating diagnostics and triggering recovery actions. Coordinating with sibling endpoints."

**Tool Calls Executed:**
1. `get_latest_response` → avgPageLoadMs: 4,600, bottleneck: "database"
2. `get_sibling_latest_responses` → Found 10 other endpoints in same job
   - Order Processor: ordersPerMin: 118, failureRate: 0.15
   - Inventory Sync: lagMs: 620, queueDepth: 850
3. `pause_until(null, "Resume diagnostics")` → **Unpaused Slow Page Analyzer**
4. `propose_next_time(5000, 5)` → **Triggered Cache Warmup in 5 seconds**
5. `propose_next_time(10000, 10)` → **Triggered Database Query Trace in 10s**
6. `submit_analysis` → Confidence: HIGH

**What's Happening Across Tiers:**

**Tier 1: Health (Continuous monitoring - now maxed out)**
- Traffic Monitor: 60s → 30s → **20s (MIN CONSTRAINT ENFORCED)** 🟠 Orange dots
- Order Processor Health: 120s → 60s → **30s** 🔵 Blue dots
- Inventory Sync Check: 180s → 90s → **60s** 🔵 Blue dots

**Tier 2: Investigation (Activated from paused state)**
- Slow Page Analyzer: **PAUSED → ACTIVE** (purple activation dot at 12:15)
  - First run in 5 days (was dormant)
  - Response shows: avgPageLoadMs: 4,600, p95: 6,200, bottleneck: "database"
- Database Query Trace: **PAUSED → ACTIVE** (purple activation dot at 12:15)
  - Response shows: slowestQuery: 2,400ms, activeConnections: 95

**Tier 3: Recovery (One-shot actions triggered)**
- Cache Warmup: 🟣 Purple dot at 12:15 (5 seconds after session)
- Scale Checkout Workers: 🟣 Purple dot at 12:16

**Tier 4: Alert (Escalation actions)**
- Slack Operations Alert: 🟣 Purple dot at 12:15
- Slack Customer Support Alert: 🟣 Purple dot at 12:16
- Emergency Oncall Page: 🟣 Purple dot at 12:17 (2-hour cooldown applied)
- Performance Degradation Webhook: 🟣 Purple dot at 12:15

**Response Body at Critical Peak (12:15):**
```json
{
  "traffic": 6000,
  "ordersPerMin": 120,
  "pageLoadMs": 4500,
  "inventoryLagMs": 600,
  "dbQueryMs": 1200,
  "timestamp": "2025-12-31T12:15:00Z"
}
```

**Timeline Visual:**
- Orange dots = clamped-min (constraints enforced)
- Purple burst = one-shot actions firing
- Blue dots tightening across all health tier endpoints

**On-Screen Highlights:**
- **Traffic Monitor:** "Interval: 20s (min constraint enforced)" 🟠
- **Slow Page Analyzer:** "Status: ACTIVATED (was paused)" 🟣
- **Cache Warmup:** "Triggered: One-shot recovery action" 🟣
- **Emergency Oncall:** "Paged oncall: Critical threshold" 🟣

**Split-Screen or Quick Cuts:**
1. Show Traffic Monitor clamped at 20s (orange dots)
2. Show Slow Page Analyzer activating (purple activation)
3. Show Cache Warmup one-shot (purple dot)
4. Show Emergency Oncall one-shot (purple dot)

**Pro Tips:**
- This is the most complex shot—don't rush it
- Show the endpoint tier structure (4 tiers working together)
- Emphasize: "AI coordinates across all endpoints via `get_sibling_latest_responses`"
- Point out cooldowns: "Oncall page waits 2 hours before re-paging"

---

## SHOT 3D: Recovery & Automatic Reversion (68-85 seconds)

### What You Say:
> "Things start recovering. The AI sees it and eases back to baseline. Then 60 minutes later, all the AI adjustments expire automatically. Your baseline schedule takes over again. No manual tweaking. No runaway automation. It just... adapts and gets out of your way."

### What You Show:

**Dashboard View:** AI Sessions #4, #5, #6 + Timeline Recovery

**Navigation:**
1. Pan timeline to Day 6, 12:28 (minute 28 - recovery phase)
2. Show **AI Session #4** - Recovery confirmed
3. Jump to Day 6, 13:05 (minute 65 - hint expiration)
4. Show **AI Session #5** - Hints expired
5. Pan to Day 7, 08:00 - Show **AI Session #6** - Stability confirmed

**AI Session #4 (12:28 - Recovery Phase):**

**Reasoning:**
> "Recovery confirmed. Traffic declining to 1,400/min, page load improved to 1,050ms. Loosening health checks back to 1-minute baseline. System stabilizing."

**Tool Calls:**
1. `get_latest_response` → traffic: 1400, pageLoadMs: 1050
2. `propose_interval(60000, 30)` → **Back to 1 minute (30-min TTL)**
3. `pause_until("2025-12-31T14:00:00Z")` → **Re-paused Slow Page Analyzer**
4. `submit_analysis` → Confidence: HIGH

**Timeline Change:**
- Orange/Blue dots → Green dots (baseline interval resumed)
- Investigation tier endpoints re-paused (no more purple dots)

**AI Session #5 (13:05 - Hint Expiration):**

**Reasoning:**
> "All AI scheduling hints expired (60-minute TTL from initial surge detection). Baseline schedules fully resumed. No active adjustments remaining."

**Tool Calls:**
1. `get_latest_response` → traffic: 1050, pageLoadMs: 820
2. `submit_analysis` → Confidence: HIGH (no adjustments needed)

**Timeline Change:**
- All endpoints return to baseline intervals
- No more AI-adjusted schedules active
- Color fully reverts to green (baseline-interval source)

**AI Session #6 (Day 7, 08:00 - Next Morning Stability Check):**

**Reasoning:**
> "System fully stabilized. All metrics returned to baseline ranges. Flash sale event successfully handled with zero manual intervention."

**Metrics to Show:**

**Recovery Phase (12:28):**
```json
{
  "traffic": 1400,
  "ordersPerMin": 50,
  "pageLoadMs": 1050,
  "inventoryLagMs": 140,
  "dbQueryMs": 180
}
```

**Post-Expiration (13:05):**
```json
{
  "traffic": 1050,
  "ordersPerMin": 42,
  "pageLoadMs": 820,
  "inventoryLagMs": 100,
  "dbQueryMs": 125
}
```

**Day 7 Baseline (08:00):**
```json
{
  "traffic": 1010,
  "ordersPerMin": 40,
  "pageLoadMs": 795,
  "inventoryLagMs": 95,
  "dbQueryMs": 118
}
```

**On-Screen Highlights:**
- **12:28:** "AI easing back to baseline" (blue → green transition)
- **13:05:** "60-min TTL expired - hints removed" (all green)
- **Day 7:** "Normal operations restored" (same as Days 1-5)

**Timeline Visual:**
- Show color gradient: Orange → Blue → Green
- Show density decreasing: Tight clusters → Even spacing
- Show return to baseline pattern (same as Days 1-5)

**Pro Tips:**
- Emphasize "60-minute TTL" = automatic safety valve
- Show Day 7 looks identical to Days 1-5 (full circle)
- "No manual intervention required" = hands-off recovery

---

## SHOT 4: Key Differentiators (85-95 seconds)

### What You Say:
> "So what makes this different? First, it's completely transparent. You saw exactly why every schedule changed. Second, you set the boundaries. The AI stays within your min and max constraints. And third, it works fine without AI. Your baseline schedules always run no matter what."

### What You Show:

**Dashboard View:** Endpoint Configuration + AI Sessions List

**Navigation:**
1. Show Traffic Monitor endpoint configuration panel
2. Highlight min/max/baseline interval fields
3. Show AI Sessions list with all 16 sessions visible
4. Show source attribution legend

**Endpoint Configuration Panel:**

**Traffic Monitor Settings:**
- **Baseline Interval:** 60,000ms (1 minute) ← Your default schedule
- **Min Interval:** 20,000ms (20 seconds) ← AI can't go faster than this
- **Max Interval:** 300,000ms (5 minutes) ← AI can't go slower than this
- **Current Interval:** 60,000ms (baseline - no AI adjustments active)

**AI Sessions List (All 16 Visible):**

**Baseline Sessions (Days 1-5):**
1. Day 1, 08:00 - "Initial baseline established"
2. Day 1, 20:00 - "Traffic patterns consistent"
3. Day 2, 08:00 - "Monitoring confirmed stable"
4. Day 2, 20:00 - "No action needed"
5. Day 3, 08:00 - "Order processing optimal"
6. Day 3, 20:00 - "Inventory sync normal"
7. Day 4, 08:00 - "Baseline schedules optimal"
8. Day 4, 20:00 - "All metrics within ranges"
9. Day 5, 08:00 - "Consistent performance"
10. Day 5, 20:00 - "No action required"

**Flash Sale Sessions (Day 6):**
11. 11:45 - "Normal patterns detected" (pre-sale baseline)
12. 12:06 - "Surge detected - tightening to 30s" (ADAPTATION)
13. 12:15 - "CRITICAL - activating diagnostics" (ESCALATION)
14. 12:28 - "Recovery confirmed - easing back" (RECOVERY)
15. 13:05 - "Hints expired - baseline resumed" (EXPIRATION)
16. Day 7, 08:00 - "Stability confirmed" (VERIFICATION)

**Source Attribution Legend:**
- 🟢 **Baseline Interval** (18,400 runs) - Your original schedule, always runs
- 🔵 **AI Interval** (140 runs) - AI tightened/loosened interval
- 🟣 **AI One-Shot** (35 runs) - AI triggered specific action
- 🟠 **Clamped Min/Max** (15 runs) - AI hit your boundary

**On-Screen Text:**
```
✓ Every decision explained
  → 16 AI sessions with full reasoning

✓ Min/max constraints enforced
  → AI stayed within 20s - 5min bounds

✓ Works without AI
  → 18,400 baseline runs always executed
```

**Optional Use Cases Callout (2-3 seconds):**
```
Use Cronicorn for:
• System monitoring & health checks
• Live data scraping & API fetching
• ETL pipelines & data syncing
• Webhook processing & event handling
• CI/CD workflows & deployments
```

**Pro Tips:**
- Show the actual fields users can configure
- Highlight the ratio: 18,400 baseline runs vs 190 AI-adjusted runs
- "AI is helpful, not required" = no vendor lock-in

---

## SHOT 5: Call-to-Action (95-105 seconds)

### What You Say:
> "Stop fighting rigid schedules. Whether you're monitoring systems, scraping live data, running pipelines, or orchestrating workflows—Cronicorn just adapts. Time to schedule smarter."

### What You Show:

**Dashboard View:** Final Timeline Pan + Logo + CTA

**Navigation:**
1. Zoom out to show complete 7-day timeline
2. Slow pan showing full story: baseline → surge → recovery
3. Fade to Cronicorn logo on clean background
4. CTA overlay appears

**Timeline Final Shot:**
- Full 7 days visible
- Clear visual arc:
  - Days 1-5: Steady green (credibility)
  - Day 6: Colorful burst (adaptation)
  - Day 7: Return to green (recovery)
- Success story: "6x surge handled automatically"

**Logo + CTA:**
```
━━━━━━━━━━━━━━━━━━━━━━━━
        CRONICORN
━━━━━━━━━━━━━━━━━━━━━━━━

   Get Early Access
   cronicorn.com

No credit card required
━━━━━━━━━━━━━━━━━━━━━━━━

14-day free trial
Set up in 5 minutes
```

**Pro Tips:**
- Keep final timeline shot clean (no annotations)
- Hold logo + CTA for 5-8 seconds minimum
- End on confident note: "Time to schedule smarter."

---

## Quick Reference: Dashboard Navigation Map

### Main Views You'll Use:

1. **Dashboard Home** (`/dashboard`)
   - Full timeline (7 days)
   - Endpoint activity charts
   - Recent activity stats
   - AI session count

2. **Endpoint Details Panel**
   - Click any endpoint name to open
   - Shows: name, tier, intervals (min/baseline/max)
   - Recent runs list with response bodies
   - Success rate statistics

3. **AI Sessions List** (`/dashboard/ai-sessions` or panel)
   - All 16 sessions chronologically
   - Click session to view full details
   - Tool calls, reasoning, token usage

4. **Timeline Controls**
   - Zoom: Focus on specific time ranges
   - Pan: Navigate through 7 days
   - Hover: See run details inline

### Color Coding (Source Attribution):
- 🟢 Green = baseline-interval (your schedule)
- 🔵 Blue = ai-interval (AI adjusted)
- 🟣 Purple = ai-oneshot (AI triggered action)
- 🟠 Orange = clamped-min / clamped-max (boundary hit)

### Key Numbers to Remember:
- **Baseline traffic:** ~1,000 visitors/min
- **Surge traffic:** ~6,000 visitors/min (6x)
- **Baseline page load:** ~800ms
- **Critical page load:** ~4,500ms (5.6x)
- **Total runs:** 18,590
- **AI sessions:** 16 (10 baseline + 6 flash sale)
- **Baseline interval:** 60s (1 minute)
- **Surge interval:** 30s (2x faster)
- **Critical interval:** 20s (3x faster, min constraint)
- **TTL duration:** 60 minutes
- **Recovery time:** ~28 minutes (from surge to baseline)

---

## Production Tips

### Pacing:
- SHOT 1 (Hook): Fast, dramatic, overwhelming
- SHOT 2 (Solution): Calm, establishing, credible
- SHOT 3A-D (Demo): Methodical, educational, transparent
- SHOT 4 (Differentiators): Confident, reassuring, clear
- SHOT 5 (CTA): Concise, actionable, memorable

### Voiceover Tone:
- "Senior engineer explaining to colleague"
- Conversational, not formal
- Enthusiastic but not salesy
- Technical but approachable

### What to Emphasize:
1. **Transparency:** "You see exactly why every decision was made"
2. **Control:** "You set the boundaries, AI stays within them"
3. **Safety:** "60-minute TTL, automatic reversion"
4. **Reliability:** "Baseline schedules always run"
5. **Versatility:** "Works for monitoring, scraping, pipelines..."

### Common Mistakes to Avoid:
- ❌ Don't skip the baseline credibility (Days 1-5)
- ❌ Don't explain too much technical detail
- ❌ Don't use jargon without context
- ❌ Don't show UI bugs or incomplete features
- ❌ Don't make it about the technology (make it about the value)

---

## Appendix: Seed Data Reference

### Flash Sale Timeline (Day 6):

**Phase 1: Baseline (11:45-12:00)**
- Traffic: 980-1,020 visitors/min
- Page load: 780-810ms
- AI: Monitoring, no action

**Phase 2: Surge (12:00-12:08)**
- Traffic: 1,100 → 5,100 visitors/min (surge detected)
- Page load: 850 → 1,850ms
- AI: Tightens to 30s at 12:06

**Phase 3: Strain (12:08-12:13)**
- Traffic: 5,200-5,800 visitors/min
- Page load: 2,100-3,400ms
- AI: Continues tightening, approaching min constraint

**Phase 4: Critical (12:13-12:20)**
- Traffic: 5,900-6,100 visitors/min
- Page load: 4,200-4,600ms
- AI: Maxes out at 20s (min), activates investigation, triggers recovery/alerts

**Phase 5: Recovery (12:21-12:39)**
- Traffic: 5,500 → 1,400 visitors/min (declining)
- Page load: 3,800 → 1,050ms (improving)
- AI: Eases back to baseline at 12:28

**Phase 6: Expiration (13:00-13:05)**
- Traffic: 1,200 → 1,050 visitors/min
- Page load: 950 → 820ms
- AI: All hints expire at 13:05 (60-min TTL)

**Phase 7: Stabilization (Day 7+)**
- Traffic: ~1,010 visitors/min (baseline restored)
- Page load: ~795ms (baseline restored)
- AI: Monitors at reduced frequency, confirms stability

### Endpoint Breakdown:

**Health Tier (3 endpoints - continuous monitoring):**
1. Traffic Monitor - 10,112 runs
2. Order Processor Health - 5,052 runs
3. Inventory Sync Check - 3,377 runs

**Investigation Tier (2 endpoints - conditional activation):**
4. Slow Page Analyzer - 11 runs (activated during critical phase)
5. Database Query Trace - 9 runs (activated during critical phase)

**Recovery Tier (2 endpoints - one-shot actions):**
6. Cache Warmup - 5 runs
7. Scale Checkout Workers - 5 runs

**Alert Tier (4 endpoints - escalation):**
8. Slack Operations Alert - 5 runs
9. Slack Customer Support Alert - 5 runs
10. Emergency Oncall Page - 4 runs (2-hour cooldown enforced)
11. Performance Degradation Webhook - 5 runs

---

**Last Updated:** 2026-01-06
**Seed Script:** `apps/migrator/src/seed.ts`
**Demo Rubric:** `docs/internal/marketing/demo-video-rubric.md`
