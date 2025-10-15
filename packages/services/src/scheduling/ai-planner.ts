/**
 * AI Planner Service
 *
 * Analyzes endpoint execution patterns and suggests adaptive scheduling adjustments.
 * Runs independently from the scheduler worker - communicates via database.
 */

import type { Clock, JobsRepo, RunsRepo } from "@cronicorn/domain";
import type { AIClient } from "@cronicorn/scheduler";

import { createToolsForEndpoint } from "./ai-tools.js";

export type AIPlannerDeps = {
  aiClient: AIClient;
  jobs: JobsRepo;
  runs: RunsRepo;
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

  return `You are an adaptive job scheduler AI. Analyze this endpoint's execution patterns and suggest adjustments if needed.

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

**Available Actions:**
1. **propose_interval** - Adjust execution frequency (e.g., increase if unstable, decrease if stable)
2. **propose_next_time** - Schedule one-shot execution (e.g., run immediately to investigate, or defer to off-peak)
3. **pause_until** - Pause temporarily or indefinitely (e.g., during maintenance)

**Guidelines:**
- Only suggest changes if patterns warrant adjustment
- High failure rate (>30%) → consider pausing or reducing frequency
- Stable performance + low frequency → consider increasing frequency
- Failure streak ≥3 → investigate immediately or pause
- Normal operation → no action needed

Analyze the data and call appropriate tools if adjustments would improve reliability or efficiency. If everything looks normal, respond with analysis but don't call any tools.`;
}

/**
 * AI Planner Service
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
    const { aiClient, jobs, runs, clock } = this.deps;

    // 1. Get current endpoint state
    const endpoint = await jobs.getEndpoint(endpointId);

    // 2. Get health summary (last 24 hours)
    const since = new Date(clock.now().getTime() - 24 * 60 * 60 * 1000);
    const health = await runs.getHealthSummary(endpointId, since);

    // 3. Build AI context
    const prompt = buildAnalysisPrompt(endpoint, health);

    // 4. Create endpoint-scoped tools
    const tools = createToolsForEndpoint(endpointId, jobs, clock);

    // 5. Invoke AI with tools
    // AI will analyze and optionally call tools to write hints
    await aiClient.planWithTools({
      input: prompt,
      tools,
      maxTokens: 500, // Keep responses concise
    });

    // Tools write hints to database asynchronously
    // Scheduler will pick them up on next execution
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
