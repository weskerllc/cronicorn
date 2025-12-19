# Cronicorn Demo - Visual Storyboard

**Quick visual reference for recording - Print this out and keep it on your desk!**

---

## 🎬 SHOT LIST (2:30 - 3:00)

### ACT 1: THE PROBLEM (0:00 - 0:30)

```
┌─────────────────────────────────────┐
│ SHOT 1: Title Card                  │
│ [0:00 - 0:03]                       │
│                                     │
│     ╔═══════════════════════╗      │
│     ║     🦄 Cronicorn      ║      │
│     ║                       ║      │
│     ║  HTTP Job Scheduler   ║      │
│     ║  that adapts to your  ║      │
│     ║        system         ║      │
│     ╚═══════════════════════╝      │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ SHOT 2: Split Screen Problem        │
│ [0:03 - 0:15]                       │
│                                     │
│ LEFT: Static Cron  │ RIGHT: Chaos  │
│                    │               │
│ */5 * * * *        │ 📊 Metrics   │
│ curl api.com      │ 🔴 Errors ↑↑  │
│                    │ ⚠️  429 Rate   │
│ Still running...   │    Limit      │
│ Still running...   │               │
│ Still running...   │ 😫 Dev SSH'ing│
└─────────────────────────────────────┘

VO: "Traditional cron jobs run on a fixed
     schedule—whether your API is healthy,
     failing, or being rate-limited."
```

---

### ACT 2: THE SETUP (0:30 - 1:15)

```
┌─────────────────────────────────────┐
│ SHOT 3: Sign In                     │
│ [0:30 - 0:45]                       │
│                                     │
│  🌐 https://cronicorn.com           │
│                                     │
│  ┌──────────────────────┐          │
│  │  Sign in with GitHub  │          │
│  └──────────────────────┘          │
│           ↓                         │
│  [Quick auth animation]             │
│           ↓                         │
│  📊 Empty Dashboard                 │
│                                     │
└─────────────────────────────────────┘

VO: "After signing in with GitHub, we start
     with an empty dashboard."

┌─────────────────────────────────────┐
│ SHOT 4: Create Job                  │
│ [0:45 - 1:00]                       │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │
│  ┃ Create Job              ┃     │
│  ┃                          ┃     │
│  ┃ Name: API Health         ┃     │
│  ┃       Monitoring         ┃     │
│  ┃                          ┃     │
│  ┃ Description: Monitor     ┃     │
│  ┃ production API health    ┃     │
│  ┃                          ┃     │
│  ┃      [Create]            ┃     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │
│           ↓                         │
│  ✓ Job card appears                 │
│                                     │
└─────────────────────────────────────┘

VO: "Jobs are containers for related endpoints.
     Let's create one for API health monitoring."

┌─────────────────────────────────────┐
│ SHOT 5: Add Endpoint                │
│ [1:00 - 1:15]                       │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │
│  ┃ Add Endpoint             ┃     │
│  ┃                          ┃     │
│  ┃ Name: Main API Health    ┃     │
│  ┃ URL: api.example.com/... ┃     │
│  ┃ Method: GET              ┃     │
│  ┃                          ┃     │
│  ┃ Schedule: ⦿ Interval     ┃     │
│  ┃   Every: 300000 ms (5m)  ┃     │
│  ┃                          ┃     │
│  ┃ ⚠️  Safety Constraints:   ┃     │
│  ┃ Min: 30000 ms  (30s) ←━━┃━━━━► Prevents
│  ┃ Max: 900000 ms (15m) ←━━┃━━━━► over-polling
│  ┃                          ┃     │
│  ┃      [Add Endpoint]      ┃     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │
│                                     │
└─────────────────────────────────────┘

VO: "We define the endpoint URL, set a baseline
     schedule of every 5 minutes, and add safety
     constraints to keep AI suggestions within
     safe bounds."
```

---

### ACT 3: THE MAGIC ⭐ (1:15 - 2:15)

