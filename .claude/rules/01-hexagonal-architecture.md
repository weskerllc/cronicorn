---
applyTo: '**'
---

# Hexagonal Architecture (Ports & Adapters)

**Goal:** A crisp map of *what goes where* so new features land cleanly. Uses a layered/hexagonal design: **Domain (pure)** ←→ **Ports** ←→ **Adapters (IO)**, all wired in **Composition Roots** (sim, worker, API).

---

## Mental Model

```
+--------------------+   composition root wires concrete deps
|  Composition Root  |   (sim / worker / api)
+--------------------+
        │ injects
        ▼
+--------------------+        pure logic (no IO, no SDKs)
|       Domain       |  ──►   (entities, policies, scheduler, governor)
+--------------------+
        ▲  ▲
  ports │  │ ports
        │  │
+-------+  +-------+   adapters implement ports using libraries/services
|     Adapters     |   (db, cron lib, ai sdk, http, logging)
+------------------+
```

**Rules of Thumb:**
- Domain never imports infrastructure libs (cron, db, SDKs)
- All IO goes through **ports**; adapters supply implementations
- Time is injected (`Clock`); no `Date.now()` in domain
- Keep "policy math" pure and unit-testable

---

## Workspace Directory Layout

This monorepo maps the hexagonal architecture to specific locations:

### Domain & Services
- **`packages/domain/**`** - Pure core logic (entities, policies, governor, scheduler)
  - `packages/domain/src/ports/` - Port interfaces (Clock, Cron, Dispatcher, JobsRepo, RunsRepo)
  - No infrastructure imports allowed here
- **`packages/services/**`** - Business logic orchestration (managers)
  - Coordinates multiple repositories
  - Enforces business rules (quotas, permissions)

### Adapters
- **`packages/adapter-drizzle/**`** - PostgreSQL repository implementation
- **`packages/adapter-http/**`** - HTTP dispatcher
- **`packages/adapter-cron/**`** - Cron expression parsing
- **`packages/adapter-pino/**`** - Structured logging
- **`packages/adapter-ai/**`** - OpenAI API client
- **`packages/adapter-stripe/**`** - Payment processing
- **`packages/adapter-system-clock/**`** - Time abstraction

### Composition Roots
- **`apps/api/src/index.ts`** - HTTP API server (wires adapters for API routes)
- **`apps/scheduler-app/src/index.ts`** - Background worker (wires real adapters)
- **`apps/ai-planner-app/src/index.ts`** - AI optimization engine

---

## Ports (Boundary Contracts)

Keep them **small** and **intent-driven**. Located in `packages/domain/src/ports/`.

```ts
// domain/ports.ts
export interface Clock { now(): Date; sleep(ms: number): Promise<void>; }
export interface Cron  { next(cron: string, from: Date): Date; }

export interface Dispatcher {
  execute(ep: JobEndpoint): Promise<{ status: "success" | "failure"; durationMs: number; errorMessage?: string }>;
}

export interface RunsRepo {
  createRun(epId: string, startedAt: Date): Promise<{ runId: string }>;
  finishRun(runId: string, data: {
    finishedAt: Date;
    status: "success" | "failure" | "cancelled" | "timeout";
    durationMs: number;
    errorMessage?: string;
  }): Promise<void>;
}

export interface JobsRepo {
  add(ep: Partial<JobEndpoint> & { id: string; name: string; nextRunAt: Date }): Promise<void>;
  getEndpoint(id: string): Promise<JobEndpoint>;
  claimDueEndpoints(limit: number, withinMs: number): Promise<string[]>;

  // Scheduling state updates
  updateAfterRun(id: string, update: {
    lastRunAt: Date;
    nextRunAt: Date;
    status: { status: "success" | "failure"; durationMs: number };
    failureCountPolicy: "increment" | "reset";
    clearExpiredHints?: boolean;
  }): Promise<void>;

  // AI steering (hints + nudges + pause)
  writeAIHint(id: string, hint: { intervalMs?: number; nextRunAt?: Date; expiresAt: Date; reason?: string }): Promise<void>;
  setNextRunAtIfEarlier(id: string, when: Date): Promise<void>;
  setPausedUntil(id: string, until: Date | null): Promise<void>;
}
```

**Entities (excerpt):**

```ts
export interface JobEndpoint {
  id: string; jobId: string; tenantId: string; name: string;

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

---

## Domain: Policies & Algorithms (Pure)

### Governor (pick next run)
- Inputs: `(now, endpoint, cron)`
- Candidates:
  - **Baseline**: cron → `Cron.next()`, else `lastRunAt + baselineIntervalMs`
  - **AI Interval**: `lastRunAt + aiHintIntervalMs` (only if hint not expired)
  - **AI One-shot**: `aiHintNextRunAt` (only if hint not expired)
- Choose earliest **future** candidate
- Clamp to **[lastRunAt+min, lastRunAt+max]**
- If `pausedUntil > now` → return that with source `"paused"`

Outputs `{ nextRunAt, source }` (`"baseline-*" | "ai-interval" | "ai-oneshot" | "clamped-*" | "paused"`).

### Scheduler (tick)
```
claimDue → for each id:
  ep = getEndpoint(id)
  {runId} = runs.createRun(ep.id, now)
  result = dispatcher.execute(ep)  // external action
  runs.finishRun(runId, ...result)
  plan = governor.planNextRun(now, ep, cron)
  jobs.updateAfterRun(ep.id, { lastRunAt: now, nextRunAt: plan.nextRunAt, status, failureCountPolicy })
