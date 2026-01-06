# Cronicorn Project Demo - Design Document

## Executive Summary

This document outlines the design for an interactive project demo that will help new users quickly understand Cronicorn's value proposition and increase conversion rates. The design is based on research of successful developer tools (Stripe, Twilio, GitHub) and incorporates proven patterns for developer onboarding.

## Research Findings

### Key Success Metrics from Industry Leaders

**Twilio's Redesigned Onboarding:**
- 62% improvement in first message activation
- 33% improvement in production launches
- Key features: Virtual testing environment, personalized paths, embedded learning

**Common Patterns Across Stripe, Twilio, and GitHub:**
1. **Developer-first experience** - Remove all friction
2. **Clear documentation & self-service** - Enable fast integration
3. **Interactive demos** - Working samples + code visibility + low friction entry
4. **Immediate testing** - Try before signup
5. **Personalized paths** - Tailor experience to use case
6. **Embedded credentials** - Pre-filled examples that just work

### What Makes Demos Effective

1. **Working sample** - Interactive click-through demonstration
2. **Code visibility** - Code snippets shown alongside results
3. **Low friction entry** - No development skills or signup required initially
4. **Contextual defaults** - Pre-populated with realistic data
5. **Immediate value** - Show benefit in < 5 minutes
6. **Multiple entry points** - Different demos for different personas

## Cronicorn's Current State

### Strengths
- Excellent landing page with timeline animation
- Clear value proposition and use cases
- Comprehensive documentation
- MCP server (unique differentiator!)
- API playground exists

### Gaps
- No "try it now" interactive experience
- No pre-configured live examples users can execute
- No guided tutorial showing value in < 5 minutes
- No demo video
- No sandbox environment for immediate testing

## Proposed Demo Structure

### 1. Interactive Playground (HIGHEST PRIORITY)

**Goal:** Let users trigger real job executions and see AI adaptation in action without signup.

**Implementation:**
- Public demo environment with pre-configured jobs
- Multiple scenario templates (flash sale, system monitoring, API health)
- Click to trigger events: "Simulate traffic surge", "Simulate API failure"
- Real-time visualization of:
  - Executions appearing on timeline
  - AI decisions being made
  - Interval adjustments happening
  - Recovery actions triggering
- View execution logs and AI reasoning
- No authentication required for demo mode

**User Flow:**
1. Land on demo page
2. Choose a scenario (E-commerce, DevOps, Data Pipeline)
3. Click "Start Demo"
4. Interactive controls appear: "Simulate surge", "Simulate failure", "Reset"
5. Watch timeline update in real-time
6. View AI decision logs: "Detected traffic surge +400% → Tightening interval 5m → 30s"
7. CTA: "Try with your own endpoints" → Sign up

**Technical Approach:**
- Demo tenant with rate-limited API access
- Pre-seeded jobs and endpoints
- WebSocket for real-time updates
- State machine for scenario simulation
- Reset functionality to replay demos

### 2. Guided Quick Start Tutorial (HIGH PRIORITY)

**Goal:** Show value in 3 steps, < 5 minutes.

**Structure:**

**Step 1: Create Your First Job (30 seconds)**
```bash
curl -X POST https://api.cronicorn.com/v1/jobs \
  -H "x-api-key: demo_XXXXXXXXX" \
  -d '{
    "name": "My Health Monitor",
    "description": "Monitor my API health"
  }'
```
✅ Result: Job created with ID `job_abc123`

**Step 2: Add an Endpoint (45 seconds)**
```bash
curl -X POST https://api.cronicorn.com/v1/jobs/job_abc123/endpoints \
  -H "x-api-key: demo_XXXXXXXXX" \
  -d '{
    "name": "API Health Check",
    "url": "https://your-api.com/health",
    "method": "GET",
    "schedule": {
      "type": "interval",
      "value": 300000
    }
  }'
```
✅ Result: Endpoint scheduled, first execution in 5 minutes

