# Cronicorn Product Demo Plan

**Version**: 1.0  
**Target**: Homepage Hero Video + GitHub README  
**Duration**: 2-3 minutes  
**Format**: Screen recording with voiceover  
**Objective**: Show developers why Cronicorn is the smart choice for HTTP job scheduling

---

## Executive Summary

This demo showcases Cronicorn's unique value proposition: **an HTTP job scheduler that adapts to your system automatically**. Unlike static cron jobs that run blindly on a fixed schedule, Cronicorn learns from your endpoints and optimizes timing in real-time—all while staying within your safety constraints.

**Key Differentiator**: We're the only platform that combines traditional cron reliability with AI-powered adaptation. No complex orchestration, no code changes required.

---

## Target Audience

**Primary**: Backend developers, DevOps engineers, SaaS builders  
**Pain Points**: 
- Manually adjusting cron schedules based on metrics
- Over-polling APIs and wasting rate limits
- Missing critical issues due to infrequent checks
- Managing complex backoff/retry logic

**What They Care About**:
- Fast setup (< 5 minutes)
- No code changes to existing APIs
- Clear visibility into execution history
- Automatic optimization without manual tuning

---

## Demo Narrative Structure

### Act 1: The Problem (0:00 - 0:30)
**Show the pain of static scheduling**

### Act 2: The Setup (0:30 - 1:15)
**How easy it is to get started**

### Act 3: The Magic (1:15 - 2:15)
**AI adaptation in action**

### Act 4: The Control (2:15 - 2:45)
**Visibility and constraints**

### Act 5: The Close (2:45 - 3:00)
**Call to action**

---

## Detailed Scene Breakdown

## 🎬 **ACT 1: THE PROBLEM** (0:00 - 0:30)

### Opening Hook (0:00 - 0:15)
**Visual**: Split screen comparison

**Left Side**: Traditional cron job
```bash
# Static cron running every 5 minutes
*/5 * * * * curl https://api.example.com/health
```

**Right Side**: System metrics dashboard showing:
- API errors spiking
- 429 Rate Limit errors
- Cron still hammering away at 5-minute intervals
- Developer manually SSHing in to adjust

**Voiceover**:
> "Traditional cron jobs run on a fixed schedule—whether your API is healthy, failing, or being rate-limited. When things go wrong, you're the one adjusting schedules at 2 AM."

### The Solution Tease (0:15 - 0:30)
**Visual**: Fade to Cronicorn logo + tagline

**On Screen Text**:
```
Cronicorn
HTTP Job Scheduler that adapts to your system
```

**Voiceover**:
> "Cronicorn is different. It's a scheduler that learns from your endpoints and adapts automatically—like having a DevOps engineer monitoring your jobs 24/7."

---

## 🚀 **ACT 2: THE SETUP** (0:30 - 1:15)

### Scene 1: Sign In & Dashboard (0:30 - 0:45)
**Visual**: Quick landing page → Sign in with GitHub → Empty dashboard

**Actions**:
1. Navigate to https://cronicorn.com
2. Click "Sign in with GitHub"
3. Quick auth flow (1-2 seconds, show loading)
4. Land on empty dashboard

**On Screen**: Clean, modern UI with clear CTAs

**Voiceover**:
> "Let's set up our first job. After signing in with GitHub, we start with an empty dashboard. No complex configuration—just add a job."

### Scene 2: Create Your First Job (0:45 - 1:00)
**Visual**: Job creation modal with form fields filling in

**Actions**:
1. Click "Create Job"
2. Fill in form:
   - Name: "API Health Monitoring"
   - Description: "Monitor our production API health endpoints"
3. Click "Create"
4. Job card appears on dashboard

**On Screen Animation**: Smooth form interaction, instant feedback

**Voiceover**:
> "Jobs are containers for related endpoints. Let's create one for API health monitoring."

### Scene 3: Add Your First Endpoint (1:00 - 1:15)
**Visual**: Endpoint creation modal, fields auto-filling