```
┌─────────────────────────────────────┐
│ SHOT 6: Baseline Operation          │
│ [1:15 - 1:30]                       │
│                                     │
│ Timeline View:                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✓ ━━━━ ✓ ━━━━ ✓ ━━━━ ✓ ━━━━ ✓     │
│ 10:00  10:05  10:10  10:15  10:20  │
│                                     │
│ All runs: ✓ Success (200ms)        │
│ Source: baseline-interval           │
│                                     │
└─────────────────────────────────────┘

VO: "Initially, executions run every 5 minutes,
     just like traditional cron. Everything's
     healthy, so the schedule stays steady."

┌─────────────────────────────────────┐
│ SHOT 7: The Crisis                  │
│ [1:30 - 1:50]                       │
│                                     │
│ Timeline View:                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✓ ━━━━ ✓ ━━━━ ✗ ━━━━ ✗ ━━━━ ✗     │
│ 10:00  10:05  10:10  10:15  10:20  │
│                     ↑               │
│                     Failures start  │
│                                     │
│ 🔴 3 consecutive failures           │
│ Error: 500 Internal Server Error    │
│                                     │
│         ↓                           │
│                                     │
│ 🤖 AI adjusting schedule...         │
│                                     │
│         ↓                           │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✗ ▓ ✗ ▓ ✗ ▓ ✗ ▓ ✗ ▓ ✗ ▓ ✗ ▓ ✗     │
│ 10:25:00    :30     :60     :90    │
│ └─ 30s ─┘                           │
│                                     │
│ 🤖 AI Active: Checking every 30s    │
│    Reason: 3 consecutive failures   │
│    Expires in: 45 minutes           │
│                                     │
└─────────────────────────────────────┘

VO: "Watch what happens when errors occur.
     After three failures, Cronicorn's AI
     automatically tightens to every 30 seconds—
     our minimum interval. We're now monitoring
     closely to catch the moment things recover."

┌─────────────────────────────────────┐
│ SHOT 8: The Recovery                │
│ [1:50 - 2:05]                       │
│                                     │
│ Timeline View:                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✗ ▓ ✗ ▓ ✓ ▓ ✓ ▓ ✓ ▓ ✓ ─ ✓ ── ✓    │
│ 10:26   10:27  10:28  10:30  10:35 │
│     └─ Success! ─┘                  │
│                  └─ Backing off ──┘ │
│                                     │
│ ✅ Sustained success detected       │
│ 🤖 Gradually returning to baseline  │
│                                     │
│ Timeline continues:                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✓ ━━━━ ✓ ━━━━ ✓ ━━━━ ✓ ━━━━ ✓     │
│ 11:00  11:05  11:10  11:15  11:20  │
│                                     │
│ ✅ AI hint expired                  │
│    Returned to baseline (5 min)    │
│                                     │
└─────────────────────────────────────┘

VO: "As soon as the API recovers, Cronicorn
     detects the sustained success and gradually
     backs off. After stability is confirmed,
     we return to the baseline 5-minute schedule.
     No manual intervention required."

┌─────────────────────────────────────┐
│ SHOT 9: Full Day View               │
│ [2:05 - 2:15]                       │
│                                     │
│ 24-Hour Timeline (compressed):      │
│                                     │
│ 6 AM  ━━━━━━━━━━━━━━━━━━━━━       │
│       Regular (5 min)               │
│                                     │
│ 10 AM ▓▓▓▓▓▓▓                       │
│       Crisis (30 sec)               │
│                                     │
│ 11 AM ━━━━━━━━━━━━━━━━━━━━━       │
│       Normal (5 min)                │
│                                     │
│ 6 PM  ━━━  ━━━  ━━━  ━━━           │
│       Low activity (15 min)         │
│                                     │
│ 11 PM ━━━━━━━━━━━━━━━━━━━━━       │
│       Regular (5 min)               │
│                                     │
└─────────────────────────────────────┘

VO: "Over the course of a day, Cronicorn adapts
     to your system's behavior—tightening during
     issues, relaxing during stability, and
     always staying within your safety constraints."
```

