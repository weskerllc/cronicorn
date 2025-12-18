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
 * Build lean analysis prompt for AI (~60 lines, ~800 tokens).
 * Gives essential context without verbose explanations—AI is smart enough to reason.
 */
function buildAnalysisPrompt(
  currentTime: Date,
  jobDescription: string | undefined,
  siblingNames: string[],
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
    hour1: { successCount: number; failureCount: number; successRate: number };
    hour4: { successCount: number; failureCount: number; successRate: number };
    hour24: { successCount: number; failureCount: number; successRate: number };
    avgDurationMs: number | null;
    failureStreak: number;
  },
): string {
  // Build pause status string
  const pauseStatus = endpoint.pausedUntil && endpoint.pausedUntil > currentTime
    ? `Paused until ${endpoint.pausedUntil.toISOString()}`
    : "Active";

  // Build AI hints status
  const aiHintsActive = endpoint.aiHintExpiresAt && endpoint.aiHintExpiresAt > currentTime;
  let aiHintsSection = "";
  if (aiHintsActive) {
    const hints = [];
    if (endpoint.aiHintIntervalMs)
      hints.push(`Interval: ${endpoint.aiHintIntervalMs}ms`);
    if (endpoint.aiHintNextRunAt)
      hints.push(`One-shot: ${endpoint.aiHintNextRunAt.toISOString()}`);
    if (endpoint.aiHintReason)
      hints.push(`Reason: ${endpoint.aiHintReason}`);
    hints.push(`Expires: ${endpoint.aiHintExpiresAt!.toISOString()}`);
    aiHintsSection = `\n**Active AI Hints:** ${hints.join(" | ")}`;
  }

  // Calculate current backoff multiplier if failures exist
  const backoffMultiplier = endpoint.failureCount > 0 ? 2 ** Math.min(endpoint.failureCount, 5) : 1;
  const backoffNote = endpoint.failureCount > 0 ? ` (${backoffMultiplier}x backoff)` : "";

  // Job context
  const jobContext = siblingNames.length > 0
    ? `${siblingNames.length + 1} endpoints [${[endpoint.name, ...siblingNames].join(", ")}]`
    : "Standalone";

  return `# Adaptive Scheduler AI

You analyze scheduled endpoint executions and suggest timing adjustments when warranted.

## Your Role
- Observe endpoint behavior through response data
- Suggest scheduling changes only with clear evidence
- Default to stability—most endpoints need no intervention
- **Maximum 15 tool calls per session**

## Job Architecture

**Jobs** group related endpoints that may need coordination:
- A job might be an ETL pipeline (extract → transform → load)
- Or a monitoring suite (health check, metrics collector, alerter)
- Or independent endpoints that share a logical grouping

**When to check siblings (\`get_sibling_latest_responses\`):**
- Endpoint names/descriptions suggest dependencies (e.g., "processor" waiting for "fetcher")
- Job description mentions workflow or pipeline coordination
- Current endpoint's response references data from siblings
- You need to understand the broader job context before deciding

**When to skip siblings:**
- Endpoint appears independent based on name/description
- Job description clearly indicates no coordination needed

## This Endpoint

**Name:** ${endpoint.name}${endpoint.description ? `\n**Purpose:** ${endpoint.description}` : ""}
**Job:** ${jobContext}${jobDescription ? ` — ${jobDescription}` : ""}

**Schedule:**
- Baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms interval`}
- Last Run: ${endpoint.lastRunAt?.toISOString() || "Never"}
- Next Scheduled: ${endpoint.nextRunAt.toISOString()}
- Status: ${pauseStatus}
- Failure Count: ${endpoint.failureCount}${backoffNote}

**Constraints:** Min ${endpoint.minIntervalMs ? `${endpoint.minIntervalMs}ms` : "none"}, Max ${endpoint.maxIntervalMs ? `${endpoint.maxIntervalMs}ms` : "none"}${aiHintsSection}

**Health:**
| Window | Success | Runs |
|--------|---------|------|
| 1h  | ${health.hour1.successRate}% | ${health.hour1.successCount + health.hour1.failureCount} |
| 4h  | ${health.hour4.successRate}% | ${health.hour4.successCount + health.hour4.failureCount} |
| 24h | ${health.hour24.successRate}% | ${health.hour24.successCount + health.hour24.failureCount} |

Failure streak: ${health.failureStreak}, Avg duration: ${health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}

## How Your Actions Affect Scheduling

