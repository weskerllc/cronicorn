# AI-Driven Adaptive Scheduler — Architecture & Intent

> **Note**: This document describes the core scheduling architecture and simulation patterns. For current implementation status, see `TODO.md`. For architectural decisions, see `.adr/` folder.

## At a glance

- **Mission:** Keep every `JobEndpoint` on the right cadence by blending a baseline schedule with short-lived AI "hints" that can tighten, relax, or pause runs in real time.
- **Loop:** AI tooling (rule-based or model-driven) writes hints through ports → the scheduler claims due endpoints, executes them, records the run, and asks the governor for the next slot → the governor reconciles baseline cadence, AI hints, clamps, and pauses to produce the next run time.
- **Building blocks:** Domain package holds pure logic (entities, ports, governor); adapters provide infrastructure (DrizzleJobsRepo, HttpDispatcher, CronParser, etc.); fake adapters (FakeClock, FakeDispatcher) enable deterministic testing; the simulator demonstrates the full loop without touching a real DB or external APIs.
- **You can explore it today:** Run `pnpm sim` to watch a complete **e-commerce flash sale scenario** with 10 endpoints orchestrating across 4 coordination tiers—traffic monitoring tightens from 1m→20s, investigation tools activate conditionally, recovery actions fire with cooldowns, and alerts escalate from Slack→oncall.

> **Purpose:** This document explains the complete intent and mechanics of the AI-driven scheduler prototype so another AI/engineer can confidently extend, test, or port it. It covers file structure, domain concepts, ports, tools, scheduling logic, simulator design, testability, and integration guidance (e.g., Vercel AI SDK).

If you are brand new, read the quick outcomes (Section 0), map the folders (Section 1), then dive into the core circuitry (Sections 2–7). Everything below is self-contained—no other docs required.

---

## 0) Outcomes to Validate

- **Adaptive cadence**: endpoints speed up when conditions deteriorate (surge→strain→critical) and relax during recovery.
- **Multi-tier coordination**: 10 endpoints across 4 tiers (Health, Investigation, Recovery, Alert) work together using shared metrics.
- **Conditional activation**: Investigation tier endpoints (slow page analyzer, database trace) activate only when thresholds crossed.
- **One-shot actions**: Recovery actions (cache warm-up, scaling) fire once with cooldowns, not repeatedly.
- **Alert escalation**: Slack ops → Slack support → oncall page, each with appropriate cooldown windows.
- **Nudging works**: AI tool proposals immediately bring runs forward (without waiting for the next cycle).
- **Governor chooses the right source**: baseline vs AI (interval or one-shot) vs clamps vs pause.
- **DB-optional simulation**: Full behavior validated without a database or external services—467 runs across 40 simulated minutes.

---

## 1) Repository Layout

The project follows **hexagonal architecture** with clean separation between domain, adapters, and composition roots:

```
packages/
├─ domain/                      # Pure core (no IO dependencies)
│  ├─ entities/                 # JobEndpoint, Job, Run types
│  ├─ ports/                    # Interfaces (Clock, Cron, Repos, Dispatcher, etc.)
│  ├─ governor/                 # planNextRun: baseline + AI hints + clamps + pause
│  ├─ fixtures/                 # In-memory repos for testing
│  └─ testing/                  # Contract test suites
│
├─ scheduler/                   # Scheduler orchestration
│  ├─ domain/
│  │  └─ scheduler.ts           # Tick loop: claim → execute → plan → update
│  ├─ adapters/                 # Test fakes (FakeClock, FakeDispatcher, FakeQuota)
│  ├─ sim/                      # E-commerce flash sale scenario
│  └─ tools/                    # AI tool definitions
│
├─ adapter-drizzle/             # PostgreSQL implementation
├─ adapter-cron/                # Cron expression parser
├─ adapter-http/                # HTTP request dispatcher
├─ adapter-system-clock/        # System time provider
├─ adapter-ai/                  # Vercel AI SDK integration
└─ services/                    # Business logic layer (JobsManager)

apps/
├─ scheduler/                   # Worker composition root
├─ api/                         # REST API composition root
└─ test-ai/                     # AI integration tests
```

This architecture intentionally separates:
- **Domain** (pure logic & types) from **Adapters** (IO implementations)
- **Ports** (interfaces) from concrete implementations
- **Composition roots** (apps) wire everything together

---

## 2) Domain Concepts

### 2.1 JobEndpoint (key state per endpoint)

