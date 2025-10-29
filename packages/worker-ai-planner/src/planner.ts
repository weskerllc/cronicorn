/**
 * AI Planner Worker Orchestration
 *
 * Analyzes endpoint execution patterns and suggests adaptive scheduling adjustments.
 * Runs independently from the scheduler worker - communicates via database.
 */

import type { AIClient, Clock, JobsRepo, QuotaGuard, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { createToolsForEndpoint } from "./tools.js";

export type AIPlannerDeps = {
  aiClient: AIClient;
  jobs: JobsRepo;
  runs: RunsRepo;
  sessions: SessionsRepo;
  quota: QuotaGuard;
  clock: Clock;
};

/**
 * Build analysis prompt for AI to understand endpoint context and suggest adjustments.
 */
function buildAnalysisPrompt(
  currentTime: Date,
  jobDescription: string | undefined,
  endpoint: {
    name: string;
    description?: string;
    baselineCron?: string;
    baselineIntervalMs?: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
    pausedUntil?: Date;
    lastRunAt?: Date;
    nextRunAt: Date;
    failureCount: number;
    aiHintIntervalMs?: number;
    aiHintNextRunAt?: Date;
    aiHintExpiresAt?: Date;
    aiHintReason?: string;
  },
  health: {
    successCount: number;
    failureCount: number;
    avgDurationMs: number | null;
    lastRun: { status: string; at: Date } | null;
    failureStreak: number;
  },
): string {
  const totalRuns = health.successCount + health.failureCount;
  const successRate = totalRuns > 0 ? (health.successCount / totalRuns * 100).toFixed(1) : "N/A";

  // Build pause status string
  const pauseStatus = endpoint.pausedUntil && endpoint.pausedUntil > currentTime
    ? `Paused until ${endpoint.pausedUntil.toISOString()}`
    : "Active";

  // Build AI hints status
  const aiHintsActive = endpoint.aiHintExpiresAt && endpoint.aiHintExpiresAt > currentTime;
  let aiHintsSection = "";
  if (aiHintsActive) {
    const hints = [];
    if (endpoint.aiHintIntervalMs) {
      hints.push(`- Interval: ${endpoint.aiHintIntervalMs}ms`);
    }
    if (endpoint.aiHintNextRunAt) {
      hints.push(`- One-shot: ${endpoint.aiHintNextRunAt.toISOString()}`);
    }
    if (endpoint.aiHintReason) {
      hints.push(`- Reason: ${endpoint.aiHintReason}`);
    }
    hints.push(`- Expires: ${endpoint.aiHintExpiresAt!.toISOString()}`);
    aiHintsSection = `\n**Active AI Hints:**\n${hints.join("\n")}`;
  }

  // Calculate current backoff multiplier if failures exist
  const backoffMultiplier = endpoint.failureCount > 0 ? 2 ** Math.min(endpoint.failureCount, 5) : 1;
  const backoffInfo = endpoint.failureCount > 0
    ? ` (currently ${backoffMultiplier}x due to ${endpoint.failureCount} failures)`
    : "";

  return `You are an adaptive job scheduler AI. Your role is to analyze endpoint execution patterns and make intelligent scheduling adjustments based on actual response data and performance metrics.

---

## How This Scheduling System Works

You control scheduling through **time-bounded hints** that influence the scheduler's decision logic:

**Hint Priority Rules:**
- **propose_interval**: Your interval hint OVERRIDES the baseline schedule completely
  - Use for adaptive cadence: tighten during load, relax during stability
  - Example: baseline=5min, you propose 30s → runs every 30s while hint active
  - Your interval does NOT get exponential backoff (you can override the system's backoff)

- **propose_next_time**: Your one-shot hint COMPETES with baseline (earliest wins)
  - Use for specific timing needs: immediate investigation, defer to off-peak
  - Example: baseline=next 5min, you propose "now" → runs immediately once

- **If both hints active**: They compete with each other, baseline is ignored

**Immediate Effect (Nudging):**
- Your hints take effect within 5-30 seconds (next scheduler tick)
- NOT on the next baseline cycle—the system immediately reschedules
- Interval hints continue until TTL expires, then auto-revert to baseline

**Constraint Enforcement:**
- Your proposals are clamped to [${endpoint.minIntervalMs ? `${endpoint.minIntervalMs}ms` : "no min"}, ${endpoint.maxIntervalMs ? `${endpoint.maxIntervalMs}ms` : "no max"}] by the governor
- Pause overrides everything—if pausedUntil is set, all other logic is ignored
- These bounds are hard limits you cannot bypass

**Exponential Backoff (Baseline Only):**
- Baseline intervals get exponential backoff on failures: baselineMs × 2^min(failures, 5)
- Current baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms`}${backoffInfo}
- Your interval hints bypass this backoff
- Override responsibly: only when evidence shows recovery or you need aggressive monitoring despite failures

---

## Endpoint Context

**Current Time:** ${currentTime.toISOString()}
${jobDescription ? `\n**Job Context:** ${jobDescription}\n` : ""}
**Endpoint:** ${endpoint.name}${endpoint.description ? `\n**Purpose:** ${endpoint.description}` : ""}

**Understanding Endpoint Intent:**
Use the endpoint name and description to:
1. **Identify key metrics**: What should you look for in response bodies? (queue depth, error rate, latency, status flags)
2. **Interpret values**: What does "good" vs "bad" look like for this specific endpoint?
3. **Determine response**: Should issues trigger tighter monitoring, alerts, pausing, or coordination?

Example interpretations:
- "Monitors payment queue" → queue_depth is key metric, increasing = bad, may need alerting
- "Checks ML model accuracy" → accuracy metric, decreasing = bad, may trigger retraining
- "Health check for API" → response time + error rate matter, degradation = tighten monitoring
- "Runs during business hours" → time-sensitive, adjust intervals based on current time

**Current Schedule:**
- Baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms interval`}
- Last Run: ${endpoint.lastRunAt?.toISOString() || "Never"}
- Next Scheduled: ${endpoint.nextRunAt.toISOString()}
- Status: ${pauseStatus}
- Failure Count: ${endpoint.failureCount}${endpoint.failureCount > 0 ? ` (baseline is backed off ${backoffMultiplier}x)` : ""}

**Constraints:**
- Min Interval: ${endpoint.minIntervalMs ? `${endpoint.minIntervalMs}ms` : "None"}
- Max Interval: ${endpoint.maxIntervalMs ? `${endpoint.maxIntervalMs}ms` : "None"}${aiHintsSection}

**Recent Performance (Last 24 hours):**
- Total Runs: ${totalRuns}
- Success Rate: ${successRate}%
- Avg Duration: ${health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
- Failure Streak: ${health.failureStreak} consecutive failures
- Last Status: ${health.lastRun?.status || "No recent runs"}

---

## Available Tools

**Query Tools (READ - Use Liberally):**

1. **get_latest_response** - Current state snapshot
   - When: Always check first if health metrics show anomalies
   - Look for: Current values (queue depth, error rates, state flags)
   - Returns: { found, responseBody?, timestamp?, status? }

2. **get_response_history** - Trend detection over time
   - When: Need to distinguish spike from trend, or identify patterns
   - Look for: Monotonic changes, periodic patterns, degradation signals
   - Params: { limit: number (1-50) }
   - Returns: { count, responses: [{ responseBody, timestamp, status, durationMs }] }

3. **get_sibling_latest_responses** - Cross-endpoint coordination
   - When: This endpoint is part of a workflow (endpoints in same job that coordinate)
   - Look for: Explicit signals (ready_for_processing, health_status, shared state)
   - Skip: If no jobId (standalone endpoint) or siblings don't have coordination signals
   - Returns: { count, siblings: [{ endpointId, endpointName, responseBody, timestamp, status }] }

**Action Tools (WRITE - Use Conservatively):**

4. **propose_interval** - Adaptive frequency control
   - When: Clear trend requiring sustained adjustment (growing queue, load shift, recovery from backoff)
   - TTL Strategy:
     * Short (5-15min): Transient spikes, temporary monitoring
     * Medium (30-60min): Operational shifts, business hours patterns
     * Long (2-4hr): Sustained degradation, maintenance windows
   - Avoid: One-time events (use propose_next_time instead)
   - Params: { intervalMs, ttlMinutes?, reason? }

5. **propose_next_time** - Specific timing override
   - When: Immediate investigation needed, or defer to specific time
   - TTL: Very short (1-5min) - this is for one-shot adjustments
   - Params: { nextRunAtIso OR nextRunInMs, ttlMinutes?, reason? }
   - Use nextRunInMs: 0 for "run immediately"

6. **pause_until** - Circuit breaker
   - When: Dependency unavailable, maintenance window, rate limits hit
   - Resume: Pass untilIso=null when safe to resume
   - Params: { untilIso: string | null, reason? }

**Final Answer Tool (REQUIRED):**

7. **submit_analysis** - Submit your reasoning
   - MUST be called last to complete your analysis
   - Your reasoning will be logged and reviewed by engineers debugging scheduling issues
   - Params: { reasoning: string, actions_taken?: string[], confidence?: 'high'|'medium'|'low' }

---

## Decision Framework

**Default to Stability:** Most of the time, doing nothing is optimal. Only intervene with clear evidence.

**Stability Indicators (No Action Needed):**
- Success rate >90%, failure count <3
- Metrics within normal ranges, no monotonic trends
- Response data shows expected state
- Duration variance low (<2x median)
- No coordination signals requiring action
- **Important**: With <10 total runs, treat metrics as preliminary - avoid aggressive interventions until sufficient data

**Intervention Patterns:**

**Growing Load:**
- Evidence: Queue depth/latency increasing monotonically over 5+ runs
- Action: propose_interval (tighten), TTL=30-60min
- Example: "queue_depth: 50→100→200 over last 10 runs → propose 30s interval from 5min baseline"

**Transient Spike:**
- Evidence: Single high value, then returns to normal
- Action: None, or propose_next_time (investigate once)
- Don't: propose_interval for one-time events

**High Failure Rate:**
- Evidence: Success rate <70% or failure streak ≥3
- First: Query latest response to diagnose root cause
- Then:
  * If dependency issue → pause_until dependency recovers
  * If transient errors → let backoff work (no action)
  * If need aggressive monitoring despite failures → propose_interval with clear justification

**Recovery from Failures:**
- Evidence: failureCount ≥3 (backoff active to ${backoffMultiplier}x), but response shows service healthy
- Action: propose_interval (normal cadence) to resume faster than backoff allows
- Justification: "Service recovered but backoff keeps us at ${backoffMultiplier}x interval - proposing normal cadence based on healthy response data"

**Dependency Coordination:**
- Evidence: Sibling endpoint shows ready_for_processing=true or similar signal
- Action: propose_next_time (now) to process available data
- Check: Only for workflow endpoints (endpoints with same jobId)

**Metrics Trending Down (Relaxation Opportunity):**
- Evidence: Queue depth/latency decreasing consistently, high success rate
- Action: propose_interval (relax to longer interval) to save resources
- Example: "queue stable at 10-15 (down from 200), 98% success → relax to 10min from current 1min"
- **Caution**: Relaxing beyond baseline should be rare - baseline reflects user intent. Only propose with strong evidence of sustained over-monitoring (>95% success, stable metrics over hours/days, clear resource waste)

**One-Shot Actions with Cooldowns:**
- Evidence: Condition requiring immediate action (cache warm-up, scaling, alerts)
- Pattern: Check response history for last_executed_at or action_timestamp
- Calculate: Time since last action vs required cooldown period
- Action: Only propose_next_time if cooldown elapsed
- Example: "Last cache_warm_up at 10:15, current time 10:25, cooldown 15min → skip (only 10min elapsed)"

---

## Pattern Recognition Guide

When analyzing response data, look for:

**Common Metric Vocabulary:**
Response bodies can have any structure. Look for fields that indicate:
- **Load/Backlog**: queue_depth, pending_count, backlog_size, items_waiting (higher = worse)
- **Performance**: latency, duration, processing_time, p50/p95/p99 (higher = worse)
- **Quality**: accuracy, success_rate, uptime_pct, health_score (lower = worse)
- **Errors**: error_count, failure_rate, error_pct, exceptions (higher = worse)
- **Status**: healthy, available, status, state (false/"error" = worse)
- **Timestamps**: last_success_at, completed_at, updated_at (stale = worse)
- **Thresholds**: max_allowed, sla_target, warning_level, critical_level (compare current vs threshold)

**Pattern Types:**

1. **Monotonic Trends**: Values consistently increasing/decreasing over 5+ runs
   - Growing: queue_depth 50→100→150→200 (load increasing)
   - Shrinking: error_rate 15%→10%→5%→2% (recovery)

2. **Threshold Crossings**: Sudden jumps indicating state changes
   - error_rate jumps from 2% to 35% (degradation event)
   - latency_p95 jumps from 100ms to 3000ms (system strain)

3. **State Transitions**: Explicit flags or status changes
   - dependency_status: "unavailable" → "recovering" → "healthy"
   - maintenance_mode: true (pause until false)
   - rate_limited: true (back off or pause)

4. **Periodic Patterns**: Time-based load variations
   - High traffic 9am-5pm, low overnight (diurnal pattern)
   - Batch job completion signals (coordinate with siblings)

5. **Coordination Signals**: Explicit data-ready or health flags
   - ready_for_processing: true (trigger dependent endpoint)
   - upstream_healthy: false (pause downstream processing)

6. **Cooldown Tracking**: Prevent duplicate one-shot actions
   - Check response history for action timestamps (last_executed_at, last_alert_at, etc.)
   - Calculate time elapsed since last action
   - Compare against required cooldown period (varies by action type)
   - Only trigger if sufficient time has passed

---

## Analysis Quality Standards

Your reasoning will be logged and reviewed by engineers. Be specific and evidence-based.

**Required Elements:**
1. **Evidence**: Cite specific metric values from health summary or response data
2. **Logic**: Explain cause-effect reasoning for your conclusion
3. **Action**: If taken, justify with evidence; if not taken, explain why stability is optimal
4. **Alternatives**: Briefly note what you considered but rejected

**Good Example:**
"Latest response shows queue_depth=250, up from avg of 75 over last 10 runs. Trend is monotonically increasing: 50→100→175→250 over past hour. Processing rate cannot keep up with arrival rate. Proposing 30s interval (from 5min baseline) to reduce processing lag and prevent queue overflow. TTL=15min to reassess after system adapts. Considered immediate investigation (propose_next_time) but 85% success rate suggests system is coping, just needs tighter monitoring cadence. Considered pausing but no evidence of system failure, just growing load."

**Poor Example:**
"Metrics look bad, adjusting interval." ❌ No evidence, no logic, vague action

**No Action Example:**
"Success rate 94% (47/50 runs), avg duration 120ms (consistent), latest response shows queue_depth=45 (normal range 30-60). No monotonic trends or threshold crossings detected. Failure count is 0, no backoff active. Current baseline schedule (5min) is optimal for this stable state. No intervention needed—stability is preferred over optimization attempts."

---

## Analysis Process

1. **Assess health metrics** (above): Identify any anomalies or trends
2. **Query response data if warranted**: Use get_latest_response or get_response_history to understand root causes
3. **Check coordination needs**: Use get_sibling_latest_responses only if this endpoint is part of a workflow
4. **Decide on action**: Apply decision framework patterns with evidence-based reasoning
5. **Submit analysis**: Call submit_analysis with detailed reasoning (REQUIRED)

Remember: Query tools are cheap—use them to make informed decisions. Action tools change production behavior—only use when you have clear evidence that adjustment will improve reliability or efficiency.

Analyze this endpoint now.`;
}