**Actions**:
1. Click "Add Endpoint" inside the job
2. Fill in endpoint details:
   - **Name**: "Main API Health Check"
   - **URL**: `https://api.example.com/health`
   - **Method**: GET
   - **Baseline Schedule**: 
     - Option shown: "Cron" vs "Interval"
     - Select: "Interval"
     - Value: `300000` (5 minutes)
   - **Safety Constraints** (show this as important):
     - Min Interval: `30000` (30 seconds)
     - Max Interval: `900000` (15 minutes)
3. Click "Add Endpoint"

**On Screen Callout**: Highlight the min/max constraints
```
Min: 30s (prevents over-polling)
Max: 15m (ensures timely checks)
```

**Voiceover**:
> "We define the endpoint URL, set a baseline schedule of every 5 minutes, and add safety constraints. The minimum prevents rate limiting, the maximum ensures we catch issues quickly. These constraints keep AI suggestions within safe bounds."

**Transition**: Endpoint now shows in job detail view with "Active" status

---

## ✨ **ACT 3: THE MAGIC** (1:15 - 2:15)

This is the **core value demonstration**. We show AI adaptation responding to real conditions.

### Scene 4: Baseline Operation (1:15 - 1:30)
**Visual**: Execution timeline showing regular 5-minute intervals

**Actions**:
1. Navigate to endpoint detail page
2. Show "Runs" tab with execution history
3. Timeline view showing:
   - Regular dots every 5 minutes
   - All green (successful)
   - Response times: ~200ms
   - Status indicators all showing "✓ Success"

**On Screen**: Execution timeline with annotations:
```
✓ 10:00 AM - Success (baseline-interval) - 203ms
✓ 10:05 AM - Success (baseline-interval) - 198ms
✓ 10:10 AM - Success (baseline-interval) - 201ms
```

**Voiceover**:
> "Initially, executions run on our baseline schedule—every 5 minutes, just like traditional cron. Everything's healthy, so the schedule stays steady."

### Scene 5: The Crisis (1:30 - 1:50)
**Visual**: Simulated API degradation with automatic response

**Actions**:
1. **Trigger failure scenario** (pre-recorded or live simulation):
   - API starts returning 500 errors
   - Timeline shows:
     ```
     ✗ 10:15 AM - Failure (baseline-interval) - Error: 500 Internal Server Error
     ✗ 10:20 AM - Failure (baseline-interval) - Error: 500 Internal Server Error
     ✗ 10:25 AM - Failure (baseline-interval) - Error: 500 Internal Server Error
     ```
2. **AI responds automatically** (this happens in real-time):
   - Small notification appears: "AI adjusting schedule..."
   - Timeline now shows:
     ```
     ✗ 10:25:30 - Failure (ai-interval) - Error: 500
     ✗ 10:26:00 - Failure (ai-interval) - Error: 500
     ✗ 10:26:30 - Failure (ai-interval) - Error: 500
     ```
   - Interval changed from 5 minutes → 30 seconds
3. Show "AI Hint" indicator appears on endpoint:
   ```
   🤖 AI Active: Checking every 30s (expires in 45 min)
   Reason: 3 consecutive failures detected
   ```

**On Screen Animation**: Timeline accelerates, dots appear more frequently, intervals shrink

**Voiceover**:
> "Watch what happens when errors occur. After three failures, Cronicorn's AI automatically tightens the schedule to every 30 seconds—our minimum interval. We're now monitoring closely to catch the moment things recover."

### Scene 6: The Recovery (1:50 - 2:05)
**Visual**: API recovers, AI adapts back

**Actions**:
1. API returns to health
2. Timeline shows successful runs:
   ```
   ✓ 10:27:00 - Success (ai-interval) - 215ms
   ✓ 10:27:30 - Success (ai-interval) - 198ms
   ✓ 10:28:00 - Success (ai-interval) - 203ms
   ```
3. After sustained success, AI starts backing off:
   ```
   ✓ 10:30:00 - Success (ai-interval) - 201ms (interval: 2 min)
   ✓ 10:35:00 - Success (baseline-interval) - 203ms (back to 5 min)
   ```
4. AI hint expires, show notification:
   ```
   ✅ AI hint expired - returning to baseline schedule
   ```

**On Screen**: Timeline returns to regular spacing

**Voiceover**:
> "As soon as the API recovers, Cronicorn detects the sustained success and gradually backs off. After stability is confirmed, we return to the baseline 5-minute schedule. No manual intervention required."