```

### FailureCount policy
- **On failure**: `increment`
- **On success**: `reset` to 0
(Alternative "decay" allowed but default is reset.)

---

## Tools (AI-Controlled Steering)

**Endpoint-scoped commands** exposed to the planner (SDK or rule-based):

- `propose_interval { intervalMs, ttlMinutes?, reason? }`
- `propose_next_time { nextRunAtIso? | nextRunInMs?, ttlMinutes?, reason? }`
- `pause_until { untilIso: string | null, reason? }`

**Behavior:**
- Write an AI hint (with TTL) via `writeAIHint`
- **Nudge now** via `setNextRunAtIfEarlier` so the change takes immediate effect
- Repo must respect `min/max` clamps and `pausedUntil`

Keep tools thin—no policy here, just state change.

---

## Adapters (Concrete Implementations)

- **Stores**
  - `packages/adapter-drizzle/` - Production PostgreSQL (transactions, indexes on `next_run_at`, leases for claims)
  - In-memory repos for tests (transaction-per-test pattern)
- **Cron**
  - `packages/adapter-cron/` - Wraps library-specific logic; provides `Cron.next()`
- **Dispatcher**
  - `packages/adapter-http/` - HTTP dispatcher or domain-specific executors
- **Clock**
  - `packages/adapter-system-clock/` - System time for production
  - Fake clock for deterministic tests
- **Logger/Metrics/Tracing**
  - `packages/adapter-pino/` - Structured logging
  - Keep domain log calls minimal & structured

---

## Composition Roots (Wiring)

- **`apps/scheduler-app/`** - Wires real adapters, starts the scheduling loop
- **`apps/api/`** - Exposes CRUD for jobs/endpoints and tool actions over HTTP
- **`apps/ai-planner-app/`** - AI optimization engine

**Guidelines:**
- Only roots import adapters
- Inject **all** ports (Clock, Cron, Repos, Dispatcher, Logger) into domain services
- Keep feature flags/config here; domain reads via constructor params, not env

---

## Decision Matrix: Where Does Code Go?

| You want to… | Put logic in… | Notes |
|---|---|---|
| Add a scheduling rule | **Domain (governor/policies)** in `packages/domain/` | Pure; unit tests |
| Add a tool action | **Ports + Adapter** | Tools write state; nudge |
| New endpoint type | **Dispatcher (adapter)** + **planner** | Execute in dispatcher; steer via tools |
| Switch to cron | **Cron adapter** + **governor** | Governor already supports |
| Enforce quotas | **Planner/Dispatcher wrapper** | Don't touch governor |
| Persist in DB | **Jobs/Runs repo adapter** in `packages/adapter-drizzle/` | Leases, indexes |
| Use OpenAI SDK | **Planner adapter** in `packages/adapter-ai/` | Domain only sees tools |
| Observability | **Logger/Metrics adapters** | No SDKs in domain |

**Rule**: **IO/library ⇒ Adapter/Root**. **Scheduling/policy ⇒ Domain**.

---

## Testing Strategy

- **Unit**: governor, nudging, pause, hint expiry, failureCount
- **Contract**: adapters meet port semantics (nudge clamps, claim leases)
- **Component**: scheduler + in-memory repos + fake dispatcher
- **Scenario sims (few)**: end-to-end policy interactions over time

Prefer assertions on **sources & counts** over exact timestamps.

---

## Ops Notes

- **Leases** for `claimDueEndpoints` (avoid double run in distributed workers)
- **Idempotency** via run IDs; dispatcher should tolerate retries
- **Backoff/Jitter** (±3s) in adapters/roots to prevent herds
- **Multitenancy**: always carry `tenantId`; apply per-tenant quotas
- **Graceful shutdown**: stop claiming, finish inflight, persist
- **Migrations/Versioning**: evolve schema; keep ports stable

---

## Defaults (Canonical)

- FailureCount: reset on success, increment on failure
- AI hints: have TTL; ignored after expiry; cleared post-run
- Pause wins; `pause_until(null)` resumes
- Governor clamps relative to **`lastRunAt`** (not `now`)

**If in doubt:** *Does it need IO?* → Adapter/Root. *Just policy/math?* → Domain.

---

## Reference

See **ADR-0002** (`.adr/0002-hexagonal-architecture-principles.md`) for the full architectural decision and rationale.