- `id`, `jobId`, `tenantId`, `name`
- **Baseline cadence**: `baselineCron?` or `baselineIntervalMs`
- **AI hints**: `aiHintIntervalMs?`, `aiHintNextRunAt?`, `aiHintExpiresAt?`
- **Guards**: `minIntervalMs?`, `maxIntervalMs?`
- **Pause**: `pausedUntil?`
- **Run tracking**: `lastRunAt?`, `nextRunAt`, `failureCount`

### 2.2 AI Hints (how AI steers schedule)

- **Interval hint**: “run every N milliseconds until expiry” → converts to `lastRunAt + aiHintIntervalMs` candidate.
- **One-shot hint**: “run at time T exactly” → absolute candidate.
- **TTL/expiry**: hints ignored after `aiHintExpiresAt`.

### 2.3 Governor (planner of `nextRunAt`)

Given `(now, endpoint)` returns `{ nextRunAt, source }` where `source ∈ { "baseline-*", "ai-interval", "ai-oneshot", "clamped-*", "paused" }`.

Algorithm:

1. Build candidates:
   - Baseline (cron or `lastRunAt + baselineIntervalMs`).
   - AI interval (if hint fresh): `lastRunAt + aiHintIntervalMs`.
   - AI one-shot (if hint fresh): `aiHintNextRunAt`.
2. Choose earliest **future** time.
3. Clamp relative to **lastRunAt** using `minIntervalMs`/`maxIntervalMs`.
4. If `pausedUntil > now`, override and return `"paused"`.

This makes AI intervals truly win **after a run** (critical for adaptive cadence).

---

## 3) Ports (Interfaces) — `domain/ports.ts`

> Keep domain testable and adapter-agnostic. A minimal set:

### 3.1 Core types

```ts
export type JobEndpoint = {
  id: string;
  jobId: string;
  tenantId: string;
  name: string;

  baselineCron?: string;
  baselineIntervalMs?: number;

  aiHintIntervalMs?: number;
  aiHintNextRunAt?: Date;
  aiHintExpiresAt?: Date;

  minIntervalMs?: number;
  maxIntervalMs?: number;

  pausedUntil?: Date;

  lastRunAt?: Date;
  nextRunAt: Date;
  failureCount: number;
};
```

### 3.2 Repos & Services

```ts
export type JobsRepo = {
  add: (ep: Partial<JobEndpoint> & { id: string; name: string; nextRunAt: Date }) => Promise<void>;
  getEndpoint: (id: string) => Promise<JobEndpoint>;
  updateAfterRun: (
    id: string,
    update: {
      lastRunAt: Date;
      nextRunAt: Date;
      status: { status: "success" | "failure"; durationMs: number };
      failureCountDelta: -1 | 1;
      clearExpiredHints?: boolean;
    }
  ) => Promise<void>;

  // AI steering
  writeAIHint: (
    id: string,
    hint: { intervalMs?: number; nextRunAt?: Date; expiresAt: Date; reason?: string }
  ) => Promise<void>;
  setNextRunAtIfEarlier: (id: string, when: Date) => Promise<void>;
  setPausedUntil: (id: string, until: Date | null) => Promise<void>;

  // Scheduling
  claimDueEndpoints: (limit: number, withinMs: number) => Promise<string[]>;
};

export type RunsRepo = {
  recordRun: (
    epId: string,
    at: Date,
    status: { status: "success" | "failure"; durationMs: number }
  ) => Promise<void>;
};

export type Dispatcher = {
  execute: (ep: JobEndpoint) => Promise<{ status: "success" | "failure"; durationMs: number }>;
};

export type Clock = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
};
```

### 3.3 Tool calling helper

```ts
export async function callTool<
  TTools extends Record<string, { execute: (payload: unknown) => Promise<unknown> | unknown }>,
  TName extends keyof TTools & string,
>(
  tools: TTools,
  name: TName,
  args: Parameters<TTools[TName]["execute"]>[0]
): Promise<ReturnType<TTools[TName]["execute"]>> {
  const tool = tools[name];
  if (!tool?.execute)
    throw new Error(`tool not found: ${String(name)}`);
  return Promise.resolve(tool.execute(args));
}
```

This keeps tool calls **typed** without `any` in your app surface.

---

## 4) Adapters

### 4.1 FakeClock — `adapters/fake-clock.ts`

Deterministic clock with `now()` and async `sleep(ms)` that advances time.

### 4.2 FakeDispatcher — `adapters/fake-dispatcher.ts`

- For CPU endpoint: push a metric sample so the planner has data.
- For Discord endpoint: pretend to send and succeed.

### 4.3 InMemoryJobsRepo — `packages/domain/src/fixtures/in-memory-jobs-repo.ts`

