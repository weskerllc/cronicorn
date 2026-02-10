# Dashboard Redesign Proposal
**Date:** 2025-11-06  
**Status:** Proposal  
**Author:** System Analysis

---

## Executive Summary

The current dashboard provides data but lacks a cohesive "full picture" view that enables users to quickly understand system health, AI effectiveness, and temporal execution patterns. This proposal introduces three new visualizations—**Job Health Overview**, **Scheduling Intelligence Panel**, and **Execution Timeline**—that transform the dashboard from a data display into an actionable insights platform.

**Core Problem:** Users must scan 50+ table rows to answer basic questions like "which jobs are unhealthy?", "is AI working?", or "in what order are things running?"

**Solution:** Add visual summaries that answer these questions at a glance while maintaining drill-down capabilities for investigation.

---

## Design Goals Alignment

### Primary Goals
1. **Full Picture at a Glance** - Users should understand system state in 3-5 seconds
2. **Enable Quick Navigation** - Click visualizations to filter details
3. **Surface Temporal Patterns** - Show execution order, timing, and trends
4. **Highlight AI Effectiveness** - Make adaptive scheduling visible and measurable
5. **Maintain Context** - Show relationships between jobs, endpoints, runs, and AI sessions

### System-Specific Requirements
Given Cronicorn's architecture (dual-worker, database-mediated, AI-adaptive scheduling):
- Visualize the **Scheduler's work** (executions, success/failure patterns)
- Visualize the **AI Planner's impact** (hint acceptance, schedule changes)
- Show **temporal relationships** (execution order, conflicts, cadence changes)
- Expose **scheduling sources** (baseline vs AI-driven vs clamped)
- Enable **job-centric workflows** (jobs are user's mental model, not individual endpoints)

---

## Proposed Visualizations

### 1. Job Health Overview (Horizontal Bar Chart)

**Purpose:** Answer "which jobs are healthy/unhealthy?" at a glance

**Design:**
- **Chart Type:** Horizontal stacked bar chart (recharts BarChart)
- **Y-axis:** Job names (one bar per job)
- **X-axis:** Run count (0 to max)
- **Segments:** 
  - Green segment: Successful runs
  - Red segment: Failed runs
  - Stacked to show total runs
- **Sorting:** By success rate ascending (problems first)
- **Color Coding:**
  - Green bar: >95% success rate (healthy)
  - Yellow bar: 80-95% success rate (degraded)
  - Red bar: <80% success rate (critical)

**Interaction:**
- **Hover:** Shows tooltip with exact metrics (job name, success rate %, success count, failure count, total runs, last run timestamp)
- **Click:** Filters all dashboard tables to selected job
- **Visual Feedback:** Clicked bar highlights, filter badge appears above tables

**Data Source:**
```typescript
// Aggregate from existing DashboardStats.recentRuns
const jobHealthData = Object.entries(
  recentRuns.reduce((acc, run) => {
    const job = run.jobName;
    if (!acc[job]) acc[job] = { success: 0, failure: 0, total: 0 };
    acc[job].total++;
    if (run.status === 'success') acc[job].success++;
    else acc[job].failure++;
    return acc;
  }, {})
).map(([jobName, stats]) => ({
  jobName,
  successRate: (stats.success / stats.total) * 100,
  successCount: stats.success,
  failureCount: stats.failure,
  totalRuns: stats.total,
}))
.sort((a, b) => a.successRate - b.successRate); // Problems first
```

**Justification:**
- **Addresses Gap:** Current tables require scanning every row to understand job-level health
- **Leverages Architecture:** Jobs are natural grouping units in Cronicorn
- **Enables Workflows:** Click unhealthy job → see its failed runs → investigate endpoint issues
- **Visual Efficiency:** Color + position encode health status (red bars at top = immediate attention)

**Example Insights:**
- "Payment Processing" job at 35% success (red bar) needs immediate attention
- "Analytics Pipeline" job at 98% success (green bar) is stable
- "Data Sync" job at 85% success (yellow bar) is degrading, monitor closely

---

### 2. Scheduling Intelligence Panel (Donut Chart)

**Purpose:** Answer "how much is AI influencing my system?" at a glance

**Design:**
- **Chart Type:** Donut/Pie chart (recharts PieChart with innerRadius)
- **Segments:** Distribution of scheduling sources from `run.source` field
  - `baseline-cron` - Blue (neutral)
  - `baseline-interval` - Light blue (neutral)
  - `ai-interval` - Green (AI adaptive)
  - `ai-oneshot` - Dark green (AI adaptive)
  - `clamped-min` - Yellow (constraint)
  - `clamped-max` - Yellow (constraint)
  - `paused` - Gray (manual override)
- **Center Label:** Large percentage showing "AI-Driven" runs (sum of ai-interval + ai-oneshot)
- **Legend:** Shows all sources with counts and percentages

**Interaction:**
- **Hover Segment:** Shows exact count and percentage for that source
- **Click Segment:** Filters tables to runs with that source type
- **Visual Feedback:** Selected segment highlights, filter badge appears

**Data Source:**
```typescript
// Aggregate from existing DashboardStats.recentRuns
const sourceDistribution = recentRuns.reduce((acc, run) => {
  const source = run.source || 'unknown';
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {});

const aiDrivenPct = (
  (sourceDistribution['ai-interval'] || 0) + 
  (sourceDistribution['ai-oneshot'] || 0)
) / recentRuns.length * 100;

const chartData = Object.entries(sourceDistribution).map(([source, count]) => ({
  source,
  count,
  percentage: (count / recentRuns.length) * 100,
  fill: getSourceColor(source),
}));
```

**Color Palette:**
```typescript
const sourceColors = {
  'baseline-cron': 'hsl(210 40% 60%)',      // Blue - baseline
  'baseline-interval': 'hsl(210 40% 75%)',  // Light blue - baseline
  'ai-interval': 'hsl(142 71% 45%)',        // Green - AI success
  'ai-oneshot': 'hsl(142 71% 35%)',         // Dark green - AI
  'clamped-min': 'hsl(47 85% 57%)',         // Yellow - constraint
  'clamped-max': 'hsl(47 85% 57%)',         // Yellow - constraint
  'paused': 'hsl(var(--muted-foreground))', // Gray - manual
  'unknown': 'hsl(var(--muted))',           // Light gray
};
```

**Justification:**
- **Addresses Gap:** No current visibility into how AI affects scheduling behavior
- **Leverages Architecture:** Scheduler records source for every run, making this data naturally available
- **Measures AI Effectiveness:** Growing green segment = AI is actively managing schedules
- **Identifies Configuration Issues:** 
  - High yellow (clamped) % = constraints too restrictive, AI can't adapt
  - High gray (paused) % = too many manual interventions
  - Low green (AI) % = AI isn't finding patterns to optimize

**Example Insights:**
- "42% AI-Driven" with growing trend = AI is working, system is adapting
- "15% Clamped" = minIntervalMs constraints preventing 15% of AI suggestions
- "3% Paused" = 3% of runs blocked by manual pauses (maintenance windows)
- "55% Baseline" = majority still running on user-configured schedules (could be good if stable)

---

### 3. Execution Timeline (Scatter/Gantt Chart)

**Purpose:** Answer "in what order are things running?" and "what temporal patterns exist?"

**Design:**
- **Chart Type:** Scatter plot or Gantt-style chart (recharts ScatterChart or custom BarChart)
- **X-axis:** Time (last 24 hours by default, configurable to 7 days)
- **Y-axis:** Job names or Endpoint names (toggle between views)
- **Data Points/Bars:**
  - **Position:** When execution started (`startedAt`)
  - **Length (if Gantt):** Execution duration (`durationMs`)
  - **Color:** Execution status
    - Green: Success
    - Red: Failure
    - Yellow: Timeout
    - Gray: Cancelled
  - **Opacity/Pattern:** Scheduling source
    - Solid: Baseline schedules
    - Striped/Dotted: AI-driven
    - Outlined: Clamped

**View Modes:**
1. **24-Hour Detailed View**
   - Shows exact execution times with bar lengths
   - Best for understanding execution order and overlaps
   - Granular time axis (hourly markers)

2. **7-Day Pattern View**
   - Condenses to dots (no bar lengths)
   - Shows daily patterns and trends
   - Daily time axis markers

3. **Job-Grouped View**
   - Y-axis shows jobs (default)
   - Good for understanding job-level execution order
   - Helps identify job dependencies

4. **Endpoint-Grouped View**
   - Y-axis shows individual endpoints
   - Good for per-endpoint pattern analysis
   - Helps identify problematic endpoints

**Interaction:**
- **Hover Point/Bar:** Tooltip shows full details (timestamp, endpoint, job, status, duration, source, response time)
- **Click Point/Bar:** Filters tables to that specific run
- **Click Time Range:** Filters to runs in that time window
- **Zoom:** Click and drag to zoom into specific time period
- **Toggle Controls:**
  - Time range selector (24h / 7d)
  - Grouping selector (Jobs / Endpoints)
  - Filter toggles (show only failures, show only AI-driven, etc.)

**Data Source:**
```typescript
// Transform existing DashboardStats.recentRuns
const timelineData = recentRuns
  .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  .map(run => ({
    timestamp: new Date(run.startedAt).getTime(),
    endTimestamp: new Date(run.startedAt).getTime() + (run.durationMs || 0),
    groupLabel: groupByJob ? run.jobName : run.endpointName,
    status: run.status,
    source: run.source,
    duration: run.durationMs,
    runId: run.id,
    // Full run object for tooltip
    ...run,
  }));

// Group by Y-axis category
const grouped = groupBy(timelineData, 'groupLabel');
```

**Justification:**
- **Addresses Critical Gap:** No current way to visualize execution order or temporal patterns
- **Leverages Architecture:** Scheduler records precise timestamps and durations for every run
- **Enables Temporal Analysis:**
  - See if Job A always runs before Job B (workflow dependencies)
  - Identify failure clustering at specific times (external system patterns)
  - Detect resource conflicts (overlapping bars = concurrent execution)
  - Visualize AI adaptation (spacing between runs tightening/relaxing)
  - Spot execution gaps (missed schedules, long pauses)

**Example Insights:**
- "Payment processing always fails around 2-3 AM" → Timeline shows red cluster at 2 AM (external API maintenance)
- "Analytics jobs run in sequence" → Timeline shows Analytics A, B, C bars never overlap
- "AI tightened monitoring during load spike" → Timeline shows Payment Check bars spacing from 5min → 1min intervals after 2 PM
- "Endpoints competing for resources at 6 PM" → Timeline shows overlapping bars from multiple jobs (peak time congestion)
- "Execution gap from 4-6 AM" → Timeline shows no activity (intentional quiet hours or issue?)

**Technical Considerations:**
- **Performance:** Render last 50 runs (already fetched), virtualize if expanding to more
- **Responsive:** 
  - Desktop: Full Gantt bars with lengths
  - Tablet: Simplified dots
  - Mobile: List view with timestamps (fallback)
- **Accessibility:** 
  - Keyboard navigation through data points
  - Screen reader announces timeline events
  - High contrast mode support

---

## Proposed Dashboard Layout

### Desktop Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Dashboard Header                                                │
├────────────────────────────────────────────────────────────────┤
│ Section 1: System Health Snapshot (4 stat cards)               │
│ ┌──────────┬──────────┬──────────┬──────────┐                 │
│ │ Total    │ Active   │ Success  │ Last 24h │                 │
│ │ Jobs     │ Endpoints│ Rate     │ Activity │                 │
│ └──────────┴──────────┴──────────┴──────────┘                 │
├────────────────────────────────────────────────────────────────┤
│ Section 2: Visual Health Summary (NEW - 2 columns)             │
│ ┌─────────────────────────┬────────────────────────────────┐   │
│ │ Job Health Overview     │ Scheduling Intelligence        │   │
│ │ (Horizontal Bar Chart)  │ (Donut Chart)                  │   │
│ │                         │                                │   │
│ │ Payment ▓▓▓▓▓░░░░░ 65%  │         AI-Driven             │   │
│ │ Analytics ▓▓▓▓▓▓▓▓░ 88% │        ╱────────╲             │   │
│ │ Reports ▓▓▓▓▓▓▓▓▓▓ 98%  │       │   42%    │            │   │
│ │                         │        ╲────────╱             │   │
│ │ ↑ Click to filter       │  [Source Distribution Legend] │   │
│ └─────────────────────────┴────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ Section 3: Execution Timeline (NEW - Full width)               │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [View: 24h ▼] [Group: Jobs ▼] [Filters ▼]               │   │
│ │                                                          │   │
│ │ Payment   ●────● ●──●      ●─────●        ●───●         │   │
│ │ Analytics    ●──●    ●──────────●    ●───────●          │   │
│ │ Reports   ●────●          ●──●    ●──●      ●───●       │   │
│ │           ├───────┼───────┼───────┼───────┼───────┤     │   │
│ │          12am    6am    12pm    6pm    12am   now       │   │
│ │                                                          │   │
│ │ Legend: ● Success ● Failure ●── Duration (bar length)   │   │
│ │         ─ Baseline ⋯ AI-driven                          │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ Section 4: Activity Trend (Existing area chart)                │
│ [Time series chart showing success/failure over 7/30 days]     │
├────────────────────────────────────────────────────────────────┤
│ Section 5: Detailed Activity Tables (Enhanced)                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Active Filters: [×] Payment Processing [×] ai-interval   │   │
│ │ [Clear All Filters]                                      │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ [Tab: Recent Runs] [Tab: AI Sessions] [Tab: Endpoints]  │   │
│ │ [Filtered table data based on chart interactions]       │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Information Hierarchy
1. **Glance (3-5 seconds):** Stat cards + Health bars + Donut = system status
2. **Scan (10-15 seconds):** Timeline + Trend chart = patterns and anomalies
3. **Investigate (30+ seconds):** Click problem areas → filtered tables → drill into details

### Responsive Behavior
- **Desktop (>1280px):** Full layout as shown
- **Tablet (768-1280px):** 
  - Health Summary stacks to 1 column
  - Timeline simplifies to dots only
  - Tables remain tabbed
- **Mobile (<768px):**
  - Cards in 1-2 columns
  - Health chart becomes vertical bars
  - Donut chart maintains
  - Timeline becomes list view with timestamps
  - Tables collapse with expand/collapse

---

## User Workflows Enabled

### Workflow 1: Identifying Unhealthy Jobs
**Before (current dashboard):**
1. Scroll through Recent Runs table (50 rows)
2. Mental aggregation: "I see many failures from Payment Processing..."
3. Search for job filter (if exists)
4. Review filtered results
5. Total time: 2-3 minutes

**After (with redesign):**
1. Glance at Job Health bars
2. See "Payment Processing" red bar at top (35% success)
3. Click bar → tables auto-filter
4. Review failures in Recent Runs tab
5. Total time: 15-30 seconds

### Workflow 2: Verifying AI Effectiveness
**Before (current dashboard):**
1. Check AI Sessions table for recent sessions
2. Find endpoint mentioned in session
3. Search for that endpoint in Runs table
4. Compare run intervals before/after session
5. Manually calculate if AI suggestion worked
6. Total time: 5+ minutes, requires domain knowledge

**After (with redesign):**
1. Glance at Scheduling Intelligence donut
2. See "42% AI-Driven" (and growing trend if tracked)
3. Click "ai-interval" segment → see AI-driven runs
4. Check timeline to see interval spacing changes visually
5. Total time: 30 seconds, visual confirmation

### Workflow 3: Debugging Temporal Issues
**Before (current dashboard):**
1. Export Recent Runs to CSV
2. Open in spreadsheet
3. Sort by timestamp
4. Visually scan for patterns
5. Cross-reference with AI Sessions
6. Total time: 10+ minutes

**After (with redesign):**
1. Look at Execution Timeline
2. Immediately see: "All failures happen at 2-3 AM"
3. Zoom timeline to 2 AM period
4. See cluster of red dots for "Payment" endpoints
5. Hover to see error messages
6. Click to see full run details
7. Total time: 1-2 minutes, pattern immediately visible

### Workflow 4: Understanding Job Dependencies
**Before (current dashboard):**
1. Requires domain knowledge of job relationships
2. Check timestamps manually across multiple runs
3. Infer order from time differences
4. No visual confirmation

**After (with redesign):**
1. Switch Timeline to "Endpoints" view
2. See "Data Collector" bars always precede "Data Processor" bars
3. Visual confirmation of execution order
4. Identify if dependency breaks (Processor runs before Collector)

---

## Identified Gaps & Limitations

### Gap 1: Historical Trends (Medium Priority)
**What's Missing:** 
- No way to see "success rate is improving/degrading over time"
- Stat cards show current trend arrow but not historical graph
- Can't answer: "Has AI made things better over the last month?"

**Current Workaround:**
- Activity trend area chart shows run counts over time
- Not the same as success rate % trend

**Potential Solution:**
- Add small sparkline charts to stat cards showing 7-day trend
- Add "Success Rate Over Time" line chart to dashboard
- Requires: Time-series success rate data (can derive from runTimeSeries)

**Priority:** Medium (nice-to-have for proving AI value long-term)

---

### Gap 2: Per-Endpoint Scheduling Visualization (Low Priority)
**What's Missing:**
- Can't see how individual endpoint intervals change over time
- Timeline shows spacing but not interval values
- Can't answer: "How did AI change the 'Health Check' endpoint's interval?"

**Current Workaround:**
- View endpoint detail page for interval history
- Check AI Sessions reasoning for mentions of interval changes

**Potential Solution:**
- Add endpoint detail view with interval history chart
- Show: baseline interval → AI hints → actual run intervals over time
- Requires: Either historical interval data OR derive from run spacing

**Priority:** Low (power user feature, not critical for overview)

---

### Gap 3: Response Body Metrics (Low Priority)
**What's Missing:**
- Response bodies contain rich metrics (queue_depth, error_rate, etc.)
- These aren't visualized on dashboard
- Can't answer: "What was the queue depth trend that triggered AI tightening?"

**Current Workaround:**
- View individual run details to see response body JSON
- Manual inspection per run

**Potential Solution:**
- Extract common metric patterns from response bodies
- Add metric trend charts (e.g., "Queue Depth Over Time")
- Requires: Schema detection or user configuration of tracked metrics

**Priority:** Low (highly valuable but complex, requires response body standardization)

---

### Gap 4: Multi-Job Correlation (Low Priority)
**What's Missing:**
- Can't see if Job A failures correlate with Job B failures
- No cross-job dependency visualization
- Can't answer: "Did upstream job failure cause downstream cascade?"

**Current Workaround:**
- Timeline shows temporal overlap (if jobs run simultaneously)
- User must infer correlation manually

**Potential Solution:**
- Add correlation matrix showing job failure overlap
- Enhance timeline with dependency arrows (requires user configuration)
- Add "cascade detection" alerting

**Priority:** Low (advanced analytics, requires user-defined dependencies)

---

### Gap 5: AI Hint Acceptance/Rejection Metrics (Medium Priority)
**What's Missing:**
- Can see AI sessions and scheduling sources separately
- Can't see: "How many AI hints were accepted vs rejected (expired)?"
- Can't measure: "AI suggestion quality" or "hint effectiveness"

**Current Workaround:**
- Compare AI Sessions count to AI-driven runs count (rough proxy)
- Check individual session reasoning

**Potential Solution:**
- Track hint lifecycle: created → accepted → expired/rejected
- Add "AI Effectiveness" metric to dashboard
- Show: "Hint acceptance rate: 87%" (87% of hints led to runs before expiry)
- Requires: New query joining sessions → hints → runs

**Priority:** Medium (proves AI value, guides tuning)

---

### Gap 6: Real-Time Updates (Low Priority)
**What's Missing:**
- Dashboard data requires manual refresh
- No live updates as runs execute
- Can't answer: "Is my job running right now?"

**Current Workaround:**
- Click refresh button
- Auto-refresh with react-query staleTime (currently 30s)

**Potential Solution:**
- WebSocket connection for live updates
- Show "executing now" indicator on timeline
- Real-time stat card updates

**Priority:** Low (polling is sufficient for most use cases, WebSocket adds complexity)

---

### Gap 7: Alerting & Notifications (Out of Scope)
**What's Missing:**
- Dashboard shows current state, not alerts
- User must check dashboard to notice issues
- Can't answer: "Notify me when success rate drops below 80%"

**Current Workaround:**
- None (user must monitor dashboard)

**Potential Solution:**
- Alert rules configuration
- Email/Slack notifications
- Dashboard banner for active alerts

**Priority:** Out of scope (requires alerting system, different feature)

---

## "Big Picture View" Coverage Assessment

### ✅ Well Covered

| Question | How We Answer It |
|----------|-----------------|
| **Which jobs are healthy?** | Job Health Overview bars (color-coded) |
| **Is AI working?** | Scheduling Intelligence donut (% AI-driven) |
| **What's failing and when?** | Execution Timeline (red dots at specific times) |
| **In what order are things running?** | Execution Timeline (chronological sequence) |
| **How many runs in last 24h?** | Stat cards (current) |
| **What's the overall success rate?** | Stat cards (current) |
| **Which endpoints are most active?** | Top Endpoints table (current) |
| **What did AI decide recently?** | AI Sessions table (current) |
| **Are there execution conflicts?** | Timeline (overlapping bars) |
| **Is scheduling adapting?** | Timeline spacing changes + Donut % |

### ⚠️ Partially Covered

| Question | Current Coverage | Gap |
|----------|-----------------|-----|
| **Is AI making things better?** | Trend arrow on success rate card | No historical proof (Gap 1) |
| **How did AI change this endpoint?** | AI Sessions reasoning text | No visual interval history (Gap 2) |
| **Why did AI suggest change?** | Response body in run details | Metrics not visualized (Gap 3) |
| **Did Job A cause Job B to fail?** | Timeline shows temporal overlap | No explicit correlation (Gap 4) |
| **How effective are AI hints?** | Can infer from donut % | No acceptance rate metric (Gap 5) |

### ❌ Not Covered (Intentionally)

| Question | Why Not Covered |
|----------|----------------|
| **Alert me when X happens** | Out of scope (requires alerting system) |
| **Show me live execution** | Low value (polling sufficient) |
| **Predict future failures** | Out of scope (requires ML) |
| **Compare to last month** | No historical aggregates yet |
| **Which endpoint costs most $?** | No cost tracking implemented |

---

## Technical Implementation Notes

### Data Requirements
**Good News:** All three new visualizations use **existing data** from `DashboardStats`:
- Job Health: Aggregates `recentRuns` by `jobName`
- Scheduling Intelligence: Aggregates `recentRuns` by `source`
- Execution Timeline: Sorts and displays `recentRuns` by `startedAt`

**No New API Calls Required:**
- All transformations happen client-side
- No database schema changes
- No new backend queries

### Component Structure
```
apps/web/src/components/dashboard-new/
├── job-health-chart.tsx          # NEW: Horizontal bar chart
├── scheduling-intelligence.tsx    # NEW: Donut chart
├── execution-timeline.tsx         # NEW: Scatter/Gantt chart
├── filter-bar.tsx                 # NEW: Active filter badges
├── section-cards.tsx              # Existing stat cards
├── chart-area-interactive.tsx     # Existing trend chart
├── dashboard-tables.tsx           # Enhanced with filtering
└── index.ts                       # Exports
```

### State Management
```typescript
// Dashboard-level filter state
const [filters, setFilters] = useState({
  jobName: null,
  source: null,
  timeRange: null,
  status: null,
});

// Pass to all components
<JobHealthChart onJobClick={(job) => setFilters({...filters, jobName: job})} />
<SchedulingIntelligence onSourceClick={(src) => setFilters({...filters, source: src})} />
<DashboardTables filters={filters} />
```

### Performance Considerations
- **Data Volume:** 50 runs (current limit) × 3 visualizations = manageable
- **Render Optimization:** Use React.memo for charts, useMemo for data transforms
- **Responsive:** CSS container queries for layout, simplified charts on mobile
- **Accessibility:** ARIA labels, keyboard navigation, screen reader support

---

## Implementation Phases

### Phase 1: Core Visualizations (Week 1)
**Goal:** Add the three main charts with basic interactivity

**Deliverables:**
1. Job Health Overview component (horizontal bars)
2. Scheduling Intelligence component (donut chart)
3. Execution Timeline component (scatter plot, 24h view only)
4. Filter state management
5. Click-to-filter interactions
6. Filter badges UI

**Success Criteria:**
- Users can identify unhealthy jobs at a glance
- Users can see AI impact percentage
- Users can see execution order in last 24h
- Clicking charts filters tables

### Phase 2: Timeline Enhancements (Week 2)
**Goal:** Make timeline more powerful and flexible

**Deliverables:**
1. Gantt-style bars (duration visualization)
2. 7-day view mode
3. Job vs Endpoint grouping toggle
4. Zoom/pan interactions
5. Source type visual encoding (patterns/opacity)
6. Enhanced tooltips

**Success Criteria:**
- Users can see execution durations
- Users can switch between daily and weekly patterns
- Users can zoom into specific time ranges
- Users can identify AI-driven runs visually

### Phase 3: Polish & Optimization (Week 3)
**Goal:** Improve UX and performance

**Deliverables:**
1. Responsive layouts for tablet/mobile
2. Loading states and error handling
3. Accessibility improvements
4. Performance optimization (virtualization if needed)
5. User preferences (default view modes)
6. Documentation

**Success Criteria:**
- Works smoothly on all screen sizes
- Loads quickly with many runs
- Accessible to screen readers
- Users can customize default views

### Future Enhancements (Post-Launch)
**Dependent on User Feedback:**
1. Historical trend sparklines (Gap 1)
2. AI hint effectiveness metrics (Gap 5)
3. Response body metric extraction (Gap 3)
4. Endpoint interval history (Gap 2)
5. Real-time updates via WebSocket (Gap 6)

---

## Success Metrics

### Quantitative
- **Time to Identify Issue:** <30 seconds (vs 2-3 minutes currently)
- **Click-to-Answer Ratio:** 1-2 clicks to answer key questions (vs 5-10 clicks)
- **Dashboard Engagement:** Increased time on dashboard page (indicates value)
- **Support Tickets:** Reduced "how do I check if..." questions

### Qualitative
- User feedback: "I can see what's happening now"
- User feedback: "I found the problem in seconds"
- User feedback: "I can finally see if AI is working"

---

## Risks & Mitigations

### Risk 1: Information Overload
**Description:** Adding 3 new visualizations might overwhelm users

**Mitigation:**
- Clear visual hierarchy (health → timing → details)
- Progressive disclosure (collapsed timeline by default?)
- Onboarding tooltips for first visit
- "Guided tour" feature highlighting key insights

### Risk 2: Mobile Experience
**Description:** Complex charts may not work on small screens

**Mitigation:**
- Simplified mobile layouts (dots instead of bars)
- Fallback to enhanced table views on small screens
- Touch-optimized interactions
- Test on real devices early

### Risk 3: Performance with Large Data
**Description:** 1000+ runs could slow timeline rendering

**Mitigation:**
- Limit timeline to 50-100 runs initially
- Virtualization for larger datasets
- Pagination or "load more" for timeline
- Backend aggregation if client-side becomes too slow

### Risk 4: User Expectation Mismatch
**Description:** Users may expect features not included (Gap 3, 4, 5)

**Mitigation:**
- Clear communication of Phase 1 scope
- Feedback mechanism for feature requests
- Roadmap visibility (what's coming)
- Explain gaps in documentation

---

## Conclusion

This dashboard redesign directly addresses the stated problem: **"I find it challenging to quickly get a 'full picture' of what is happening with my jobs."**

**Before:** 4 stat cards + 1 area chart + 3 tables = data display  
**After:** 4 cards + 2 health charts + 1 timeline + 1 trend + 3 filtered tables = actionable insights platform

The design leverages Cronicorn's architecture (dual-worker, AI-adaptive, database-mediated) to surface the information users need:
- **Scheduler's work** → Job Health + Timeline
- **AI Planner's impact** → Scheduling Intelligence + Timeline patterns
- **Temporal relationships** → Timeline chronology
- **System behavior** → All charts working together

**Identified gaps** are either low priority (power user features) or future enhancements (historical trends, alerting). The Phase 1 scope provides massive value using only existing data.

**Next Steps:**
1. ✅ Validate this design with stakeholders
2. Proceed with Phase 1 implementation
3. Gather user feedback on beta
4. Iterate based on real usage patterns