### Scene 7: The Long-Term View (2:05 - 2:15)
**Visual**: Zoom out to show full day timeline

**Actions**:
1. Show compressed timeline of entire day
2. Highlight different periods:
   - **Morning (6am-10am)**: Regular 5-min intervals (green)
   - **Crisis (10am-10:30am)**: Dense 30-sec checks (red → green)
   - **Afternoon (10:30am-5pm)**: Regular 5-min intervals (green)
   - **Evening (5pm-11pm)**: Sparse 15-min intervals (green) [AI backed off due to low activity]
   - **Night (11pm-6am)**: Regular 5-min intervals (green)

**On Screen**: Full-day visualization with annotations:
```
6 AM  ━━━━━━━━━━━  Regular monitoring (5 min)
10 AM ▓▓▓▓▓▓▓      Crisis response (30 sec)
11 AM ━━━━━━━━━━━  Back to normal (5 min)
6 PM  ━━━ ━━━ ━━━  Low activity (15 min)
11 PM ━━━━━━━━━━━  Regular monitoring (5 min)
```

**Voiceover**:
> "Over the course of a day, Cronicorn adapts to your system's behavior—tightening during issues, relaxing during stability, and always staying within your safety constraints."

---

## 🎛️ **ACT 4: THE CONTROL** (2:15 - 2:45)

### Scene 8: Execution History & Debugging (2:15 - 2:30)
**Visual**: Detailed run view with rich metadata

**Actions**:
1. Click into a specific failed run
2. Show detailed execution record:
   ```
   Run #1,234
   Status: Failure
   Started: 2024-12-19 10:15:32
   Duration: 1,243ms
   Source: baseline-interval
   
   Response:
   Status Code: 500
   Headers: {...}
   Body: {
     "error": "Internal Server Error",
     "message": "Database connection timeout"
   }
   
   Error Details:
   Database pool exhausted after 1.2s
   ```
3. Show filters/search:
   - Filter by status (success/failure)
   - Search by date range
   - Export to CSV option visible

**On Screen**: Clean, readable JSON formatting with syntax highlighting

**Voiceover**:
> "Every execution is fully logged with timestamps, response details, and error messages. When something breaks, you have everything you need to debug quickly."

### Scene 9: AI Transparency (2:30 - 2:45)
**Visual**: AI decisions explained in plain English

**Actions**:
1. Navigate to endpoint settings or info panel
2. Show "AI Status" section:
   ```
   AI Scheduling: Enabled ✓
   
   Current Hint:
   • Interval: 30 seconds
   • Expires: in 42 minutes
   • Reason: 3 consecutive failures detected at 10:15 AM
   
   Baseline Schedule:
   • Every 5 minutes (300,000ms)
   
   Safety Constraints:
   • Min: 30 seconds (prevents rate limiting)
   • Max: 15 minutes (ensures timely monitoring)
   
   Recent AI Actions:
   • 10:15 AM - Increased frequency to 30s (failures)
   • 9:30 AM - Decreased to 15 min (stable 2 hrs)
   • 8:45 AM - Returned to baseline (hint expired)
   ```

**On Screen Callout**: Highlight the explainability
```
Every AI decision is explained
No black box magic
```

**Voiceover**:
> "Unlike black-box AI, every decision Cronicorn makes is explained in plain English. You see exactly why schedules changed, when hints expire, and how constraints are applied."

---

## 📞 **ACT 5: THE CLOSE** (2:45 - 3:00)

### Scene 10: Call to Action (2:45 - 3:00)
**Visual**: Split screen → Key features summary → CTA

**Actions**:
1. Show split screen with key benefits:

**Left Side - Traditional Cron**:
```
❌ Static schedules
❌ Manual adjustments
❌ No learning
❌ Over-polling or under-monitoring
❌ Complex backoff logic
```

**Right Side - Cronicorn**:
```
✅ Adaptive schedules
✅ Automatic optimization
✅ AI learning
✅ Perfect balance (min/max)
✅ Zero code changes
```