**Priority Order (Governor):**
1. **Pause** — If \`pausedUntil > now\`, nothing else runs
2. **Clamp** — All times clamped to [min, max] constraints (hard limits)
3. **AI Hints** — Your interval/one-shot proposals (if not expired)
4. **Baseline** — User's original schedule (with backoff if failures > 0)

**Your Interval Hint (\`propose_interval\`):** OVERRIDES baseline while active, bypasses backoff. Expires at TTL → reverts to baseline.

**Your One-Shot Hint (\`propose_next_time\`):** COMPETES with baseline (earliest wins). Good for "run now" or "defer to specific time".

**Both Active:** They compete (earliest wins), baseline ignored.

**Backoff (Baseline Only):** \`baselineInterval × 2^min(failureCount, 5)\` — max 32x. Your hints bypass this.

## Tools

**Query:**
- \`get_latest_response\` — Current response preview (ask for full body only when necessary)
- \`get_response_history\` — Recent responses (default 5, metadata-only; set includeBodies=true for truncated payloads)
- \`get_sibling_latest_responses\` — Other endpoints in this job (includeResponses=true for raw payloads)

**Actions:**
- \`propose_interval\` — Change frequency (intervalMs, ttlMinutes?, reason?)
- \`propose_next_time\` — One-shot schedule (nextRunInMs OR nextRunAtIso, ttlMinutes?, reason?)
- \`pause_until\` — Pause/resume (untilIso or null, reason?)
- \`clear_hints\` — Revert to baseline immediately (reason)

**Required:**
- \`submit_analysis\` — End session (reasoning, next_analysis_in_ms?, actions_taken?, confidence?)

## Next Analysis Timing

Set \`next_analysis_in_ms\` based on situation:
- **Incident active:** 5-15 min (300000-900000)
- **Recovering:** 30-60 min
- **Stable:** 1-4 hours
- **Very stable:** 12-24 hours
- Omit to use baseline interval

**Current time:** ${currentTime.toISOString()}

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

    // 3. Get multi-window health summary (1h, 4h, 24h)
    const health = await runs.getHealthSummaryMultiWindow(endpointId, clock.now());

    // 4. Get job context if endpoint belongs to a job
    let jobDescription: string | undefined;
    let siblingNames: string[] = [];
    if (endpoint.jobId) {
      const job = await jobs.getJob(endpoint.jobId);
      jobDescription = job?.description;

      // Get sibling endpoint names (excluding current endpoint)
      const allEndpoints = await jobs.listEndpointsByJob(endpoint.jobId);
      siblingNames = allEndpoints
        .filter(ep => ep.id !== endpointId)
        .map(ep => ep.name);
    }

    // 5. Build AI context with all available information
    const prompt = buildAnalysisPrompt(clock.now(), jobDescription, siblingNames, endpoint, health);

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

    // Extract next_analysis_in_ms from submit_analysis result
    const nextAnalysisInMs = analysisResult && typeof analysisResult === "object" && "next_analysis_in_ms" in analysisResult
      ? (typeof analysisResult.next_analysis_in_ms === "number" ? analysisResult.next_analysis_in_ms : undefined)
      : undefined;

    // Calculate next analysis time from AI response or fall back to baseline interval
    const baselineIntervalMs = endpoint.baselineIntervalMs || 5 * 60 * 1000; // Default to 5 min if no baseline
    const effectiveIntervalMs = nextAnalysisInMs ?? baselineIntervalMs;
    const nextAnalysisAt = new Date(clock.now().getTime() + effectiveIntervalMs);

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
      nextAnalysisAt,
      endpointFailureCount: endpoint.failureCount,
    });

    // Log summary for real-time observability
    if (session.toolCalls.length > 0) {
      console.warn(`[AI Analysis] ${endpoint.name}:`, {
        toolsCalled: session.toolCalls.map(tc => tc.tool),
        reasoning: safeReasoning.slice(0, 150) + (safeReasoning.length > 150 ? "..." : ""),
        tokens: session.tokenUsage,
      });

      const toolTelemetry = session.toolCalls.map((tc) => {
        const argChars = JSON.stringify(tc.args ?? null).length;
        const resultChars = JSON.stringify(tc.result ?? null).length;
        const approxTokens = Math.ceil((argChars + resultChars) / 4);
        return {
          tool: tc.tool,
          argChars,
          resultChars,
          approxTokens,
        };
      });

      const aggregated = toolTelemetry.reduce<Record<string, { count: number; approxTokens: number }>>((acc, entry) => {
        if (!acc[entry.tool])
          acc[entry.tool] = { count: 0, approxTokens: 0 };
        acc[entry.tool].count += 1;
        acc[entry.tool].approxTokens += entry.approxTokens;
        return acc;
      }, {});

      console.warn(`[AI Analysis][telemetry] ${endpoint.name}:`, {
        tokenUsage: session.tokenUsage,
        perTool: aggregated,
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
