# Cronicorn Demo Walkthrough Guide

**Purpose:** This guide maps the demo video rubric to the seeded dashboard, showing exactly what to show and say at each moment.

**Seeded Data Summary:**
- **Timeline:** 30 days (Days 1-27 baseline, Day 28 Black Friday 08:00-20:00, Days 29-30 recovery)
- **11 Endpoints:** 4 tiers (Health, Investigation, Recovery, Alert)
- **Runs:** Color-coded by source (green=baseline, blue=AI interval, purple=one-shot, orange=clamped)
- **~45 AI Sessions:** ~9 baseline monitoring (every 3 days) + ~36 Black Friday adaptations (every 20 min) + post-event
- **Visual Story:** Dramatic spike on Day 28 with sparse baseline creates clear before/during/after visualization

---

## SHOT 1: Hook & Problem (0-12 seconds)

### What You Say:
> "Your workload just spiked. Could be a traffic surge, a live event, maybe a pipeline going nuts. But your scheduled jobs? They're still running every 5 minutes like nothing happened."

### What You Show:

**Dashboard View:** Home Dashboard (`/dashboard`)

**Navigation:**
1. Start with 30-day timeline visible (select "30 days" time range)
2. Pan to Day 28, 08:00-20:00 (Black Friday window)
3. Zoom into mid-morning peak (10:00-14:00)

**What's Visible:**
- **Timeline spikes dramatically** at Day 28, 08:00 (all-day peak)
- **Clear contrast:** Days 1-27 sparse baseline → Day 28 intense peak → Days 29-30 recovery
- **Color change:** Green baseline dots → Blue/Orange/Purple dots (AI taking over)
- **Run density increases** visibly across entire day (dots cluster tighter)
- **Endpoint Activity charts** show sustained high activity for 12 hours

**Specific Numbers to Highlight:**
- Baseline: ~1,000 visitors/min (Days 1-27)
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
- The visual should feel overwhelming (lots of activity vs sparse baseline)

---

## SHOT 2: Solution Introduction (12-27 seconds)

### What You Say:
> "Meet Cronicorn. It's a job scheduler that actually adapts to what's happening. Instead of rigid schedules, it watches your workload and adjusts on the fly. Things heating up? It tightens. Things calm down? It backs off. And here's the thing—every decision is transparent. You're always in control."

### What You Show:

**Dashboard View:** Full 30-Day Timeline Overview

**Navigation:**
1. Show Cronicorn logo briefly (2 seconds)
2. Zoom out to show complete 30-day timeline
3. Slow pan from left (Day 1) → right through baseline → Day 28 peak → Days 29-30

**What's Visible:**
- **Days 1-27:** Sparse green baseline dots (normal operations, 5-10 min intervals)
- **Day 28, 08:00-20:00:** Dense blue, orange, purple dots (AI adaptation across 12 hours)
- **Days 29-30:** Return to sparse green baseline dots (recovery)
- **Source attribution visible** in timeline colors
- **Dramatic spike:** Day 28 stands out clearly against sparse baseline

**Color Legend (add as annotation):**
- 🟢 **Green dots** = Baseline interval (your original schedule)
- 🔵 **Blue dots** = AI-adjusted interval (tightened/loosened)
- 🟣 **Purple dots** = AI one-shot action (recovery/alert)
- 🟠 **Orange dots** = Clamped to min/max (boundary enforced)

**Specific Patterns to Highlight:**
- 27 days of stability before event (credibility + makes spike dramatic)
- AI responds progressively throughout 12-hour day (not just one spike)
- Gradual return to baseline Days 29-30 (automatic reversion after hints expire)
- Clear visual story: sparse baseline → intense spike → sparse recovery

**On-Screen Text Overlays:**
```
Schedules adapt to what's happening
Every decision explained
You set the boundaries
```