2. Transition to CTA screen:
```
Get Started in 5 Minutes
↓
https://cronicorn.com

✓ Free tier available
✓ No credit card required
✓ Self-hosting option
```

3. Show secondary CTAs:
```
📖 Read the Docs: docs.cronicorn.com
🤖 Use with AI: npm install -g @cronicorn/mcp-server
💻 Self-Host: github.com/weskerllc/cronicorn
```

**Voiceover**:
> "Stop manually adjusting schedules at 2 AM. Let Cronicorn adapt automatically while you focus on building. Sign up free at cronicorn.com, or self-host with our open-source package. Your cron jobs just got smarter."

---

## 🎯 Key Value Propositions to Emphasize

Throughout the demo, repeatedly emphasize these core benefits:

### 1. **Zero Code Changes**
- No SDK to install
- No code to deploy
- Just point at your existing HTTP endpoints

### 2. **Automatic Adaptation**
- Tightens during failures
- Relaxes during stability
- No manual tuning required

### 3. **Safety-First Design**
- Min/max constraints prevent runaway behavior
- AI always respects your boundaries
- Graceful degradation (baseline continues if AI unavailable)

### 4. **Complete Transparency**
- Every execution logged
- Every AI decision explained
- Full debugging context

### 5. **Developer-Friendly**
- 5-minute setup
- Clean, intuitive UI
- MCP integration for AI assistants
- Self-hosting option

---

## 🎥 Production Notes

### Recording Setup

**Screen Recording**:
- Resolution: 1920x1080 (16:9) or 1280x720 for smaller file size
- Frame rate: 30 FPS minimum, 60 FPS preferred
- Software: OBS Studio, Loom, or ScreenFlow

**Audio**:
- Voiceover recorded separately in quiet environment
- Use quality microphone (Blue Yeti, Rode NT-USB, etc.)
- Record room tone for noise reduction

**Browser Setup**:
- Clean browser profile (no extensions visible)
- Zoom: 100% or 125% for readability
- Hide bookmarks bar
- Use Chrome DevTools if showing network requests
- Dark mode or light mode (be consistent)

### Visual Design

**Color Coding**:
- 🟢 Green: Successful executions
- 🔴 Red: Failed executions
- 🟡 Yellow: Warnings or rate limits
- 🔵 Blue: AI actions/hints
- ⚪ Gray: Paused or disabled

**Typography**:
- Use monospace font for code/URLs: `Fira Code`, `JetBrains Mono`
- Use sans-serif for UI text: `Inter`, `SF Pro`
- Minimum font size: 16px for readability

**Animations**:
- Smooth transitions: 300-500ms
- Highlight important changes with subtle glow/pulse
- Use motion to guide eye to key information

### Timeline Visualization

**Critical Element**: The execution timeline is the star of the demo.

**Requirements**:
- Clear temporal axis (time on X-axis)
- Visual distinction between different schedule sources:
  - `baseline-interval`: Regular dots/bars
  - `ai-interval`: Different color/pattern
  - `ai-oneshot`: Special marker (star/lightning bolt)
- Status indication: green (success), red (failure), yellow (timeout)
- Zoomable/pannable for detailed inspection
- Annotations for key events

**Example Visual**:
```
Timeline View
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10:00 ✓ ━━━━ ✓ ━━━━ ✓ ━━━━ ✗ ▓ ✗ ▓ ✗ ▓ ✓ ━━━━ ✓
      └─ 5min ─┘    └─ 5min ─┘  └30s┘  └─ 5min ─┘
      Baseline       Crisis      AI       Recovery
```

### Pacing

**Slow Down For**:
- Key form inputs (let viewers read field names)
- First-time concepts (min/max constraints)
- AI decision explanations (pause on text)

**Speed Up For**:
- Navigation between pages
- Repeated actions
- Long waits (use time-lapse or cuts)

**Use Jump Cuts**:
- When waiting for executions to occur
- During authentication flows
- When switching between views

---

## 🎬 Alternative Scenarios

Depending on the actual demo app available, here are alternative scenarios:

### Scenario A: E-Commerce Inventory Sync
**Use Case**: Syncing product inventory from Shopify to warehouse system

**Setup**:
- Endpoint: `POST https://api.warehouse.com/sync/inventory`
- Baseline: Every 10 minutes
- Min: 2 minutes, Max: 1 hour