**Step 3: Watch It Run (3 minutes)**
- Open dashboard
- See first execution complete
- View execution details
- Enable AI adaptation (toggle)
- Simulate a failure
- Watch AI respond

**Total Time:** < 5 minutes
**Outcome:** User sees complete workflow from API to execution to AI adaptation

### 3. Video Demo (MEDIUM PRIORITY)

**Format:** 2-3 minute screencast

**Script:**
1. **Problem (30s):** "You're monitoring your API every 5 minutes. Traffic surges. Do you manually adjust? Hope for the best?"
2. **Solution (60s):** Show Cronicorn detecting surge → tightening interval → recovering → relaxing back
3. **Unique Value (30s):** "Every decision explained. Always auditable. Respects your constraints."
4. **CTA (15s):** "Start free. No credit card. Install MCP server or use API."

**Key Scenes:**
- Timeline animation with real data
- AI decision log showing reasoning
- Dashboard with metrics
- Code snippet for setup
- MCP server integration with Claude

### 4. Live Scenario Simulators (MEDIUM PRIORITY)

**Four Pre-Built Scenarios:**

**A. E-commerce Flash Sale**
- Baseline: 1.2k RPM, 45 orders/min
- Control: "Launch Sale" button
- Effect: Traffic → 6.8k RPM, orders → 290/min
- AI Response: Interval tightens 5m → 30s, cache warming activates
- Duration: 2-minute simulation

**B. System Degradation**
- Baseline: CPU 45%, errors 0.5%
- Control: "Simulate Load Spike" button
- Effect: CPU → 82%, errors → 2.8%
- AI Response: Monitoring escalates 15m → 3m, investigation tools activate
- Duration: 90-second simulation

**C. Data Pipeline Failure**
- Baseline: Extract running, Transform queued, Load idle
- Control: "Simulate API Timeout" button
- Effect: Extract fails
- AI Response: Downstream pauses, auto-retry triggered, pipeline recovers
- Duration: 2-minute simulation

**D. API SLA Breach**
- Baseline: Latency 45ms, 99.98% uptime
- Control: "Degrade Performance" button
- Effect: Latency → 185ms, errors spike
- AI Response: Escalates to 1-min checks, attempts recovery, alerts team
- Duration: 90-second simulation

**Implementation:**
- Each scenario is self-contained
- State machine controls progression
- Animations show state changes
- Logs stream AI decisions
- Reset button to replay

### 5. Code Playground with Live Results (LOW PRIORITY)

**Similar to Stripe/Twilio API explorers:**

**Features:**
- Multi-tab code editor (cURL, Node, Python, Go)
- Pre-populated with demo API key
- "Run" button executes request
- Response shown in real-time
- Common operations pre-filled:
  - Create job
  - Add endpoint
  - List executions
  - Get AI sessions
  - Update schedule

**User Flow:**
1. Select operation from dropdown
2. Code auto-populates
3. Modify if desired
4. Click "Run"
5. See response
6. Next step suggested

### 6. MCP Server Quick Start (HIGH PRIORITY - Unique Differentiator)

**Goal:** Show AI-native workflow in < 2 minutes.

**Demo Flow:**

**Setup (Copy-paste):**
```bash
npm install -g @cronicorn/mcp-server
```

**Configure (Auto-generated):**
```json
{
  "mcpServers": {
    "cronicorn": {
      "command": "npx",
      "args": ["-y", "@cronicorn/mcp-server"],
      "env": {
        "CRONICORN_API_KEY": "demo_XXXXXXXXX"
      }
    }
  }
}
```

**Use (Natural Language):**
```
User: "Set up a job that checks my API health every 5 minutes"
AI: [Uses MCP server to create job and endpoint]
    ✅ Job created: "API Health Monitor"
    ✅ Endpoint added: https://api.example.com/health
    ✅ Schedule: Every 5 minutes
    ✅ First run: In 4 minutes

User: "Show me why that endpoint failed"
AI: [Fetches execution details and AI session]
    The endpoint failed at 14:23 UTC because:
    - HTTP 503 (Service Unavailable)
    - Response time: 30,042ms (timeout)
    - AI adjusted interval to 15 minutes
    - Reason: "Consecutive failures detected, applying backoff"
```

