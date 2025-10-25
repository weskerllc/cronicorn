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
function buildAnalysisPrompt(endpoint: {
  name: string;
  baselineCron?: string;
  baselineIntervalMs?: number;
  lastRunAt?: Date;
  nextRunAt: Date;
  failureCount: number;
}, health: {
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
  lastRun: { status: string; at: Date } | null;
  failureStreak: number;
}): string {
  const totalRuns = health.successCount + health.failureCount;
  const successRate = totalRuns > 0 ? (health.successCount / totalRuns * 100).toFixed(1) : "N/A";

  return `You are an adaptive job scheduler AI. Your role is to analyze endpoint execution patterns and make intelligent scheduling adjustments based on actual response data and performance metrics.

**Endpoint: ${endpoint.name}**

**Current Schedule:**
- Baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms interval`}
- Last Run: ${endpoint.lastRunAt?.toISOString() || "Never"}
- Next Scheduled: ${endpoint.nextRunAt.toISOString()}
- Failure Count: ${endpoint.failureCount}

**Recent Performance (Last 24 hours):**
- Total Runs: ${totalRuns}
- Success Rate: ${successRate}%
- Avg Duration: ${health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
- Failure Streak: ${health.failureStreak} consecutive failures
- Last Status: ${health.lastRun?.status || "No recent runs"}

---

**Available Tools (6 total):**

**Query Tools (Inspect Response Data):**
1. **get_latest_response** - Get the most recent response body from this endpoint
   - Use to check current state (e.g., queue depth, error rate, resource availability)
   - Returns: { found, responseBody?, timestamp?, status? }

2. **get_response_history** - Get recent response bodies (up to 50)
   - Use to identify trends (e.g., increasing errors, growing queues, degrading performance)
   - Params: { limit: number (1-50) }
   - Returns: { count, responses: [{ responseBody, timestamp, status, durationMs }] }

3. **get_sibling_latest_responses** - Get latest responses from sibling endpoints in same job
   - Use for cross-endpoint coordination (e.g., ETL dependencies, health monitoring)
   - Returns: { count, siblings: [{ endpointId, endpointName, responseBody, timestamp, status }] }

**Action Tools (Modify Scheduling):**
4. **propose_interval** - Adjust execution frequency dynamically
   - Params: { intervalMs, ttlMinutes?, reason? }
   - Example: Increase frequency if queue growing, decrease if stable

5. **propose_next_time** - Schedule one-shot execution at specific time
   - Params: { nextRunAtIso, ttlMinutes?, reason? }
   - Example: Run immediately to investigate, or defer to off-peak

6. **pause_until** - Pause execution temporarily or resume
   - Params: { untilIso: string | null, reason? }
   - Example: Pause during maintenance, resume when dependency recovers

---

**Analysis Strategy:**

1. **Start with health metrics** (above): Identify potential issues (high failures, trends)
2. **Query response data if needed**: Use get_latest_response or get_response_history to understand *why* issues exist
3. **Check cross-endpoint dependencies**: Use get_sibling_latest_responses if this endpoint coordinates with others
4. **Take action if warranted**: Call action tools (propose_interval, propose_next_time, pause_until) based on insights

**Decision Guidelines:**

- **High failure rate (>30%)** → Query latest response to diagnose → Consider pausing or reducing frequency
- **Failure streak ≥3** → Check response history for patterns → Investigate immediately or pause
- **Response data shows actionable signals** → Examples:
  - Queue depth > threshold → Increase frequency with propose_interval
  - External resource unavailable → Pause until recovery with pause_until
  - Sibling endpoint has data ready → Schedule immediate run with propose_next_time
- **Stable performance** → No action needed unless response data shows opportunity to optimize
- **Cross-endpoint coordination needed** → Query sibling responses before deciding

**Important:**
- Query tools are READ-ONLY and cost-efficient. Use them liberally to make informed decisions.
- Only call action tools when adjustments will meaningfully improve reliability or efficiency.
- Always include a clear "reason" parameter explaining your decision.
- If everything looks normal and response data doesn't suggest changes, respond with analysis only (no tool calls).

Analyze this endpoint and use tools as needed to optimize its scheduling.`;
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

    // 4. Build AI context
    const prompt = buildAnalysisPrompt(endpoint, health);

    // 5. Create endpoint-scoped tools (3 query + 3 action)
    // Note: jobId is required for sibling queries. If missing, sibling tool will return empty.
    const tools = createToolsForEndpoint(endpointId, endpoint.jobId || "", { jobs, runs, clock });

    // 6. Invoke AI with tools and capture session result
    const startTime = clock.now().getTime();
    const session = await aiClient.planWithTools({
      input: prompt,
      tools,
      maxTokens: 500, // Keep responses concise
    });
    const durationMs = clock.now().getTime() - startTime;

    // 7. Persist session to database for debugging/cost tracking
    await sessions.create({
      endpointId,
      analyzedAt: clock.now(),
      toolCalls: session.toolCalls,
      reasoning: session.reasoning,
      tokenUsage: session.tokenUsage,
      durationMs,
    });

    // Log summary for real-time observability
    if (session.toolCalls.length > 0) {
      console.warn(`[AI Analysis] ${endpoint.name}:`, {
        toolsCalled: session.toolCalls.map(tc => tc.tool),
        reasoning: session.reasoning.slice(0, 150) + (session.reasoning.length > 150 ? "..." : ""),
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