- Stores endpoints in a `Map<string, JobEndpoint>`.
- Implements **AI hint writes** and **nudging** (immediate `nextRunAt` set if earlier).

**Critical helper (nudging):**

```ts
async function setNextRunAtIfEarlier({
  endpoint,
  now,
  when,
}: {
  endpoint: JobEndpoint;
  now: Date;
  when: Date;
}) {
  if (endpoint.pausedUntil && endpoint.pausedUntil > now)
    return;

  const minAt = endpoint.minIntervalMs ? new Date(now.getTime() + endpoint.minIntervalMs) : undefined;
  const maxAt = endpoint.maxIntervalMs ? new Date(now.getTime() + endpoint.maxIntervalMs) : undefined;

  let candidate = when;
  if (minAt && candidate < minAt)
    candidate = minAt;
  if (maxAt && candidate > maxAt)
    candidate = maxAt;

  if (candidate < endpoint.nextRunAt) {
    endpoint.nextRunAt = candidate;
  }
}
```

This is how tool proposals take effect immediately.

### 4.4 FakeQuota — `adapters/fake-quota.ts`

- Placeholder for AI token checking; can be injected into the planner or dispatcher policies.
- Keep it out of the governor so scheduling math stays pure.

---

## 5) Scheduler — `domain/scheduler.ts`

Think of the scheduler as the traffic cop that keeps the loop moving:

```
AI policy/tools ──▶ JobsRepo hints ──▶ scheduler.tick()
      ▲                              │
      │                              ▼
  telemetry + runs ◀── RunsRepo ◀── Dispatcher
      │
      └────── governor.planNextRun (baseline ⊕ hints ⊕ clamps)
```

Responsibilities per **tick**:

1. **Scan and lease due work**: call `claimDueEndpoints(limit, withinMs)` so only this scheduler instance touches the endpoints scheduled in the next horizon.
2. **Execute each endpoint atomically**:

- Load the fresh endpoint via `JobsRepo.getEndpoint`.
- **Dispatch** the work (`Dispatcher.execute`) and mirror the result into the **RunsRepo** (`recordRun`).
- Hand the endpoint plus the current time to the **governor** to compute the next run (`planNextRun(now, ep)`).
- Persist everything back with `JobsRepo.updateAfterRun`, including failure counters and clearing expired hints.

3. **Optional observability**: log the governor source (`baseline-cron`, `ai-interval`, etc.) to make behavior easy to audit.

The scheduler never “does AI” itself — it simply honours whatever hints were written before the tick, applies the deterministic planning rules, and writes the next appointment.

---

## 6) Governor — `domain/governor.ts`

The improved implementation (key parts):

```ts
type Source =
  | "paused"
  | "ai-oneshot"
  | "ai-interval"
  | "baseline-cron"
  | "baseline-interval"
  | "clamped-min"
  | "clamped-max";

type Candidate = { at: Date; src: Source };

export function planNextRun(now: Date, j: JobEndpoint): { nextRunAt: Date; source: Source } {
  const nowMs = now.getTime();
  const last = j.lastRunAt ?? now;
  const lastMs = last.getTime();

  const baseline = j.baselineCron
    ? { at: nextCronFire(j.baselineCron, now), src: "baseline-cron" as const }
    : { at: new Date(lastMs + (j.baselineIntervalMs ?? 60_000)), src: "baseline-interval" as const };

  const fresh = !!(j.aiHintExpiresAt && j.aiHintExpiresAt.getTime() > nowMs);
  const aiInterval = fresh && j.aiHintIntervalMs ? { at: new Date(lastMs + j.aiHintIntervalMs), src: "ai-interval" as const } : undefined;
  const aiOneShot = fresh && j.aiHintNextRunAt ? { at: j.aiHintNextRunAt, src: "ai-oneshot" as const } : undefined;

  const candidates = [baseline, aiInterval, aiOneShot].filter((candidate): candidate is Candidate => Boolean(candidate));
  let chosen = candidates.sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  if (chosen.at.getTime() < nowMs)
    chosen = { at: new Date(nowMs), src: chosen.src };

  const minAt = j.minIntervalMs ? new Date(lastMs + j.minIntervalMs) : undefined;
  const maxAt = j.maxIntervalMs ? new Date(lastMs + j.maxIntervalMs) : undefined;
  if (minAt && chosen.at < minAt)
    chosen = { at: minAt, src: "clamped-min" };
  if (maxAt && chosen.at > maxAt)
    chosen = { at: maxAt, src: "clamped-max" };

  if (j.pausedUntil && j.pausedUntil > now)
    return { nextRunAt: j.pausedUntil, source: "paused" };

  return { nextRunAt: chosen.at, source: chosen.src };
}
```