**Video/GIF showing this flow:** Record the actual conversation, show results in both chat and dashboard.

## Implementation Roadmap

### Phase 1: MVP Demo (Week 1)
- [ ] Interactive playground with 1 scenario (flash sale)
- [ ] Guided 3-step tutorial with demo API key
- [ ] Demo page route and UI components
- [ ] WebSocket infrastructure for real-time updates

### Phase 2: Enhanced Scenarios (Week 2)
- [ ] Add remaining 3 scenarios (system, pipeline, API)
- [ ] Scenario simulation state machines
- [ ] Enhanced timeline visualization
- [ ] AI decision log streaming

### Phase 3: Video & Code Playground (Week 3)
- [ ] Record 2-3 minute demo video
- [ ] Code playground with multi-language support
- [ ] Embedded video player on demo page
- [ ] MCP server quick start section

### Phase 4: Polish & Optimization (Week 4)
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Analytics tracking
- [ ] A/B testing setup
- [ ] SEO optimization

## Success Metrics

**Primary:**
- Demo completion rate: Target 60%+
- Demo-to-signup conversion: Target 15%+
- Time to first "aha moment": Target < 2 minutes

**Secondary:**
- Demo page bounce rate: Target < 30%
- Scenario simulation completions: Track per scenario
- Video watch completion: Target 50%+
- MCP server installs from demo: Track

**Tracking Events:**
- `demo_page_view`
- `scenario_selected`
- `simulation_started`
- `simulation_completed`
- `demo_reset`
- `cta_clicked`
- `signup_from_demo`

## Design Specifications

### Visual Style
- Consistent with existing Cronicorn branding
- Timeline visualization (already built, enhance for interactivity)
- Real-time animations (subtle, purposeful)
- Color coding: Green (stable), Yellow (warning), Red (critical), Blue (AI action)

### Layout
```
+------------------------------------------+
| Navigation                          [CTA]|
+------------------------------------------+
| Hero: "See Cronicorn in Action"          |
| Subtext: "No signup required"            |
+------------------------------------------+
| [Scenario Tabs: Flash Sale | Monitoring | |
|  Pipeline | API Health]                  |
+------------------------------------------+
|                                          |
| Timeline Visualization (Interactive)     |
|                                          |
| [Simulate Surge] [Simulate Failure]      |
|                                          |
+------------------------------------------+
| AI Decision Log (Streaming)              |
| • Detected traffic surge +400%           |
| • Tightening interval: 5m → 30s          |
| • Reason: Prevent missed incidents       |
+------------------------------------------+
| "Ready to try with your endpoints?"      |
| [Start Free] [Watch Video] [View Docs]   |
+------------------------------------------+
```

### Mobile Considerations
- Simplified controls
- Vertical layout
- Touch-friendly buttons
- Auto-play scenarios (vs manual triggers)

## Content Strategy

### Positioning
- **Primary message:** "See intelligent scheduling in action"
- **Secondary message:** "No signup. No waiting. Just explore."
- **Tertiary message:** "Every decision explained, fully auditable"

### Copy Principles
- Action-oriented ("Simulate", "Trigger", "Watch", "Try")
- Clear outcomes ("See AI adapt in real-time")
- Low friction ("No signup required", "Reset anytime")
- Educational ("Learn why each decision was made")

## Technical Architecture