/**
 * AI Planner Orchestration
 *
 * Analyzes endpoint execution patterns and writes adaptive hints to the database.
 */
export class AIPlanner {
  constructor(private readonly deps: AIPlannerDeps) { }

  /**
   * Analyze a single endpoint and let AI suggest adjustments.
   *
   * This method:
   * 1. Fetches endpoint state from database
   * 2. Gets health summary (last 24 hours)
   * 3. Builds context prompt for AI
   * 4. Invokes AI with endpoint-scoped tools
   * 5. AI may call tools to write hints to database
   * 6. Scheduler picks up hints on next execution
   *
   * @param endpointId - The endpoint to analyze
   */
  async analyzeEndpoint(endpointId: string): Promise<void> {
    const { aiClient, jobs, runs, sessions, quota, clock } = this.deps;

    // 1. Get current endpoint state
    const endpoint = await jobs.getEndpoint(endpointId);

    // 2. Check quota before making AI call
    const canProceed = await quota.canProceed(endpoint.tenantId);
    if (!canProceed) {
      console.warn(`[AI Analysis] Quota exceeded for tenant ${endpoint.tenantId}, skipping analysis for endpoint ${endpoint.name}`);
      return;
    }

    // 3. Get health summary (last 24 hours)
    const since = new Date(clock.now().getTime() - 24 * 60 * 60 * 1000);
    const health = await runs.getHealthSummary(endpointId, since);

    // 4. Get job description if endpoint belongs to a job
    let jobDescription: string | undefined;
    if (endpoint.jobId) {
      const job = await jobs.getJob(endpoint.jobId);
      jobDescription = job?.description;
    }

    // 5. Build AI context with all available information
    const prompt = buildAnalysisPrompt(clock.now(), jobDescription, endpoint, health);

    // 6. Create endpoint-scoped tools (3 query + 3 action)
    // Note: jobId is required for sibling queries. If missing, sibling tool will return empty.
    const tools = createToolsForEndpoint(endpointId, endpoint.jobId || "", { jobs, runs, clock });

    // 7. Invoke AI with tools and capture session result
    const startTime = clock.now().getTime();
    const session = await aiClient.planWithTools({
      finalToolName: "submit_analysis",
      input: prompt,
      tools,
      maxTokens: 1500, // Increased for comprehensive analysis with response data queries
    });
    const durationMs = clock.now().getTime() - startTime;

    // 8. Extract reasoning from submit_analysis tool call
    const submitAnalysisCall = session.toolCalls.find(tc => tc.tool === "submit_analysis");
    if (!submitAnalysisCall) {
      console.warn(`[AI Analysis] Missing submit_analysis tool call for endpoint ${endpoint.name}`);
    }

    const analysisResult = submitAnalysisCall?.result;
    const reasoning = analysisResult && typeof analysisResult === "object" && "reasoning" in analysisResult
      ? String(analysisResult.reasoning)
      : undefined;

    if (!reasoning) {
      console.warn(`[AI Analysis] Missing reasoning for endpoint ${endpoint.name}`);
    }

    const safeReasoning = reasoning ?? "No reasoning provided";
    // 9. Persist session to database for debugging/cost tracking
    await sessions.create({
      endpointId,
      analyzedAt: clock.now(),
      toolCalls: session.toolCalls,
      reasoning: safeReasoning,
      tokenUsage: session.tokenUsage,
      durationMs,
    });

    // Log summary for real-time observability
    if (session.toolCalls.length > 0) {
      console.warn(`[AI Analysis] ${endpoint.name}:`, {
        toolsCalled: session.toolCalls.map(tc => tc.tool),
        reasoning: safeReasoning.slice(0, 150) + (safeReasoning.length > 150 ? "..." : ""),
        tokens: session.tokenUsage,
      });
    }
  }

  /**
   * Analyze multiple endpoints in batch.
   *
   * Useful for periodic analysis of all active endpoints.
   *
   * @param endpointIds - Array of endpoint IDs to analyze
   */
  async analyzeEndpoints(endpointIds: string[]): Promise<void> {
    for (const id of endpointIds) {
      try {
        await this.analyzeEndpoint(id);
      }
      catch (error) {
        // Log but continue - don't let one failure stop batch

        console.error(`Failed to analyze endpoint ${id}:`, error);
      }
    }
  }
}