---

### ACT 4: THE CONTROL (2:15 - 2:45)

```
┌─────────────────────────────────────┐
│ SHOT 10: Execution Detail           │
│ [2:15 - 2:30]                       │
│                                     │
│  Run #1,234                         │
│  ┌───────────────────────────────┐ │
│  │ Status: 🔴 Failure            │ │
│  │ Started: 10:15:32             │ │
│  │ Duration: 1,243ms             │ │
│  │ Source: baseline-interval     │ │
│  │                               │ │
│  │ Response:                     │ │
│  │ Status: 500                   │ │
│  │ {                             │ │
│  │   "error": "Internal...",     │ │
│  │   "message": "Database..."    │ │
│  │ }                             │ │
│  │                               │ │
│  │ [Filters] [Search] [Export]   │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

VO: "Every execution is fully logged with
     timestamps, response details, and error
     messages. When something breaks, you have
     everything you need to debug quickly."

┌─────────────────────────────────────┐
│ SHOT 11: AI Transparency            │
│ [2:30 - 2:45]                       │
│                                     │
│  🤖 AI Status                        │
│  ┌───────────────────────────────┐ │
│  │ AI Scheduling: ✓ Enabled      │ │
│  │                               │ │
│  │ Current Hint:                 │ │
│  │ • Interval: 30 seconds        │ │
│  │ • Expires: in 42 minutes      │ │
│  │ • Reason: 3 consecutive       │ │
│  │   failures at 10:15 AM        │ │
│  │                               │ │
│  │ Baseline Schedule:            │ │
│  │ • Every 5 minutes (300,000ms) │ │
│  │                               │ │
│  │ Safety Constraints:           │ │
│  │ • Min: 30s (rate limiting)    │ │
│  │ • Max: 15m (timely checks)    │ │
│  │                               │ │
│  │ Recent AI Actions:            │ │
│  │ • 10:15 - Increased to 30s    │ │
│  │ • 9:30 - Decreased to 15m     │ │
│  │ • 8:45 - Returned to baseline │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

VO: "Unlike black-box AI, every decision
     Cronicorn makes is explained in plain
     English. You see exactly why schedules
     changed, when hints expire, and how
     constraints are applied."
```

---

### ACT 5: THE CLOSE (2:45 - 3:00)

```
┌─────────────────────────────────────┐
│ SHOT 12: Comparison                 │
│ [2:45 - 2:55]                       │
│                                     │
│ Traditional Cron  │  Cronicorn      │
│ ─────────────────────────────────── │
│ ❌ Static         │ ✅ Adaptive     │
│ ❌ Manual         │ ✅ Automatic    │
│ ❌ No learning    │ ✅ AI learning  │
│ ❌ Over/under     │ ✅ Balanced     │
│ ❌ Complex logic  │ ✅ Zero code    │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ SHOT 13: Call to Action             │
│ [2:55 - 3:00]                       │
│                                     │
│                                     │
│        Get Started in 5 Minutes     │
│                                     │
│      🌐 https://cronicorn.com       │
│                                     │
│     ✓ Free tier available           │
│     ✓ No credit card required       │
│     ✓ Self-hosting option           │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ 📖 docs.cronicorn.com               │
│ 🤖 npm install -g @cronicorn/mcp-...│
│ 💻 github.com/weskerllc/cronicorn   │
│                                     │
└─────────────────────────────────────┘

VO: "Stop manually adjusting schedules at 2 AM.
     Let Cronicorn adapt automatically while you
     focus on building. Sign up free at
     cronicorn.com, or self-host with our
     open-source package. Your cron jobs just
     got smarter."
```

---

## 🎯 KEY SHOTS TO GET RIGHT

### Priority 1: Timeline Visualization (SHOT 7-9)
**This is the hero moment - spend the most time here**
- Must clearly show intervals changing
- Color-code status (green/red)
- Annotate key transitions
- Use animation to show compression/expansion