### Components
```
/apps/web/src/routes/_public/demo.tsx          - Demo page route
/apps/web/src/components/demo/                 - Demo components
  - playground.tsx                             - Main playground
  - scenario-selector.tsx                      - Tab navigation
  - simulation-controls.tsx                    - Trigger buttons
  - timeline-live.tsx                          - Real-time timeline
  - ai-decision-log.tsx                        - Streaming log
  - quick-start-tutorial.tsx                   - 3-step guide
  - code-playground.tsx                        - API explorer
  - mcp-quick-start.tsx                        - MCP demo

/packages/domain/demo/                         - Demo domain logic
  - scenario-simulator.ts                      - State machines
  - demo-events.ts                             - Event definitions
  - demo-data.ts                               - Seeded data

/apps/api/src/routes/demo/                     - Demo API endpoints
  - demo-scenarios.ts                          - GET /demo/scenarios
  - demo-trigger.ts                            - POST /demo/trigger
  - demo-reset.ts                              - POST /demo/reset
```

### Data Flow
1. User selects scenario → Load scenario config
2. User clicks "Simulate" → POST to demo API
3. API runs simulation → Updates demo state
4. WebSocket pushes updates → Client receives events
5. UI updates timeline → Shows AI decisions
6. Logs stream → Decision log updates

### Demo Tenant
- Special tenant ID: `tenant_demo`
- Rate limited: 100 req/min
- Auto-reset every 1 hour
- No persistent state
- Pre-seeded jobs and endpoints
- Simulated execution results

## Marketing Integration

### Landing Page Integration
- Add "Try Demo" CTA in hero section
- Replace or enhance existing timeline with interactive version
- Add demo link in navigation

### Documentation Integration
- Link to demo from Quick Start guide
- Embed scenario videos in use cases docs
- Reference demo in MCP server docs

### Social Media
- Create GIFs of each scenario
- Tweet thread showing demo workflow
- LinkedIn post with video demo
- Product Hunt launch with demo as centerpiece

## Competitive Analysis

### Cronicorn's Unique Demo Advantages
1. **AI transparency** - Show actual AI reasoning (others are black boxes)
2. **MCP integration** - AI-native workflow (no one else has this)
3. **Real-time adaptation** - See changes happen live (not just marketing claims)
4. **Scenario library** - Multiple industry-specific demos (most show generic examples)

### Positioning vs Competitors
- **Cron services:** "Try intelligent adaptation, not just fixed schedules"
- **Zapier/n8n:** "See AI-powered timing, not just workflow automation"
- **Monitoring tools:** "Watch proactive adaptation, not reactive alerts"

## Open Questions / Future Enhancements

1. Should demo API key be completely public or require email?
   - **Recommendation:** Start public, add optional email capture for extended demo

2. Should we track demo usage analytics?
   - **Recommendation:** Yes, essential for optimization

3. Should demo state persist across sessions?
   - **Recommendation:** No, always start fresh (predictable experience)

4. Should we build sandbox mode into main product?
   - **Recommendation:** Future enhancement, separate from this demo

5. Should we add multiplayer/collaborative demo?
   - **Recommendation:** Not for MVP, consider for phase 2

## Appendix: Research Sources

### Articles Reviewed
- [Developer Onboarding: Twilio](https://betta.io/blog/2017/01/09/developer-experience-review-twilio/)
- [Twilio's New Onboarding](https://www.twilio.com/en-us/blog/developers/redesigning-twilio-onboarding-experience-whats-new)
- [How Stripe, Twilio, and GitHub Built Developer Trust](https://business.daily.dev/resources/cracking-the-code-how-stripe-twilio-and-github-built-dev-trust)

### Key Takeaways Applied
- ✅ Low friction entry (no signup for demo)
- ✅ Immediate value (see results in < 2 min)
- ✅ Contextual defaults (pre-configured scenarios)
- ✅ Embedded learning (tutorial within demo)
- ✅ Multiple paths (scenarios for different personas)
- ✅ Code visibility (show API alongside UI)
- ✅ Transparent decisions (AI reasoning visible)

---

**Document Status:** Draft for Implementation
**Last Updated:** 2026-01-06
**Author:** Claude (AI Assistant)
**Next Steps:** Review with team → Implement Phase 1 → Iterate based on metrics