**Why this matters:** AI interval hints are computed off **`lastRunAt`**, so they truly tighten cadence after each run.

---

## 7) Scenario & Simulator — `sim/scenarios.ts` + `sim/simulate.ts`

### 7.1 Tools (endpoint-scoped, SDK compatible)

We expose three tools per endpoint:

- `propose_interval { intervalMs, ttlMinutes?, reason? }`
- `propose_next_time { nextRunInMs? | nextRunAtIso?, ttlMinutes?, reason? }`
- `pause_until { untilIso: string|null, reason? }`

All three write AI hints to `JobsRepo` and use `setNextRunAtIfEarlier` to **nudge** `nextRunAt` immediately.

### 7.2 Flash Sale Scenario (Primary Example)

> 📖 **Deep dive:** [`flash-sale-scenario.md`](./flash-sale-scenario.md) — Complete walkthrough with minute-by-minute timeline, all 10 endpoints explained, and coordination patterns.

**Context:** E-commerce flash sale event spanning 40 minutes with 5 phases (baseline → surge → strain → critical → recovery).

**Metrics:** `traffic` (visitors/min), `ordersPerMin`, `pageLoadMs`, `inventoryLagMs`, `dbQueryMs`.

**4-Tier Architecture:**

- **Tier 1: Health (Continuous)** — traffic_monitor (1m→20s→1m), order_processor_health (2m→5m), inventory_sync_check (3m→30s)
- **Tier 2: Investigation (Conditional)** — slow_page_analyzer, database_query_trace (activate when thresholds crossed)
- **Tier 3: Recovery (One-Shot)** — cache_warm_up (10m cooldown), scale_checkout_workers (15m cooldown)
- **Tier 4: Alert (Escalation)** — slack_operations → slack_customer_support → emergency_oncall_page

**Coordination:** Shared metrics enable conditional activation; cooldown state prevents duplicate actions; 467 total runs across 40 minutes.

### 7.3 Sim loop: Measure → Plan → Drain

Per minute:

1. **Measure** once via `scheduler.tick()` (collect metrics if due).
2. **Plan**: run all tier policies that call tools (writes hints + nudges) based on shared metrics.
3. **Drain**: claim & execute due endpoints until empty; then advance inside the minute with 5s sleeps + short ticks so sub-minute cadences can fire.
4. **Snapshot** with full flash sale metrics.

**Output example (strain phase, minute 9-12):**

```
minute │  traffic   │  orders   │ pageLoad │ nextCheck
  9m   │ 5500/min   │ 160/min   │ 3200ms   │   15s
 10m   │ 5500/min   │ 160/min   │ 3200ms   │   15s
```

Traffic monitor adapts to 15s checks; page load degrading triggers Investigation/Recovery/Alert tiers.

### 7.4 `simulate.ts`

Entry point: imports `scenario_flash_sale()`, validates 18 assertions across all tiers, renders phase-separated tables.

### 7.3 Sim loop: Measure → Plan → Drain

Per minute:

1. **Measure** once via `scheduler.tick()` (collect metrics if due).
2. **Plan**: run AI “policy” that calls tools (writes hints + nudges).
3. **Drain**: claim & execute due endpoints until empty; then advance inside the minute with 5s sleeps + short ticks so 30s cadence can actually run multiple times.
4. **Snapshot** logs (ISO).

This is what produced the healthy logs:

- CPU: many `source=ai-interval` entries during high window; widening after recovery.
- Discord: one `ai-oneshot` + short clamped-min staircase, then silence until cooldown.

### 7.4 `simulate.ts`

Simple entry: imports `scenario_system_resources()` and prints counts/logs.

---

## 8) Testability (No DB required)

- All behavior is deterministic under `FakeClock`.
- You can assert on:
  - Count of `source=ai-interval` logs during high vs after recovery.
  - Number of Discord `ai-oneshot` per run (≤ 1 or 2).
  - `discordPaused` true except near alert.
- The tools + repos + governor are pure or side-effected through in-memory adapters, making unit and integration tests easy.

**Example assertions gist (pseudo):**

```ts
expect(cpuAiDuringHigh).toBeGreaterThanOrEqual(20);
expect(cpuAiAfterHigh).toBe(0);
expect(discordOneShots).toBeLessThanOrEqual(2);
expect(alwaysPausedExceptAlert).toBe(true);
```

---

## 9) Quotas & Guardrails

- Place token/quota checks **outside** the governor (e.g., in the planner or dispatcher), so scheduling math stays pure.
- Example spots:
  - Before planning decides to call an AI tool (block tool writes if quota exceeded).
  - Before executing an endpoint that would spend model tokens (block dispatch/source integration).