### Priority 2: AI Hint Panel (SHOT 11)
**Shows transparency and builds trust**
- Make text large and readable
- Highlight "Reason" field (plain English)
- Show TTL expiration time
- Include recent action history

### Priority 3: Constraints Callout (SHOT 5)
**Establishes safety-first design**
- Visual indicator (arrow, box, highlight)
- Show min/max values clearly
- Explain why they matter

---

## 📸 CAMERA ANGLES & FRAMING

```
Full Screen Browser
┌────────────────────────────────────┐
│ 🌐 https://cronicorn.com      ☰   │ ← Browser chrome
├────────────────────────────────────┤
│                                    │
│        [Main Content Area]         │ ← Record this area
│                                    │
│                                    │
└────────────────────────────────────┘
    ↑
    Record at 1920x1080
    or 1280x720 minimum
```

**Zoom Levels**:
- 100% - Most of the time
- 125% - When showing detailed forms or code
- 150% - Close-up on specific fields (rare)

**Cursor Movement**:
- Deliberate and smooth
- Pause on important elements (1-2 seconds)
- Use large cursor for visibility

---

## 🎨 COLOR LEGEND

```
🟢 Green (#22c55e) - Success
🔴 Red (#ef4444)   - Failure
🟡 Yellow (#eab308)- Warning/Timeout
🔵 Blue (#3b82f6)  - AI Action
⚪ Gray (#6b7280)  - Paused/Disabled
```

---

## 📝 ANNOTATION TEMPLATES

Use these text overlays during editing:

```
┌─────────────────────────┐
│ 🤖 AI Active            │
│ Checking every 30s      │
│ Reason: 3 failures      │
│ Expires: 45 min         │
└─────────────────────────┘

┌─────────────────────────┐
│ ⚠️  Safety Constraints   │
│ Min: 30s ← Rate limit   │
│ Max: 15m ← SLA          │
└─────────────────────────┘

┌─────────────────────────┐
│ ✓ Regular Operation     │
│ Every 5 minutes         │
│ All systems healthy     │
└─────────────────────────┘
```

---

## ⏱️ TIMING GUIDE

```
Act 1 (Problem)     ████░░░░░░░░░░░░░░░░  15% (0:30)
Act 2 (Setup)       ██████████░░░░░░░░░░  25% (0:45)
Act 3 (Magic)       ████████████████░░░░  40% (1:00) ⭐
Act 4 (Control)     ██████░░░░░░░░░░░░░░  15% (0:30)
Act 5 (Close)       ███░░░░░░░░░░░░░░░░░   5% (0:15)
```

**Total**: 2:30 - 3:00 (150-180 seconds)

---

## 🎤 VOICEOVER RECORDING NOTES

**Tone**: Professional but friendly, not sales-y

**Pace**: 
- Normal: ~150 words/minute
- Slow down: Technical concepts, first-time terms
- Speed up: Navigation, repeated actions

**Emphasis Words** (slightly louder/slower):
- "automatically"
- "no manual intervention"
- "safety constraints"
- "plain English"
- "zero code changes"

**Pauses** (1-2 seconds):
- After showing failures
- When AI hint appears
- On comparison slide
- Before CTA

---

## ✅ FINAL CHECK

Before you start recording:
```
Environment
- [ ] Clean desktop
- [ ] Do Not Disturb enabled
- [ ] Browser profile prepared
- [ ] Screen at correct resolution

Demo Setup
- [ ] Clean Cronicorn account
- [ ] Test endpoint ready
- [ ] Can trigger failures
- [ ] Can trigger recovery

Recording
- [ ] Screen recorder running
- [ ] Audio levels tested
- [ ] Cursor visible and large
- [ ] Zoom level correct
```

---

**🎬 You're ready to shoot! Print this, keep it visible, and reference during recording.**

**Remember**: The timeline visualization (ACT 3) is your star. Get that right and the rest will follow.

**Good luck! 🚀**