**Demo Flow**:
1. Normal operation at 10-minute intervals
2. Flash sale starts → lots of inventory changes
3. AI detects high change rate, increases to every 2 minutes
4. Sale ends → AI backs off to 30 minutes (respecting max)

### Scenario B: DevOps Health Monitoring
**Use Case**: Monitoring microservice health across 5 services

**Setup**:
- 5 endpoints, one per service
- All running at 5-minute baseline
- Coordinated monitoring (show multiple timeline)

**Demo Flow**:
1. All services healthy at 5-minute checks
2. Service A starts failing → AI tightens to 30 seconds
3. Service B shows warnings → AI slightly increases its frequency
4. Service A recovers → both gradually return to baseline

### Scenario C: API Rate Limit Respect
**Use Case**: Polling third-party API with rate limits

**Setup**:
- Endpoint: External API with 100 requests/hour limit
- Baseline: Every minute (60 requests/hour - safe buffer)
- Min: 45 seconds (hard limit)

**Demo Flow**:
1. Normal polling at 1-minute intervals
2. Show "close to rate limit" indicator
3. AI backs off to every 90 seconds to stay under limit
4. Rate limit resets → AI returns to normal frequency

---

## 🎯 Success Metrics

After publishing the demo, track:

**Engagement**:
- View duration (target: >80% completion rate)
- Drop-off points (identify confusing sections)
- Replay rate (indicates value)

**Conversion**:
- Sign-up rate from video viewers
- Time-to-first-job for viewers vs non-viewers
- GitHub star/fork rate after watching

**Feedback**:
- Comments mentioning specific features
- Questions about AI behavior
- Requests for additional use cases

---

## 📋 Pre-Demo Checklist

### Technical Setup
- [ ] Clean Cronicorn account with no existing jobs
- [ ] Test API endpoint that can simulate failures on demand
- [ ] Verify AI scheduling is enabled in settings
- [ ] Test timeline visualization works smoothly
- [ ] Confirm all UI elements are polished

### Recording Environment
- [ ] Close unnecessary applications
- [ ] Hide desktop icons/clutter
- [ ] Disable notifications (Do Not Disturb mode)
- [ ] Clear browser history/cache for clean session
- [ ] Test audio levels and clarity
- [ ] Verify screen recording quality

### Content Preparation
- [ ] Write full voiceover script
- [ ] Practice timing (aim for 2:30-3:00)
- [ ] Prepare fallback recordings (if live demo fails)
- [ ] Create thumbnail image for video
- [ ] Prepare captions/subtitles for accessibility

### Post-Production
- [ ] Add subtle background music (non-distracting)
- [ ] Include captions for key terms (on-screen text)
- [ ] Add Cronicorn logo/branding watermark
- [ ] Create multiple versions (2min, 3min, 5min extended)
- [ ] Export in multiple formats (MP4 for web, GIF preview)

---

## 📊 Distribution Strategy

### Primary Placement
1. **GitHub README** (above the fold)
   - Embedded video or animated GIF
   - Link to full video on YouTube/Vimeo
   
2. **Homepage Hero Section**
   - Auto-play (muted) with unmute option
   - Full-screen expandable view

### Secondary Placement
3. **Documentation Landing Page**
   - "See it in action" section
   
4. **Social Media**
   - Twitter/X: 30-second teaser
   - LinkedIn: 60-second version
   - Reddit: Full version with discussion
   
5. **Product Hunt Launch**
   - Featured gallery video
   - Demo GIF in comments

### SEO Optimization
- Upload to YouTube with keywords: "cron scheduler", "job scheduling", "adaptive scheduling", "AI cron"
- Detailed video description with timestamps
- Links to docs and GitHub in description
- Add to playlist: "Cronicorn Tutorials"

---

## 🎬 Script Template (Voiceover)

