# AI Planner Efficiency Fixes

**Status**: Ready for Implementation  
**Effort**: ~5-6 hours (Phase 1) + ~2 hours (Phase 2: Lean Prompt) + ~2 hours (Phase 3: Additional Tools)

---

## Problem

AI sessions waste tokens and time. Worst case observed: **42K tokens, 50+ tool calls, 4 minutes** for a decision reachable in 5 seconds.

## Root Causes

1. **No iteration cap** → AI paginated 50+ times through identical failure records
2. **No analysis scheduling** → AI can't control when it gets invoked next
3. **Bad defaults** → batch size of 2 + "more data available" hints encourage over-fetching
4. **Misleading health stats** → 24h window shows 32% success even after 6h of recovery
5. **No sibling awareness** → AI doesn't know other endpoints exist in the job

---

## Phase 1: Quick Fixes (~5-6 hours total)

These changes would have prevented the problem session.

**MVP (2.5 hours):** If time-constrained, ship only 1.1, 1.2, 1.3 first.

### 1.1 Add maxSteps Limit

| | |
|---|---|
| **File** | `packages/adapter-ai/src/client.ts` |
| **Effort** | 15 min |

```typescript
const result = await generateText({
  // ... existing config
  maxSteps: 15, // Add this - prevents runaway tool loops
});
```

**Note:** When limit is hit, session ends without `submit_analysis`. This is acceptable—safety over completeness.

### 1.2 AI-Controlled Analysis Frequency

| | |
|---|---|
| **Files** | `packages/worker-ai-planner/src/tools.ts`, `apps/ai-planner/src/index.ts`, schema |
| **Effort** | 2-3 hours |

**Let the AI decide when to check again.** Add to `submit_analysis`:

```typescript
submit_analysis: tool({
  schema: z.object({
    reasoning: z.string(),
    next_analysis_in_ms: z.number().min(300000).max(86400000).optional(),
    // Min: 5 min (safety floor), Max: 24h, Default: baseline interval
  }),
})
```

**AI decides based on context:**
- "Endpoint failing, need to check in 5 min" → `300000`
- "Stable for hours, check again in 2h" → `7200000`
- "Daily job done, check tomorrow" → `86400000`
- (omitted) → defaults to baseline interval

**Worker loop:**
```typescript
for (const id of endpointIds) {
  const lastSession = await sessions.getLastSession(id);
  const endpoint = await jobs.getEndpoint(id);
  
  // First analysis: no previous session
  const isFirstAnalysis = !lastSession;
  
  // Scheduled: AI said "check after X"
  const scheduledTime = lastSession?.nextAnalysisAt;
  const isDue = !scheduledTime || clock.now() >= scheduledTime;
  
  // Override: new failures since last analysis (don't wait if things broke)
  const hasNewFailures = endpoint.failureCount > (lastSession?.endpointFailureCount || 0);
  
  if (isFirstAnalysis || isDue || hasNewFailures) {
    // ... analyze
  }
}
```

**Key points:**
- 5 min floor prevents runaway (max 288 analyses/day/endpoint)
- State-change override ensures responsiveness to incidents
- First analysis happens automatically for new endpoints

### 1.3 Fix Tool Defaults

| | |
|---|---|
| **File** | `packages/worker-ai-planner/src/tools.ts` |
| **Effort** | 15 min |

**Change default limit:**
```typescript
// Before: default(2)
// After:
limit: z.number().int().min(1).max(10).default(10)
```

**Soften pagination hint:**
```typescript
// Before: "More history available - call again with offset: X"
// After:
hint: hasMore ? "More history exists if needed, but 10 records is usually sufficient" : undefined
```

### 1.4 Multi-Window Health Display

| | |
|---|---|
| **File** | `packages/worker-ai-planner/src/planner.ts`, `packages/adapter-drizzle/src/runs-repo.ts` |
| **Effort** | 1 hour |

**Problem:** AI sees "32% success rate" even when last 6 hours are 100% successful. Old failure bursts skew the 24h window.

**Fix:** Show 3 time windows in prompt (requires 3 health queries or new repo method):
```
**Health:**
| Window | Success Rate | Runs |
|--------|--------------|------|
| Last 1h | 100% | 12 |
| Last 4h | 85% | 40 |
| Last 24h | 32% | 500 | ← skewed by old failures
```

AI can now see the endpoint recovered and avoid unnecessary intervention.

### 1.5 Add Sibling Count to Prompt

| | |
|---|---|
| **File** | `packages/worker-ai-planner/src/planner.ts` |
| **Effort** | 15 min |

**Problem:** AI never calls sibling tool because it doesn't know siblings exist.

