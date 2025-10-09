
# AI-Driven Adaptive Scheduler — Architecture & Intent

> **Purpose:** This document explains the complete intent and mechanics of the AI-driven scheduler prototype so another AI/engineer can confidently extend, test, or port it. It covers file structure, domain concepts, ports, tools, scheduling logic, simulator design, testability, and integration guidance (e.g., Vercel AI SDK).

---

## 0) Outcomes to Validate

- **Adaptive cadence**: endpoints speed up when conditions are “high” and relax when “recovered”.
- **Nudging works**: AI tool proposals immediately bring runs forward (without waiting for the next cycle).
- **Governor chooses the right source**: baseline vs AI (interval or one-shot) vs clamps vs pause.
- **Alert control**: Discord alerts are one-shot + cooldown (no chatter).
- **DB-optional simulation**: Full behavior validated without a database or external services.

---

## 1) Repository Layout

```
packages/feature-endpoints/
└─ src/
   ├─ adapters/
   │  ├─ fake-clock.ts          # deterministic time for tests/sim
   │  ├─ fake-dispatcher.ts     # executes endpoints; CPU endpoint records metrics
   │  ├─ fake-quota.ts          # placeholder for token/AI quota enforcement
   │  └─ memory-store.ts        # in-memory Jobs repo w/ AI hints + "nudge" helper
   ├─ domain/
   │  ├─ governor.ts            # planNextRun: baseline + AI hints + clamps + pause
   │  ├─ ports.ts               # core types & ports (interfaces)
   │  └─ scheduler.ts           # scheduler loop: tick, claim, run, persist, compute next
   └─ sim/
      ├─ scenarios.ts           # scenario: CPU + Discord policy + planning tools
      └─ simulate.ts            # entrypoint to run the scenario
```

This project intentionally separates **domain** (pure logic & types) from **adapters** (IO, fake infrastructure) and **sim** (usage scenarios).

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
export interface JobEndpoint {
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
}
```

### 3.2 Repos & Services
```ts
export interface JobsRepo {
  add(ep: Partial<JobEndpoint> & { id: string; name: string; nextRunAt: Date }): Promise<void>;
  getEndpoint(id: string): Promise<JobEndpoint>;
  updateAfterRun(
    id: string,
    update: {
      lastRunAt: Date;
      nextRunAt: Date;
      status: { status: "success" | "failure"; durationMs: number };
      failureCountDelta: -1 | 1;
      clearExpiredHints?: boolean;
    }
  ): Promise<void>;

  // AI steering
  writeAIHint(id: string, hint: { intervalMs?: number; nextRunAt?: Date; expiresAt: Date; reason?: string }): Promise<void>;
  setNextRunAtIfEarlier(id: string, when: Date): Promise<void>;
  setPausedUntil(id: string, until: Date | null): Promise<void>;

  // Scheduling
  claimDueEndpoints(limit: number, withinMs: number): Promise<string[]>;
}

export interface RunsRepo {
  recordRun(epId: string, at: Date, status: { status: "success" | "failure"; durationMs: number }): Promise<void>;
}

export interface Dispatcher {
  execute(ep: JobEndpoint): Promise<{ status: "success" | "failure"; durationMs: number }>;
}