```
[ACT 1 - PROBLEM]
Traditional cron jobs run on a fixed schedule—whether your API is healthy, 
failing, or being rate-limited. When things go wrong, you're the one 
adjusting schedules at 2 AM.

Cronicorn is different. It's a scheduler that learns from your endpoints 
and adapts automatically—like having a DevOps engineer monitoring your 
jobs 24/7.

[ACT 2 - SETUP]
Let's set up our first job. After signing in with GitHub, we start with 
an empty dashboard. No complex configuration—just add a job.

Jobs are containers for related endpoints. Let's create one for API 
health monitoring.

Now we define the endpoint URL, set a baseline schedule of every 5 minutes, 
and add safety constraints. The minimum prevents rate limiting, the maximum 
ensures we catch issues quickly. These constraints keep AI suggestions 
within safe bounds.

[ACT 3 - MAGIC]
Initially, executions run on our baseline schedule—every 5 minutes, just 
like traditional cron. Everything's healthy, so the schedule stays steady.

Watch what happens when errors occur. After three failures, Cronicorn's AI 
automatically tightens the schedule to every 30 seconds—our minimum interval. 
We're now monitoring closely to catch the moment things recover.

As soon as the API recovers, Cronicorn detects the sustained success and 
gradually backs off. After stability is confirmed, we return to the baseline 
5-minute schedule. No manual intervention required.

Over the course of a day, Cronicorn adapts to your system's behavior—
tightening during issues, relaxing during stability, and always staying 
within your safety constraints.

[ACT 4 - CONTROL]
Every execution is fully logged with timestamps, response details, and 
error messages. When something breaks, you have everything you need to 
debug quickly.

Unlike black-box AI, every decision Cronicorn makes is explained in plain 
English. You see exactly why schedules changed, when hints expire, and 
how constraints are applied.

[ACT 5 - CLOSE]
Stop manually adjusting schedules at 2 AM. Let Cronicorn adapt automatically 
while you focus on building. Sign up free at cronicorn.com, or self-host 
with our open-source package.

Your cron jobs just got smarter.
```

---

## 🔄 Iteration Plan

### Version 1.0 (Initial Release)
- Focus on core value prop: AI adaptation
- Single use case: API health monitoring
- Duration: 2:30 - 3:00

### Version 1.1 (After Feedback)
- Add real customer testimonials
- Show multiple concurrent endpoints
- Include mobile view of dashboard

### Version 2.0 (Extended Cut)
- Multiple use cases (5-7 minutes)
- Developer interview/testimonial
- Deep dive into AI decision-making
- Integration examples (webhooks, CI/CD)

### Micro-Content Derivatives
From the main demo, create:
1. **30-second teaser**: Problem → Solution → CTA
2. **60-second overview**: Setup → Adaptation → Sign up
3. **Animated GIF**: Timeline visualization only (10-15 seconds)
4. **Screenshots**: For docs and social media
5. **Feature spotlights**: 15-second clips per feature

---

## 💡 Additional Creative Ideas

### Interactive Demo
- Embed a live, sandboxed demo on the website
- Let users click "Create Job" and "Simulate Failure"
- Show real-time AI adaptation without signing up

### Developer Commentary Track
- Record a second version with developer explaining technical details
- Show architecture diagrams
- Discuss trade-offs and design decisions

### Comparison Video
- Side-by-side: Cronicorn vs traditional cron
- Same scenario, different outcomes
- Highlight manual work saved

### "Day in the Life"
- Show 24-hour time-lapse of real production system
- Visualize thousands of executions
- Demonstrate reliability and scale

---

## 🎯 Final Notes

**Remember**: The goal is not to show every feature, but to demonstrate the **core value proposition** clearly:

1. **Easy setup** (like traditional cron)
2. **Automatic adaptation** (the unique differentiator)
3. **Full visibility** (production-ready reliability)

Keep it simple, focused, and compelling. Let the product speak for itself through real behavior, not marketing hype.

**Most Important**: Show, don't tell. The timeline visualization of AI adaptation in action is worth a thousand words.

---

**Next Steps**:
1. ✅ Review this plan with the team
2. ⏳ Prepare demo environment and test endpoint
3. ⏳ Record voiceover script
4. ⏳ Shoot screen recordings
5. ⏳ Edit and polish
6. ⏳ Review and iterate
7. ⏳ Publish and promote

---

*Document created: 2024-12-19*  
*Last updated: 2024-12-19*  
*Owner: Marketing/Product Team*