**Fix:** Add to prompt context:
```
**Job:** 3 endpoints [data_fetcher, processor, notifier]
```

Now AI knows to check siblings before making decisions.

### 1.6 Prompt Updates

| | |
|---|---|
| **File** | `packages/worker-ai-planner/src/planner.ts` |
| **Effort** | 30 min |

Update prompt to inform AI about new capabilities and constraints:

```markdown
## Session Constraints
- You have a maximum of 15 tool calls. Use them wisely.
- 10 records of history is usually sufficient for trend analysis.

## Scheduling Your Next Analysis
When you call `submit_analysis`, set `next_analysis_in_ms` to tell the system when to analyze this endpoint again:
- **Incident active:** 5-15 minutes (stay close)
- **Recovering:** 30-60 minutes (monitor progress)  
- **Stable:** 1-4 hours (routine check)
- **Very stable / daily job:** 12-24 hours (minimal overhead)

If omitted, defaults to the endpoint's baseline interval.
```

---

## Phase 2: Lean Prompt (~2 hours)

The current 370-line prompt (~4,000 tokens) includes glossaries, decision frameworks, pattern guides, and examples the AI doesn't need. The AI is smart—give it the facts and let it reason.

### What Goes IN the Prompt (Essential Context)

Everything the AI needs to start analyzing—no tool call required:

```markdown
# Adaptive Scheduler AI

You analyze scheduled endpoint executions and suggest timing adjustments when warranted.

## Your Role
- Observe endpoint behavior through response data
- Suggest scheduling changes only with clear evidence
- Default to stability—most endpoints need no intervention
- You have a maximum of 15 tool calls

## This Endpoint

**Name:** ${endpoint.name}
**Purpose:** ${endpoint.description || "Not specified"}
**Job:** ${siblingCount > 0 ? `${siblingCount + 1} endpoints [${siblingNames}]` : "Standalone"}

**Schedule:**
- Baseline: ${baseline}
- Last Run: ${lastRunAt}
- Next Scheduled: ${nextRunAt}
- Status: ${pauseStatus}
- Failure Count: ${failureCount}${backoffNote}

**Constraints:** Min ${min || "none"}, Max ${max || "none"}
${aiHintsSection}

**Health:**
| Window | Success | Runs |
|--------|---------|------|
| 1h  | ${h1.rate}% | ${h1.runs} |
| 4h  | ${h4.rate}% | ${h4.runs} |
| 24h | ${h24.rate}% | ${h24.runs} |

Failure streak: ${streak}, Avg duration: ${avgMs}ms

## How Your Actions Affect Scheduling

**Priority Order (Governor):**
1. **Pause** - If `pausedUntil > now`, nothing else runs
2. **Clamp** - All times clamped to [min, max] constraints (hard limits)
3. **AI Hints** - Your interval/one-shot proposals (if not expired)
4. **Baseline** - User's original schedule (with backoff if failures > 0)

**Your Interval Hint (`propose_interval`):**
- OVERRIDES baseline completely while active
- Bypasses exponential backoff (you control the cadence)
- Expires at TTL, then reverts to baseline (with backoff if failures remain)

**Your One-Shot Hint (`propose_next_time`):**
- COMPETES with baseline (earliest wins)
- Good for "run now" or "defer to specific time"
- Also expires at TTL

**Both Hints Active:**
- They compete with each other (earliest wins)
- Baseline is ignored

**Backoff (Baseline Only):**
- Formula: `baselineInterval × 2^min(failureCount, 5)`
- Max 32x multiplier (at 5+ failures)
- Resets to 0 on first success (system does this, not you)
- Your interval hints bypass this entirely

**When TTL Expires:**
- All your hints are ignored
- Reverts to baseline WITH backoff if failures > 0
- Use `clear_hints` to manually revert before TTL

**What You Cannot Control:**
- Cannot modify baseline schedule (read-only)
- Cannot reset failureCount (system resets on success)
- Cannot bypass min/max constraints

## Tools

**Query:**
- `get_latest_response` - Current response body and status
- `get_response_history` - Recent responses (10 records usually sufficient)
- `get_sibling_latest_responses` - Other endpoints in this job

**Actions:**
- `propose_interval` - Change frequency (params: intervalMs, ttlMinutes?, reason?)
- `propose_next_time` - One-shot schedule (params: nextRunInMs OR nextRunAtIso, ttlMinutes?, reason?)
- `pause_until` - Pause/resume (params: untilIso or null, reason?)
- `clear_hints` - Revert to baseline immediately (params: reason)

**Required:**
- `submit_analysis` - End session (params: reasoning, next_analysis_in_ms?)

## Next Analysis Timing
Set `next_analysis_in_ms` based on situation:
- Incident active: 5-15 min (300000-900000)
- Recovering: 30-60 min
- Stable: 1-4 hours
- Very stable: 12-24 hours
- Omit to use baseline interval

Analyze this endpoint now.
```