**Pro Tips:**
- This shot establishes trust (27 days of baseline = we're not making this up)
- Point out the automatic reversion (hints expire after 60 min)
- Emphasize transparency: every color change = AI decision

---

## SHOT 3A: Baseline Credibility (27-35 seconds)

### What You Say:
> "Let's see it in action. This is a monitoring job tracking an e-commerce site. For nearly a month, everything's smooth. Baseline schedule, checking regularly. 98% success rate. Nice and calm."

### What You Show:

**Dashboard View:** Traffic Monitor Endpoint Details

**Navigation:**
1. Click "Traffic Monitor" endpoint from list
2. Show endpoint details panel
3. Scroll to show response body from baseline period

**Endpoint Configuration Visible:**
- **Name:** Traffic Monitor
- **Baseline Interval:** 300,000ms (5 minutes)
- **Min Interval:** 20,000ms (20 seconds)
- **Max Interval:** 600,000ms (10 minutes)
- **Success Rate:** 98%

**Response Body Example (Baseline period):**
```json
{
  "visitors": 1000,
  "pageLoadMs": 800,
  "ordersPerMin": 40,
  "processingTimeMs": 180,
  "queueDepth": 5,
  "failureRate": 0.01,
  "inventoryLagMs": 100,
  "syncStatus": "healthy"
}
```

**Timeline View (Days 1-27):**
- Green dots evenly spaced (every 5-10 minutes)
- Consistent baseline monitoring
- AI sessions show baseline monitoring (~1 every 3 days confirming normal ops)

**On-Screen Highlights:**
- Circle the baseline interval: **"5 minute baseline"**
- Arrow to response metrics: **"1,000 visitors/min, 800ms page load"**
- Success badge: **"98% success"**

**Pro Tips:**
- Emphasize the boring stability (this is good!)
- Show that baseline schedules are reliable
- Point out: "Nearly a month of steady operations—perfect baseline"
- Mention: "Day 28 will show what happens when things change"

---

## SHOT 3B: Early Morning Surge (35-50 seconds)

### What You Say:
> "Then Black Friday hits. 8am—the sale goes live. Activity starts climbing immediately. The AI catches it and starts tightening. And here's what's cool—it shows you exactly why. 'Traffic trending upward. Monitoring closely.' This same pattern works for monitoring, scraping, pipelines... basically anything that needs to adapt."

### What You Show:

**Dashboard View:** AI Session (Day 28, ~08:20)

**Navigation:**
1. Pan timeline to Day 28, 08:00-10:00 (early morning surge)
2. Click on AI session marker (sessions occur every 20 minutes)
3. Open AI Session details panel

**AI Session Details (Early Surge):**

**Timestamp:** Day 28, ~08:20 (early surge phase)

**Reasoning:**
> "Traffic trending upward. Early surge detected - monitoring closely for continued increase."

**Tool Calls Executed:**
1. `get_latest_response` → Found elevated traffic metrics
2. `get_response_history(limit: 3)` → Confirmed upward trend
3. `submit_analysis` → Confidence: HIGH (watching closely)

**Metrics Visible:**
- Token usage: ~890 tokens
- Duration: ~320ms
- Next analysis: 20 minutes later (AI analyzing every 20 minutes during Black Friday)

**Response Body (Early Surge ~08:20):**
```json
{
  "visitors": 2800,
  "pageLoadMs": 1150,
  "ordersPerMin": 95,
  "processingTimeMs": 280,
  "queueDepth": 45,
  "failureRate": 0.03,
  "inventoryLagMs": 180,
  "syncStatus": "elevated"
}
```

**Timeline Change Visible:**
- Before 08:00: Sparse green dots (5-10 min apart) - baseline
- After 08:00: Dots start clustering tighter, some blue appearing
- Shows AI is watching closely, preparing to react

**On-Screen Highlights:**
- Highlight the upward trend: **"1,000 → 2,800 visitors (2.8x increase)"**
- Show AI reasoning: **"Monitoring closely for continued surge"**
- Point to session frequency: **"AI analyzing every 20 minutes now"**

**Pro Tips:**
- Emphasize this is just the beginning—"It's only 8am, wait until you see the peak"
- Show AI is being careful: watching first, then acting
- Mention: "~36 AI sessions during the 12-hour event"

---

## SHOT 3C: Critical Response & Multi-Tier Actions (50-68 seconds)

### What You Say:
> "Now things are getting critical. Watch how it responds. The AI maxes out at your minimum constraint. It wakes up related jobs that were paused. Triggers one-shot actions. Escalates when it needs to. All automatic. All visible."

### What You Show:

**Dashboard View:** AI Session (Day 28, ~14:00 peak) + Endpoint Activity

**Navigation:**
1. Pan timeline to Day 28, 12:00-16:00 (peak phase)
2. Open AI Session details during peak
3. Show endpoint list with all 4 tiers visible
4. Quick cuts between activated endpoints

**AI Session Details (Peak Phase):**

**Timestamp:** Day 28, ~14:00 (peak moment)

**Reasoning:**
> "CRITICAL: Traffic at sustained peak levels. Page load times elevated. Activating diagnostics and triggering recovery actions. Coordinating with sibling endpoints."

**Tool Calls Executed:**
1. `get_latest_response` → avgPageLoadMs: ~4,500, traffic: ~6,000
2. `get_sibling_latest_responses` → Found 10 other endpoints in same job
   - Order Processor: ordersPerMin: 120, failureRate: 0.15
   - Inventory Sync: lagMs: 600, queueDepth: 850
3. `pause_until(null, "Resume diagnostics")` → **Unpaused Slow Page Analyzer**
4. `propose_next_time(5000, 5)` → **Triggered Cache Warmup in 5 seconds**
5. `propose_next_time(10000, 10)` → **Triggered Database Query Trace in 10s**
6. `submit_analysis` → Confidence: HIGH

**What's Happening Across Tiers:**

**Tier 1: Health (Continuous monitoring - now maxed out)**
- Traffic Monitor: 5min → **20s (MIN CONSTRAINT ENFORCED)** 🟠 Orange dots
- Order Processor Health: Tightened 🔵 Blue dots
- Inventory Sync Check: Tightened 🔵 Blue dots

**Tier 2: Investigation (Activated from paused state)**
- Slow Page Analyzer: **PAUSED → ACTIVE** (purple activation dot)
  - Response shows: avgPageLoadMs: 4,500, bottleneck: "database"
- Database Query Trace: **PAUSED → ACTIVE** (purple activation dot)
  - Response shows: slowestQuery: 2,400ms, activeConnections: 95

**Tier 3: Recovery (One-shot actions triggered)**
- Cache Warmup: 🟣 Purple dot (triggered during peak)
- Scale Checkout Workers: 🟣 Purple dot

**Tier 4: Alert (Escalation actions)**
- Slack Operations Alert: 🟣 Purple dot
- Slack Customer Support Alert: 🟣 Purple dot
- Emergency Oncall Page: 🟣 Purple dot (2-hour cooldown applied)
- Performance Degradation Webhook: 🟣 Purple dot

**Response Body at Critical Peak:**
```json
{
  "visitors": 6000,
  "pageLoadMs": 4500,
  "ordersPerMin": 120,
  "processingTimeMs": 850,
  "queueDepth": 850,
  "failureRate": 0.15,
  "inventoryLagMs": 600,
  "syncStatus": "critical"
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

**Dashboard View:** AI Sessions (Late Day 28) + Timeline Recovery

**Navigation:**
1. Pan timeline to Day 28, 18:00-20:00 (evening wind-down phase)
2. Show AI Session - Recovery confirmed
3. Jump to Day 29 - Show return to baseline
4. Pan to Day 30 - Show stability confirmed

**AI Session (Evening Wind-Down ~18:00):**

**Reasoning:**
> "Traffic declining from peak. Page load times improving. System stabilizing. Easing monitoring back toward baseline intervals."

**Tool Calls:**
1. `get_latest_response` → traffic: declining, pageLoadMs: improving
2. `propose_interval(300000, 30)` → **Back to 5 minutes (30-min TTL)**
3. `pause_until(...)` → **Re-paused investigation endpoints**
4. `submit_analysis` → Confidence: HIGH

**Timeline Change:**
- Orange/Blue dots → Green dots (baseline interval resumed)
- Investigation tier endpoints re-paused (no more purple dots)

**Post-Event (Day 29+):**

**Reasoning:**
> "All AI scheduling hints expired. Baseline schedules fully resumed. No active adjustments remaining."

**Timeline Change:**
- All endpoints return to baseline intervals
- No more AI-adjusted schedules active
- Color fully reverts to green (baseline-interval source)

**Metrics to Show:**

**Evening Wind-Down (~18:00):**
```json
{
  "visitors": 2200,
  "pageLoadMs": 1400,
  "ordersPerMin": 75,
  "processingTimeMs": 340,
  "queueDepth": 120,
  "failureRate": 0.04,
  "inventoryLagMs": 220,
  "syncStatus": "recovering"
}
```

**Post-Event Baseline (Day 29+):**
```json
{
  "visitors": 1000,
  "pageLoadMs": 800,
  "ordersPerMin": 40,
  "processingTimeMs": 180,
  "queueDepth": 5,
  "failureRate": 0.01,
  "inventoryLagMs": 100,
  "syncStatus": "healthy"
}
```

**On-Screen Highlights:**
- **Evening:** "AI easing back to baseline" (blue → green transition)
- **Day 29:** "60-min TTL expired - hints removed" (all green)
- **Day 30:** "Normal operations restored" (same as Days 1-27)

**Timeline Visual:**
- Show color gradient: Orange → Blue → Green
- Show density decreasing: Tight clusters → Sparse spacing
- Show return to baseline pattern (same as Days 1-27)

**Pro Tips:**
- Emphasize "60-minute TTL" = automatic safety valve
- Show Days 29-30 look identical to Days 1-27 (full circle)
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
3. Show AI Sessions list with sessions visible
4. Show source attribution legend

**Endpoint Configuration Panel:**

**Traffic Monitor Settings:**
- **Baseline Interval:** 300,000ms (5 minutes) ← Your default schedule
- **Min Interval:** 20,000ms (20 seconds) ← AI can't go faster than this
- **Max Interval:** 600,000ms (10 minutes) ← AI can't go slower than this
- **Current Interval:** 300,000ms (baseline - no AI adjustments active)

**AI Sessions List:**

**Baseline Sessions (Days 1-27):**
- ~9 sessions total (approximately 1 every 3 days)
- Each confirms: "System stable, no action needed"

**Black Friday Sessions (Day 28):**
- ~36 sessions (every 20 minutes during 12-hour event)
- Progressive phases: Early Surge → Mid-Morning Peak → Lunch Sustained → Afternoon Steady → Evening Wind-Down → Post-Event

**Post-Event Sessions (Days 29-30):**
- Return to sparse monitoring
- Confirm stability restored

**Source Attribution Legend:**
- 🟢 **Baseline Interval** - Your original schedule, always runs
- 🔵 **AI Interval** - AI tightened/loosened interval
- 🟣 **AI One-Shot** - AI triggered specific action
- 🟠 **Clamped Min/Max** - AI hit your boundary

**On-Screen Text:**
```
✓ Every decision explained
  → ~45 AI sessions with full reasoning

✓ Min/max constraints enforced
  → AI stayed within 20s - 10min bounds

✓ Works without AI
  → Baseline schedules always executed
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
- Highlight the contrast: sparse baseline vs intense Black Friday
- "AI is helpful, not required" = no vendor lock-in

---

## SHOT 5: Call-to-Action (95-105 seconds)

### What You Say:
> "Stop fighting rigid schedules. Whether you're monitoring systems, scraping live data, running pipelines, or orchestrating workflows—Cronicorn just adapts. Time to schedule smarter."

### What You Show:

**Dashboard View:** Final Timeline Pan + Logo + CTA

**Navigation:**
1. Zoom out to show complete 30-day timeline
2. Slow pan showing full story: sparse baseline → dramatic surge → recovery
3. Fade to Cronicorn logo on clean background
4. CTA overlay appears

**Timeline Final Shot:**
- Full 30 days visible
- Clear visual arc:
  - Days 1-27: Sparse green (credibility)
  - Day 28: Dense colorful burst (adaptation)
  - Days 29-30: Return to sparse green (recovery)
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

## Recording Sequence: Step-by-Step UI Interactions

This section provides the exact sequence of clicks and navigation for recording the demo. Follow these steps precisely to capture all necessary footage.

### UI Structure Overview

```
/dashboard                    → Main dashboard with charts
  ├─ Endpoint Activity Chart  → Shows run activity over time
  ├─ AI Sessions Chart        → Shows AI session activity over time
  └─ Endpoint Table           → List of all endpoints

/endpoints/:id                → Endpoint detail page
  ├─ Endpoint Configuration   → Name, intervals (min/baseline/max), URL
  ├─ Runs Table              → List of runs for this endpoint (click row → run details)
  └─ AI Sessions Table       → List of AI sessions for this endpoint (click row → session details)

Run Detail Modal              → Full run details (response body, status, timing)
AI Session Detail Modal       → Full session details (reasoning, tool calls, token usage)
```

---

### SEQUENCE 1: Dashboard Overview (Shots 1-2)

**Starting Point:** `/dashboard`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 1.1 | Navigate to `/dashboard` | Main dashboard loads with charts | 2s |
| 1.2 | Click time range dropdown → Select "30 days" | Charts update to show full 30-day timeline | 2s |
| 1.3 | Hover over Endpoint Activity chart | Tooltip shows date and endpoint activity | 3s |
| 1.4 | Slowly move cursor from left (Day 1) to right (Day 30) | Shows sparse baseline → Day 28 spike → recovery | 5s |
| 1.5 | Hover over AI Sessions chart at Day 28 | Tooltip shows high AI session count | 2s |
| 1.6 | Scroll down to view Endpoint Table | Shows all 11 endpoints with status indicators | 2s |

**Footage Captured:**
- Full dashboard with both charts
- 30-day timeline with visible Day 28 spike
- Endpoint table overview

---

### SEQUENCE 2: Baseline Endpoint Exploration (Shot 3A)

**Starting Point:** `/dashboard` → Endpoint Table

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 2.1 | Click "Traffic Monitor" row in Endpoint Table | Navigate to `/endpoints/{traffic-monitor-id}` | 1s |
| 2.2 | View Endpoint Configuration section | Shows name, baseline: 5min, min: 20s, max: 10min | 3s |
| 2.3 | Scroll to Runs Table | List of runs with timestamps, status, duration | 2s |
| 2.4 | Filter/scroll to find a baseline run (Days 1-27) | Look for green "baseline-interval" source badge | 2s |
| 2.5 | **Click the baseline run row** | **Run Detail Modal opens** | 1s |
| 2.6 | View Response Body in modal | Shows baseline JSON: visitors: 1000, pageLoadMs: 800 | 4s |
| 2.7 | Close modal (click X or outside) | Returns to endpoint page | 1s |

**Footage Captured:**
- Endpoint detail page layout
- Endpoint configuration (intervals)
- Run detail modal with baseline response body

---

### SEQUENCE 3: Early Surge AI Session (Shot 3B)

**Starting Point:** `/endpoints/{traffic-monitor-id}`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 3.1 | Scroll to AI Sessions Table on endpoint page | List of AI sessions for Traffic Monitor | 2s |
| 3.2 | Filter/scroll to find Day 28, ~08:20 session | Look for "early-surge" phase session | 2s |
| 3.3 | **Click the early surge AI session row** | **AI Session Detail Modal opens** | 1s |
| 3.4 | View Reasoning section | Shows "Traffic trending upward. Early surge detected..." | 3s |
| 3.5 | Scroll to Tool Calls section | Shows get_latest_response, get_response_history calls | 4s |
| 3.6 | Expand a tool call (if expandable) | Shows tool input/output details | 2s |
| 3.7 | View Token Usage & Duration | Shows ~890 tokens, ~320ms | 2s |
| 3.8 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- AI Sessions table on endpoint page
- AI Session detail modal with full reasoning
- Tool calls with inputs/outputs
- Token usage metrics

---

### SEQUENCE 4: Peak Phase - Run Details (Shot 3C Part 1)

**Starting Point:** `/endpoints/{traffic-monitor-id}`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 4.1 | Scroll to Runs Table | List of runs for Traffic Monitor | 1s |
| 4.2 | Filter/scroll to find Day 28, ~14:00 run (peak) | Look for orange "clamped-min" source badge | 2s |
| 4.3 | **Click the peak run row** | **Run Detail Modal opens** | 1s |
| 4.4 | View Response Body | Shows peak JSON: visitors: 6000, pageLoadMs: 4500 | 4s |
| 4.5 | Note the source badge shows "clamped-min" | AI hit minimum constraint (20s) | 2s |
| 4.6 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- Peak run with elevated metrics
- "clamped-min" source indicator

---

### SEQUENCE 5: Peak Phase - AI Session with Actions (Shot 3C Part 2)

**Starting Point:** `/endpoints/{traffic-monitor-id}`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 5.1 | Scroll to AI Sessions Table | AI sessions for Traffic Monitor | 1s |
| 5.2 | Filter/scroll to find Day 28, ~14:00 session (peak) | Look for "lunch-sustained" or "afternoon-steady" phase | 2s |
| 5.3 | **Click the peak AI session row** | **AI Session Detail Modal opens** | 1s |
| 5.4 | View Reasoning section | Shows "CRITICAL: Traffic at sustained peak levels..." | 3s |
| 5.5 | Scroll to Tool Calls section | Shows multiple tool calls including pause_until, propose_next_time | 5s |
| 5.6 | Highlight get_sibling_latest_responses call | Shows coordination across endpoints | 3s |
| 5.7 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- Critical phase AI reasoning
- Multi-endpoint coordination tool calls
- Recovery/alert trigger actions

---

### SEQUENCE 6: Multi-Tier Endpoint Exploration (Shot 3C Part 3)

**Starting Point:** `/endpoints/{traffic-monitor-id}` → Back to dashboard

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 6.1 | Click browser back or navigate to `/dashboard` | Return to main dashboard | 1s |
| 6.2 | Scroll to Endpoint Table | All 11 endpoints visible | 1s |
| 6.3 | Click "Slow Page Analyzer" (Investigation tier) | Navigate to endpoint page | 1s |
| 6.4 | View Runs Table | Shows runs only during Day 28 peak (was paused before) | 3s |
| 6.5 | **Click a run from peak period** | **Run Detail Modal opens** | 1s |
| 6.6 | View Response Body | Shows avgPageLoadMs: 4500, bottleneck: "database" | 3s |
| 6.7 | Close modal | Returns to endpoint page | 1s |
| 6.8 | Navigate back to dashboard | `/dashboard` | 1s |
| 6.9 | Click "Cache Warmup" (Recovery tier) | Navigate to endpoint page | 1s |
| 6.10 | View Runs Table | Shows one-shot runs (purple badges) during peak | 2s |
| 6.11 | **Click a one-shot run** | **Run Detail Modal opens** | 1s |
| 6.12 | View Response Body | Shows cache warmup results | 2s |
| 6.13 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- Investigation tier endpoint activation
- Recovery tier one-shot execution
- Cross-tier coordination evidence

---

### SEQUENCE 7: Recovery Phase (Shot 3D)

**Starting Point:** Dashboard → Traffic Monitor

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 7.1 | Navigate to `/dashboard` | Main dashboard | 1s |
| 7.2 | Click "Traffic Monitor" in Endpoint Table | Navigate to endpoint page | 1s |
| 7.3 | Scroll to Runs Table | Run list visible | 1s |
| 7.4 | Filter/scroll to find Day 28, ~18:00 run (wind-down) | Look for runs with declining metrics | 2s |
| 7.5 | **Click the wind-down run row** | **Run Detail Modal opens** | 1s |
| 7.6 | View Response Body | Shows visitors: 2200, pageLoadMs: 1400 (recovering) | 3s |
| 7.7 | Close modal | Returns to endpoint page | 1s |
| 7.8 | Scroll to AI Sessions Table | AI sessions list | 1s |
| 7.9 | Filter/scroll to find Day 28, ~18:00 session | Look for "evening-winddown" phase | 2s |
| 7.10 | **Click the wind-down AI session row** | **AI Session Detail Modal opens** | 1s |
| 7.11 | View Reasoning | Shows "Traffic declining... Easing back toward baseline" | 3s |
| 7.12 | View Tool Calls | Shows propose_interval back to 5min, pause_until for investigation tier | 3s |
| 7.13 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- Recovery phase metrics
- AI reasoning for easing back
- Re-pausing of investigation endpoints

---

### SEQUENCE 8: Post-Event Stability (Shot 3D continued)

**Starting Point:** `/endpoints/{traffic-monitor-id}`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 8.1 | Scroll to Runs Table | Run list visible | 1s |
| 8.2 | Filter/scroll to find Day 29 or Day 30 run | Look for green "baseline-interval" source badge | 2s |
| 8.3 | **Click the post-event baseline run row** | **Run Detail Modal opens** | 1s |
| 8.4 | View Response Body | Shows visitors: 1000, pageLoadMs: 800 (baseline restored) | 3s |
| 8.5 | Close modal | Returns to endpoint page | 1s |

**Footage Captured:**
- Return to baseline metrics
- Full recovery confirmation

---

### SEQUENCE 9: Configuration & Differentiators (Shot 4)

**Starting Point:** `/endpoints/{traffic-monitor-id}`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 9.1 | Scroll to top of endpoint page | Endpoint Configuration section visible | 1s |
| 9.2 | Highlight interval fields | Baseline: 5min, Min: 20s, Max: 10min clearly visible | 4s |
| 9.3 | Navigate to `/dashboard` | Return to main dashboard | 1s |
| 9.4 | View AI Sessions chart | Shows ~45 sessions over 30 days | 2s |
| 9.5 | Hover over Day 28 on AI Sessions chart | Tooltip shows high session count | 2s |

**Footage Captured:**
- Clear interval configuration
- AI session overview showing ~45 total sessions

---

### SEQUENCE 10: Final Pan (Shot 5)

**Starting Point:** `/dashboard`

| Step | Action | What You See | Duration |
|------|--------|--------------|----------|
| 10.1 | Ensure "30 days" time range is selected | Full timeline visible | 1s |
| 10.2 | Slowly scroll/pan across Endpoint Activity chart | Visual arc: sparse → spike → sparse | 5s |
| 10.3 | Hold on final dashboard view | Clean, professional dashboard | 3s |

**Footage Captured:**
- Complete 30-day story arc
- Final dashboard impression

---

### Recording Checklist

Before recording, verify these elements are visible and working:

**Dashboard Page (`/dashboard`):**
- [ ] Endpoint Activity chart loads correctly
- [ ] AI Sessions chart loads correctly
- [ ] Time range selector works (30 days option)
- [ ] Endpoint Table shows all 11 endpoints
- [ ] Chart tooltips display on hover

**Endpoint Page (`/endpoints/:id`):**
- [ ] Endpoint Configuration section shows intervals
- [ ] Runs Table loads with pagination/filtering
- [ ] AI Sessions Table loads with pagination/filtering
- [ ] Source badges display correctly (green, blue, purple, orange)

**Run Detail Modal:**
- [ ] Opens when clicking a run row
- [ ] Response Body displays formatted JSON
- [ ] Status, duration, timestamp visible
- [ ] Close button/click-outside works

**AI Session Detail Modal:**
- [ ] Opens when clicking an AI session row
- [ ] Reasoning section displays full text
- [ ] Tool Calls section shows all calls with inputs/outputs
- [ ] Token usage and duration visible
- [ ] Close button/click-outside works

**Data Verification:**
- [ ] Day 28 shows dramatic spike in charts
- [ ] Baseline runs (Days 1-27) have visitors: ~1000
- [ ] Peak runs (Day 28 midday) have visitors: ~6000
- [ ] AI sessions during peak show critical reasoning
- [ ] Post-event runs (Days 29-30) return to baseline

---

## Quick Reference: Dashboard Navigation Map

### Main Views You'll Use:

1. **Dashboard Home** (`/dashboard`)
   - Full timeline (30 days)
   - Endpoint activity charts
   - Recent activity stats
   - AI session count

2. **Endpoint Details Panel**
   - Click any endpoint name to open
   - Shows: name, tier, intervals (min/baseline/max)
   - Recent runs list with response bodies
   - Success rate statistics

3. **AI Sessions List** (`/dashboard/ai-sessions` or panel)
   - All ~45 sessions chronologically
   - Click session to view full details
   - Tool calls, reasoning, token usage

4. **Timeline Controls**
   - Time range selector: 30 days for full view
   - Zoom: Focus on specific time ranges (Day 28 for Black Friday)
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
- **AI sessions:** ~45 (~9 baseline + ~36 Black Friday)
- **Baseline interval:** 5min (300,000ms)
- **Critical interval:** 20s (min constraint)
- **TTL duration:** 60 minutes
- **Black Friday duration:** 12 hours (08:00-20:00 on Day 28)

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
- ❌ Don't skip the baseline credibility (Days 1-27)
- ❌ Don't explain too much technical detail
- ❌ Don't use jargon without context
- ❌ Don't show UI bugs or incomplete features
- ❌ Don't make it about the technology (make it about the value)

---

## Appendix: Seed Data Reference

### Black Friday Timeline (Day 28):

**Phase 1: Early Surge (08:00-10:00)**
- Traffic: 1,000 → 3,500 visitors/min (ramping up)
- Page load: 800 → 1,800ms
- AI: Detects surge, begins tightening

**Phase 2: Mid-Morning Peak (10:00-12:00)**
- Traffic: 3,500 → 6,000 visitors/min (peak levels)
- Page load: 1,800 → 4,500ms
- AI: Maximum tightening, activates investigation tier

**Phase 3: Lunch Sustained (12:00-14:00)**
- Traffic: ~6,000 visitors/min (sustained peak)
- Page load: ~4,500ms
- AI: Maintains heightened monitoring, triggers recovery/alerts

**Phase 4: Afternoon Steady (14:00-16:00)**
- Traffic: ~5,500 visitors/min (high but stable)
- Page load: ~3,200ms
- AI: Sustained high-frequency monitoring

**Phase 5: Evening Wind-Down (16:00-20:00)**
- Traffic: 5,500 → 1,500 visitors/min (declining)
- Page load: 3,200 → 1,000ms (improving)
- AI: Eases back toward baseline

**Phase 6: Post-Event (Days 29-30)**
- Traffic: ~1,000 visitors/min (baseline restored)
- Page load: ~800ms (baseline restored)
- AI: Returns to sparse monitoring, confirms stability

### Endpoint Breakdown:

**Health Tier (3 endpoints - continuous monitoring):**
1. Traffic Monitor - Baseline 5min, Min 20s, Max 10min
2. Order Processor Health - Baseline 5min, Min 30s, Max 10min
3. Inventory Sync Check - Baseline 10min, Min 60s, Max 15min

**Investigation Tier (2 endpoints - conditional activation):**
4. Slow Page Analyzer - Activated during critical phase
5. Database Query Trace - Activated during critical phase

**Recovery Tier (2 endpoints - one-shot actions):**
6. Cache Warmup
7. Scale Checkout Workers

**Alert Tier (4 endpoints - escalation):**
8. Slack Operations Alert
9. Slack Customer Support Alert
10. Emergency Oncall Page (2-hour cooldown enforced)
11. Performance Degradation Webhook

---

**Last Updated:** 2026-01-13
**Seed Script:** `apps/migrator/src/seed.ts`
**Demo Rubric:** `docs/internal/marketing/demo-video-rubric.md`