export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}
```

### 3.3 Tool calling helper
```ts
export async function callTool<TTools, TName extends keyof TTools & string>(
  tools: TTools,
  name: TName,
  args: TTools[TName] extends { execute: (p: infer P) => any } ? P : never
) {
  const t = (tools as any)[name];
  if (!t?.execute) throw new Error(`tool not found: ${String(name)}`);
  return t.execute(args as any);
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

### 4.3 InMemoryJobsRepo — `adapters/memory-store.ts`
- Stores endpoints in a `Map<string, JobEndpoint>`.
- Implements **AI hint writes** and **nudging** (immediate `nextRunAt` set if earlier).

**Critical helper (nudging):**
```ts
async setNextRunAtIfEarlier(id: string, when: Date) {
  const e = this.map.get(id)!;
  const now = this.now();
  if (e.pausedUntil && e.pausedUntil > now) return;

  const minAt = e.minIntervalMs ? new Date(now.getTime() + e.minIntervalMs) : undefined;
  const maxAt = e.maxIntervalMs ? new Date(now.getTime() + e.maxIntervalMs) : undefined;

  let candidate = when;
  if (minAt && candidate < minAt) candidate = minAt;
  if (maxAt && candidate > maxAt) candidate = maxAt;

  if (candidate < e.nextRunAt) e.nextRunAt = candidate;
}
```

This is how tool proposals take effect immediately.

### 4.4 FakeQuota — `adapters/fake-quota.ts`
- Placeholder for AI token checking; can be injected into the planner or dispatcher policies.
- Keep it out of the governor so scheduling math stays pure.

---

## 5) Scheduler — `domain/scheduler.ts`

Responsibilities per **tick**:

1. **Scan due endpoints**: `claimDueEndpoints(limit, withinMs)`.
2. For each due endpoint:
   - **Dispatch** (`Dispatcher.execute`) and **record run** (`RunsRepo.recordRun`).
   - Update `lastRunAt`, compute `nextRunAt = planNextRun(now, ep)` using **governor**.
   - Persist with `JobsRepo.updateAfterRun`.
3. Optionally **log** `source` from governor for debugging.

The scheduler never “does AI” — it only executes and reschedules based on domain rules and hints written elsewhere.

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

  const candidates = [baseline, aiInterval, aiOneShot].filter(Boolean) as Array<{ at: Date; src: Source }>;
  let chosen = candidates.sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  if (chosen.at.getTime() < nowMs) chosen = { at: new Date(nowMs), src: chosen.src };

  const minAt = j.minIntervalMs ? new Date(lastMs + j.minIntervalMs) : undefined;
  const maxAt = j.maxIntervalMs ? new Date(lastMs + j.maxIntervalMs) : undefined;
  if (minAt && chosen.at < minAt) chosen = { at: minAt, src: "clamped-min" };
  if (maxAt && chosen.at > maxAt) chosen = { at: maxAt, src: "clamped-max" };

  if (j.pausedUntil && j.pausedUntil > now) return { nextRunAt: j.pausedUntil, source: "paused" };

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

### 7.2 Planning policy for the CPU/Discord use-case
- **Metrics**: a CPU timeline (40%, then 90% for 15 minutes, then 50%). CPU endpoint runs record samples in `InMemoryMetricsRepo`.
- **CPU policy**:
  - When CPU ≥ 80% (entering “high”), propose 30s interval (and optionally a one-shot in 5s at spike start).
  - When recovered (e.g., `< 65%` for ≥5 consecutive minutes), relax to 3m.
  - Use `maybeProposeInterval` to avoid re-writing the same interval when unchanged.
- **Discord policy**:
  - One-shot alert when high **and** cooldown expired **and** endpoint is currently paused.
  - Immediately re-pause for a **short window** (e.g., 15s) to prevent chatter.
  - Start a **10-minute cooldown**.
  - On recovery, push to far-future pause.

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
# or
npm run sim
```

Expected behaviors:
- Many `ai-interval` entries for CPU between ~00:05–00:20.
- Few Discord runs (one per cooldown window), mostly `ai-oneshot` with brief `clamped-min` entries.
- Snapshots show `discordPaused=true` except near alert.

---

## 16) Glossary

- **Baseline cadence**: The default schedule (cron or interval) when no AI hints apply.
- **AI interval hint**: Temporary “run every N” until expiry; computed relative to `lastRunAt`.
- **AI one-shot**: A single target time for the next run.
- **Nudge**: Immediate move of `nextRunAt` earlier to make hints take effect right away.
- **Clamp**: Enforced min/max spacing around runs.
- **Pause**: Hard gate that suppresses runs until a specified time.
- **Cooldown**: Post-alert quiet period for notification endpoints.
