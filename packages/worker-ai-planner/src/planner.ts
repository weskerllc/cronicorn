/**
 * AI Planner Worker Orchestration
 *
 * Analyzes endpoint execution patterns and suggests adaptive scheduling adjustments.
 * Runs independently from the scheduler worker - communicates via database.
 */

import type { AIClient, Clock, JobsRepo, QuotaGuard, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { createToolsForEndpoint } from "./tools.js";

export type PlannerLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type AIPlannerDeps = {
  aiClient: AIClient;
  jobs: JobsRepo;
  runs: RunsRepo;
  sessions: SessionsRepo;
  quota: QuotaGuard;
  clock: Clock;
  logger: PlannerLogger;
  maxTokens?: number;
};

/** Action tool names used for extracting actions from previous sessions */
const ACTION_TOOL_NAMES = new Set(["propose_interval", "propose_next_time", "pause_until", "clear_hints"]);

/**
 * Build lean analysis prompt for AI.
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
  lastSession?: {
    analyzedAt: Date;
    reasoning: string;
    actions: string[];
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

  // Schedule type
  const isCron = !!endpoint.baselineCron;

  // Last session context (gives AI continuity between sessions)
  let lastSessionSection = "";
  if (lastSession) {
    const agoMs = currentTime.getTime() - lastSession.analyzedAt.getTime();
    const agoMin = Math.round(agoMs / 60000);
    const agoLabel = agoMin < 60 ? `${agoMin} min ago` : `${(agoMin / 60).toFixed(1)}h ago`;
    const actionsLabel = lastSession.actions.length > 0 ? ` (${lastSession.actions.join(", ")})` : " (no action)";
    lastSessionSection = `\n**Last Analysis:** ${agoLabel} — "${lastSession.reasoning}"${actionsLabel}`;
  }

  // First analysis note (when no execution data exists)
  const totalRuns = health.hour24.successCount + health.hour24.failureCount;
  const firstAnalysisNote = totalRuns === 0
    ? "\n\n**Note:** No execution data yet. Be conservative — submit analysis with a short `next_analysis_in_ms` to re-check soon."
    : "";

  return `# Adaptive Scheduler AI

You analyze scheduled endpoint executions and suggest timing adjustments when warranted.

## Your Role
- **Follow the endpoint description as your primary rules** — it contains the user's thresholds and conditions for when to act
- Match response body fields against thresholds/conditions mentioned in the description
- Suggest scheduling changes only with clear evidence
- Default to stability—most endpoints need no intervention
- **Maximum 15 tool calls per session**
- Write reasoning / analysis in short, plain sentences. No filler words. State what you observed and what you did.

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

**Name:** ${endpoint.name}${endpoint.description ? `\n**Adaptation Rules:** ${endpoint.description}` : ""}
**Job:** ${jobContext}${jobDescription ? ` — ${jobDescription}` : ""}

**Schedule:**
- Baseline: ${endpoint.baselineCron || `${endpoint.baselineIntervalMs}ms interval`}${isCron ? " (cron)" : " (interval)"}
- Last Run: ${endpoint.lastRunAt?.toISOString() || "Never"}
- Next Scheduled: ${endpoint.nextRunAt.toISOString()}
- Status: ${pauseStatus}
- Failure Count: ${endpoint.failureCount}${backoffNote}

**Constraints:** Min ${endpoint.minIntervalMs ? `${endpoint.minIntervalMs}ms` : "none"}, Max ${endpoint.maxIntervalMs ? `${endpoint.maxIntervalMs}ms` : "none"}${aiHintsSection}${lastSessionSection}

**Health:**
| Window | Success | Runs |
|--------|---------|------|
| 1h  | ${health.hour1.successRate}% | ${health.hour1.successCount + health.hour1.failureCount} |
| 4h  | ${health.hour4.successRate}% | ${health.hour4.successCount + health.hour4.failureCount} |
| 24h | ${health.hour24.successRate}% | ${health.hour24.successCount + health.hour24.failureCount} |

Failure streak: ${health.failureStreak}, Avg duration: ${health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
↳ Compare 1h vs 24h: if short windows are healthy but 24h is low, the endpoint has recovered — prefer \`clear_hints\`.${firstAnalysisNote}

## How Your Actions Affect Scheduling

**Priority Order (Governor):**
1. **Pause** — If \`pausedUntil > now\`, nothing else runs
2. **Clamp** — All times clamped to [min, max] constraints (hard limits)
3. **AI Hints** — Your interval/one-shot proposals (if not expired)
4. **Baseline** — User's original schedule (with backoff if failures > 0)

**\`propose_interval\`:** OVERRIDES baseline while active, bypasses backoff. Expires at TTL → reverts to baseline.${isCron ? "\n↳ This endpoint uses cron — an interval hint replaces the cron schedule entirely while active." : ""}
↳ If failure streak is high, tightening may worsen the problem. Consider \`pause_until\` or let backoff work unless the description explicitly requests aggressive monitoring during failures.

**\`propose_next_time\`:** COMPETES with baseline (earliest wins). Good for "run now" or "defer to specific time".

**Both Active:** They compete (earliest wins), baseline ignored.

**Backoff (Baseline Only):** \`baselineInterval × 2^min(failureCount, 5)\` — max 32x. Your hints bypass this.

**\`clear_hints\`:** Revert to baseline immediately. Use when the endpoint has recovered (short-window health is healthy) or when conditions in the description have returned to normal.

## Tools

**Query:**
- \`get_latest_response\` — Current response body (truncated at 500 chars)
- \`get_response_history\` — Recent responses (default 5, metadata-only; set includeBodies=true for payloads)
- \`get_sibling_latest_responses\` — Other endpoints in this job (includeResponses=true for payloads)

**Actions:**
- \`propose_interval\` — Change frequency (intervalMs, ttlMinutes?, reason?)
- \`propose_next_time\` — One-shot schedule (nextRunAtIso, ttlMinutes?, reason?)
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
    const { aiClient, jobs, runs, sessions, quota, clock, logger } = this.deps;

    // 1. Get current endpoint state
    const endpoint = await jobs.getEndpoint(endpointId);

    // 2. Check quota before making AI call
    const canProceed = await quota.canProceed(endpoint.tenantId);
    if (!canProceed) {
      logger.warn(`Quota exceeded for tenant ${endpoint.tenantId}, skipping analysis for endpoint ${endpoint.name}`);
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

    // 5. Get last session context for continuity between analyses
    const recentSessions = await sessions.getRecentSessions(endpointId, 1);
    const lastSessionContext = recentSessions.length > 0
      ? {
          analyzedAt: recentSessions[0].analyzedAt,
          reasoning: (recentSessions[0].reasoning || "No reasoning recorded").slice(0, 150),
          actions: recentSessions[0].toolCalls
            .filter(tc => ACTION_TOOL_NAMES.has(tc.tool))
            .map(tc => tc.tool),
        }
      : undefined;

    // 6. Build AI context with all available information
    const prompt = buildAnalysisPrompt(clock.now(), jobDescription, siblingNames, endpoint, health, lastSessionContext);

    // 7. Create endpoint-scoped tools (3 query + 4 action + 1 terminal)
    // Note: jobId is required for sibling queries. If missing, sibling tool will return empty.
    const tools = createToolsForEndpoint(endpointId, endpoint.jobId || "", { jobs, runs, clock });

    // 8. Invoke AI with tools and capture session result
    const startTime = clock.now().getTime();
    const session = await aiClient.planWithTools({
      finalToolName: "submit_analysis",
      input: prompt,
      tools,
      maxTokens: this.deps.maxTokens ?? 1500,
    });
    const durationMs = clock.now().getTime() - startTime;

    // 9. Extract reasoning from submit_analysis tool call
    const submitAnalysisCall = session.toolCalls.find(tc => tc.tool === "submit_analysis");
    if (!submitAnalysisCall) {
      logger.warn(`Missing submit_analysis tool call for endpoint ${endpoint.name}`);
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
      logger.warn(`Missing reasoning for endpoint ${endpoint.name}`);
    }

    const safeReasoning = reasoning ?? "No reasoning provided";
    // 10. Persist session to database for debugging/cost tracking
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
      logger.info(`Analysis complete: ${endpoint.name}`, {
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

      logger.info(`Telemetry: ${endpoint.name}`, {
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
        this.deps.logger.error(`Failed to analyze endpoint ${id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
