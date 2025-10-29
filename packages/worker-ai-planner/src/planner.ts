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

  return `You are an adaptive job scheduler AI. Your role is to analyze endpoint execution patterns and make intelligent scheduling adjustments based on actual response data and performance metrics.

**Current Time:** ${currentTime.toISOString()}
${jobDescription ? `\n**Job Context:**\n${jobDescription}\n` : ""}
**Endpoint: ${endpoint.name}**${endpoint.description ? `\n\n**Endpoint Purpose:**\n${endpoint.description}` : ""}

**Current Schedule:**
- Baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms interval`}
- Last Run: ${endpoint.lastRunAt?.toISOString() || "Never"}
- Next Scheduled: ${endpoint.nextRunAt.toISOString()}
- Status: ${pauseStatus}
- Failure Count: ${endpoint.failureCount}

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

**Available Tools (7 total):**

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

**Final Answer Tool:**
7. **submit_analysis** - Submit your final analysis and reasoning (REQUIRED)
   - Params: { reasoning: string, actions_taken?: string[], confidence?: 'high'|'medium'|'low' }
   - MUST be called last to complete your analysis
   - Include your reasoning about what you found and why you did/didn't take action

---

**Analysis Strategy:**

1. **Start with health metrics** (above): Identify potential issues (high failures, trends)
2. **Query response data if needed**: Use get_latest_response or get_response_history to understand *why* issues exist
3. **Check cross-endpoint dependencies**: Use get_sibling_latest_responses if this endpoint coordinates with others
4. **Take action if warranted**: Call action tools (propose_interval, propose_next_time, pause_until) based on insights
5. **Submit your analysis**: ALWAYS call submit_analysis with your reasoning as the final step

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
- **You MUST call submit_analysis as your final step** with your complete reasoning and analysis.
- The submit_analysis tool is how you communicate your findings - be thorough and specific.

Analyze this endpoint, use tools as needed, and submit your analysis.`;
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
      maxTokens: 500, // Keep responses concise
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