The `FakeQuota` adapter and a small gate in the planner are sufficient to validate behavior without wiring a real billing system.

---

## 10) Data Model (Minimal for this prototype)

You don’t need a DB for the sim, but if/when you do:

**Tables:**

- `jobs` (job id, tenant id, name, metadata)
- `endpoints` (FK job, baseline cadence, min/max, pause fields, last/next run, failure count)
- `ai_hints` (endpoint id, interval_ms?, next_run_at?, expires_at, reason, created_at)
- `runs` (endpoint id, at, duration_ms, status, error?)

**Indexes:**

- `endpoints(next_run_at)` for “claim due” queries.
- `ai_hints(endpoint_id, expires_at DESC)`

**Claim strategy:**

- `UPDATE ... WHERE next_run_at <= now + withinMs LIMIT N RETURNING id` with a lease column if needed.

---

## 11) Vercel AI SDK (future integration)

- Keep the tools object shape as-is; Vercel’s **Tool** type is compatible.
- The planner can be backed by a model (`responses` or `generateText`) that **calls these tools**.
- Testing helpers from the SDK can stub tool calls in unit tests; this is fine (not “over-coupled”) because the **domain remains pure** and tools are injected.
- Integration points:
  - Replace `RuleBasedFakeAI` with SDK-driven planner (the sim already calls `planWithTools({ model, tools, input })`).
  - Keep quota checks around AI calls.

---

## 12) Logging & Observability

- Log every governor decision: `[governor] <id>: next=<iso> source=<source>`.
- Log nudges: `[nudge] <id>: before=<iso> candidate=<iso> now=<iso>` and `[nudge-skip] ...`.
- Snapshot per-minute: `cpu=.., next(cpu)=.., discordPaused=..`.
- In prod: add run IDs, job IDs, and error traces.

---

## 13) Edge Cases & Policies

- **Paused endpoints**: pause wins over all hints; resume via `pause_until(null)`.
- **Expired hints**: scheduler clears them after run; governor ignores if `aiHintExpiresAt <= now`.
- **Clamp conflicts**: if AI proposes too soon, min clamp will push out (source=`clamped-min`).
- **Cron**: if baseline is cron, one-shots beat cron once; intervals can beat cron while fresh.
- **Thundering herds**: add small jitter (±3s) to next times in production.

---

## 14) Hand-off Summary (what an agent must know)

1. **Intent**: An AI “planner” writes **temporary hints** and **one-shots** via tools to adapt per-endpoint cadence.
2. **Immediate effect**: Tool calls also **nudge** `nextRunAt` forward using `setNextRunAtIfEarlier`.
3. **Governor**: Chooses the earliest candidate among baseline/AI hints, clamps, then respects pause.
4. **Simulator**: Validates the loop with deterministic time and a CPU/Discord policy.
5. **Alert control**: Discord is one-shot + short re-pause + cooldown to avoid noise.
6. **Testability**: Entire system runs without DB or external services; assertions verify behavior.
7. **Extensibility**: Ports keep the domain independent of any AI SDK or infrastructure.

---

## 15) Quick Start (Sim)

```bash
pnpm --filter @cronicorn/scheduler run sim
# or from packages/scheduler:
pnpm sim
```

Expected output:

- **467 total runs** across 10 endpoints over 40 simulated minutes
- **Health Tier:** ~311 runs (traffic=201, orders=43, inventory=67)
- **Investigation Tier:** ~54 runs (activates during strain, deactivates during recovery)
- **Recovery Tier:** ~51 runs (cache warm-up and scaling with cooldowns)
- **Alert Tier:** ~51 runs (ops→support escalation)
- **Phase tables:** Beautiful formatted output showing traffic, orders, pageLoad, inventoryLag, dbQuery for each phase
- **18 assertions passing:** Validates adaptive intervals, conditional activation, cooldowns, escalation, cross-tier coordination

See [`flash-sale-scenario.md`](./flash-sale-scenario.md) for complete explanation.

---

## 16) Glossary

- **Baseline cadence**: The default schedule (cron or interval) when no AI hints apply.
- **AI interval hint**: Temporary “run every N” until expiry; computed relative to `lastRunAt`.
- **AI one-shot**: A single target time for the next run.
- **Nudge**: Immediate move of `nextRunAt` earlier to make hints take effect right away.
- **Clamp**: Enforced min/max spacing around runs.
- **Pause**: Hard gate that suppresses runs until a specified time.
- **Cooldown**: Post-alert quiet period for notification endpoints.