**~60 lines, ~800 tokens** (down from 370 lines, ~4,000 tokens)

### What We REMOVED (AI doesn't need)

| Section | Lines | Why Remove |
|---------|-------|------------|
| Key Terms glossary | 20 | AI knows scheduling concepts |
| How Scheduling Works | 40 | AI learns from tool responses |
| Understanding Endpoint Intent | 15 | AI infers from name/description |
| Decision Framework | 60 | AI can reason about patterns |
| Pattern Recognition Guide | 50 | AI knows how to interpret metrics |
| Analysis Quality Standards | 30 | Just say "be specific" |
| Detailed tool docs | 50 | Brief descriptions sufficient |

### What We KEPT

| Context | Why Essential |
|---------|---------------|
| Endpoint name, description | Identity |
| Job + sibling names | Coordination awareness |
| Baseline schedule | Reference point |
| Current state (last/next run, paused) | Situational awareness |
| Failure count + backoff note | Affects decisions |
| Min/max constraints | Hard limits |
| Active AI hints | Know what's already set |
| Multi-window health (1h/4h/24h) | Accurate recovery detection |
| Tool list with brief params | Know what's available |
| next_analysis_in_ms guidance | New capability |

### No Required Discovery Tool

The AI has everything it needs in the prompt to start. Query tools (`get_latest_response`, `get_response_history`, `get_sibling_latest_responses`) are available if it needs more data, but not mandatory.

---

## Phase 3: Additional Tools (~2 hours)

### 3.1 Add clear_hints Tool (~30 min)

Allow AI to reset endpoint to baseline schedule when hints are no longer needed.

```typescript
clear_hints: tool({
  description: "Clear all AI hints, revert to baseline schedule",
  schema: z.object({ reason: z.string() }),
  execute: async ({ reason }) => {
    await jobs.clearHints(endpointId);
    return { cleared: true, reason };
  },
})
```

### 3.2 Enhance Sibling Tool (~1.5 hours)

Current `get_sibling_latest_responses` only returns response body. Add health status and schedule info so AI can coordinate without multiple calls.

---

## Success Metrics

| Metric | Target | Worst Case Observed |
|--------|--------|---------------------|
| Tokens per session | < 5K | 42K |
| Tool calls per session | < 10 | 50+ |
| Session duration | < 30s | 263s |
| Redundant analysis | 0 (cooldown works) | 3 sessions in 10 min |

---

## Philosophy: Don't Over-Engineer

The AI is capable of reasoning. Give it:
- ✅ Good data (tools that return useful context)
- ✅ Safety rails (maxSteps, cooldown)
- ✅ Clear goal (concise prompt)

Don't build:
- ❌ Complex endpoint type inference systems
- ❌ Per-type decision frameworks  
- ❌ Error categorization logic
- ❌ Response schema analyzers

**Let the AI reason.** Our job is to give it the right inputs and prevent runaway costs.

---

## Implementation Checklist

### Phase 1: MVP (2.5 hours)

#### 1.1 Add maxSteps Limit (15 min)
- [x] Open `packages/adapter-ai/src/client.ts`
- [x] Find `generateText()` call
- [x] Add `maxSteps: 15` to config object
- [ ] Test: verify session stops after 15 tool calls

#### 1.2 AI-Controlled Analysis Frequency (2-3 hours)

**Schema update:**
- [x] Add `next_analysis_at` column to `ai_sessions` table (nullable timestamp)
- [x] Add `endpoint_failure_count` column to `ai_sessions` table (integer, snapshot at analysis time)
- [x] Run migration

**Tool update:**
- [x] Open `packages/worker-ai-planner/src/tools.ts`
- [x] Find `submit_analysis` tool schema
- [x] Add `next_analysis_in_ms: z.number().min(300000).max(86400000).optional()`
- [x] Update execute function to return `next_analysis_in_ms` value

**Sessions repo:**
- [x] Open `packages/adapter-drizzle/src/sessions-repo.ts`
- [x] Update `createSession` / save method to store `nextAnalysisAt` and `endpointFailureCount`
- [x] Add `getLastSession(endpointId)` method if not exists

**Worker loop:**
- [x] Open `apps/ai-planner/src/index.ts`
- [x] Replace endpoint selection logic with:
  ```
  isFirstAnalysis || isDue || hasNewFailures
  ```
- [x] Calculate `nextAnalysisAt` from AI response or default to baseline interval
- [x] Store `endpointFailureCount` snapshot with each session

**Test:**
- [x] Verify new endpoint gets analyzed on first run
- [x] Verify AI can set next analysis time
- [x] Verify state-change override triggers early re-analysis

#### 1.3 Fix Tool Defaults (15 min)
- [ ] Open `packages/worker-ai-planner/src/tools.ts`
- [ ] Find `get_response_history` tool
- [ ] Change `limit` default from `2` to `10`
- [ ] Find pagination hint string
- [ ] Change to: `"More history exists if needed, but 10 records is usually sufficient"`
- [ ] Test: verify AI gets 10 records by default

---

### Phase 1: Extended (2.5 more hours)

#### 1.4 Multi-Window Health Display (1 hour)

**Repo method:**
- [ ] Open `packages/adapter-drizzle/src/runs-repo.ts`
- [ ] Add `getHealthSummaryMultiWindow(endpointId)` method
- [ ] Returns: `{ hour1: {...}, hour4: {...}, hour24: {...} }`
- [ ] Each window has: `successCount`, `failureCount`, `successRate`

**Planner update:**
- [ ] Open `packages/worker-ai-planner/src/planner.ts`
- [ ] Find health summary section in `buildAnalysisPrompt()`
- [ ] Replace single 24h display with 3-window table
- [ ] Format as markdown table in prompt

**Test:**
- [ ] Verify prompt shows 1h, 4h, 24h windows
- [ ] Verify rates calculate correctly

#### 1.5 Add Sibling Count to Prompt (15 min)

**Repo method:**
- [ ] Check if `getSiblingCount(endpointId)` exists in jobs repo
- [ ] If not, add method to return count and names of siblings

**Planner update:**
- [ ] Open `packages/worker-ai-planner/src/planner.ts`
- [ ] Find endpoint context section in `buildAnalysisPrompt()`
- [ ] Add sibling info: `**Job:** 3 endpoints [name1, name2, name3]`
- [ ] Only show if siblings > 0

**Test:**
- [ ] Verify sibling count appears in prompt for multi-endpoint jobs
- [ ] Verify nothing appears for standalone endpoints

#### 1.6 Prompt Updates (30 min)
- [ ] Open `packages/worker-ai-planner/src/planner.ts`
- [ ] Add "Session Constraints" section (maxSteps, history guidance)
- [ ] Add "Scheduling Your Next Analysis" section with examples
- [ ] Remove "Query tools are cheap" messaging
- [ ] Test: review full prompt output

---

### Phase 2: Lean Prompt (2 hours)

#### 2.1 Implement Lean Prompt
- [ ] Create new `buildLeanPrompt()` function using template above (~60 lines)
- [ ] Include: endpoint identity, job/siblings, schedule state, constraints, multi-window health
- [ ] Include: brief tool list with params
- [ ] Include: next_analysis_in_ms guidance
- [ ] Remove: glossary, decision frameworks, pattern guides, detailed examples
- [ ] Replace `buildAnalysisPrompt()` with `buildLeanPrompt()`
- [ ] Test: verify prompt is ~800 tokens (down from ~4000)

---

### Phase 3: Additional Tools (~2 hours)

#### 3.1 Add clear_hints Tool (30 min)
- [ ] Open `packages/worker-ai-planner/src/tools.ts`
- [ ] Add `clear_hints` tool with reason parameter
- [ ] Implement execute: call `jobs.clearHints(endpointId)`
- [ ] Test: verify hints are cleared

#### 3.2 Enhance Sibling Tool (1.5 hours)
- [ ] Open `packages/worker-ai-planner/src/tools.ts`
- [ ] Find `get_sibling_latest_responses` tool
- [ ] Add health summary per sibling
- [ ] Add schedule info (baseline, next run, paused status)
- [ ] Add active AI hints per sibling
- [ ] Test: verify enhanced data returned

---

### Validation

#### After MVP Deploy
- [ ] Monitor token usage per session (target: < 5K avg)
- [ ] Monitor tool calls per session (target: < 10 avg)
- [ ] Monitor session duration (target: < 30s avg)
- [ ] Monitor analysis frequency per endpoint
- [ ] Check for any maxSteps terminations (should be rare)

#### Success Criteria
- [ ] No session exceeds 10K tokens
- [ ] No session exceeds 15 tool calls (maxSteps working)
- [ ] AI correctly schedules its own re-analysis
- [ ] State-change override triggers appropriately
- [ ] Sibling tool gets called for multi-endpoint jobs
