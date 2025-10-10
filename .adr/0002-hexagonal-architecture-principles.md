# Hexagonal Architecture Principles and YAGNI Enforcement

**Date:** 2025-10-10  
**Status:** Accepted

## Context

After establishing clean domain boundaries (ADR-0001), we evaluated recommendations from an external agent for additional architectural patterns: Logger ports, Metrics, Tracer, UnitOfWork, RateLimiter, IScheduler interface, contract test suites, error taxonomy, and config systems.

**Question**: Which patterns should we adopt NOW vs defer until proven necessary?

**Core Tension**: 
- **Future-proofing**: Add abstractions early to avoid refactoring later
- **YAGNI**: Don't build infrastructure until the third real use case

**Current State**:
- Hexagonal architecture with ports & adapters established
- Scheduler as service layer (orchestrates domain workflow)
- Use-case-centric ports (not CRUD repos)
- Clean separation: Domain (pure) ↔ Ports (interfaces) ↔ Adapters (IO)
- Single scheduler implementation, single adapter set (in-memory)

## Decision

**Adopt strict YAGNI enforcement with clear criteria for when to add abstractions.**

### Architectural Standards (Effective Immediately)

#### 1. Dependency Injection via Explicit Interfaces

**Pattern**: All dependencies injected through explicit interface types.

```typescript
// ✅ Correct: Explicit deps interface
export interface SchedulerDeps {
  clock: Clock;
  cron: Cron;
  dispatcher: Dispatcher;
  jobs: JobsRepo;
  runs: RunsRepo;
}

class Scheduler {
  constructor(private readonly deps: SchedulerDeps) {}
}
```

**Rationale**: Clear contract, easy to type in tests, composition root knows what to wire.

**Files**: `packages/scheduler/src/deps.ts` (or `domain/deps.ts` for domain services)

---

#### 2. Adapters Must Use `implements` Keyword

**Pattern**: All adapters explicitly implement their port interfaces.

```typescript
// ✅ Correct: Compile-time contract verification
export class InMemoryJobsRepo implements JobsRepo {
  async claimDueEndpoints(limit: number, withinMs: number) { /* ... */ }
  async getEndpoint(id: string) { /* ... */ }
  // TypeScript ensures all port methods implemented
}
```

**Rationale**: 
- Compile-time verification of port contracts
- Better IDE autocomplete/navigation
- Self-documenting code (clear which port this implements)
- Catches breaking changes when ports evolve

**Applies to**: All adapter classes in `packages/*/src/adapters/`

---

#### 3. Port Methods Reflect Business Intent (Not CRUD)

**Pattern**: Port methods named after domain operations, not database actions.

```typescript
// ✅ Good: Business-centric
type JobsRepo = {
  claimDueEndpoints(limit: number, withinMs: number): Promise<string[]>;
  writeAIHint(id: string, hint: {...}): Promise<void>;
  updateAfterRun(id: string, patch: {...}): Promise<void>;
};

// ❌ Avoid: CRUD-centric (leaks implementation)
type JobsRepo = {
  findAll(): Promise<Job[]>;
  save(job: Job): Promise<void>;
  delete(id: string): Promise<void>;
};
```

**Rationale**: 
- Hides implementation complexity
- Clear domain intent
- Easy to swap adapters (memory, SQL, Redis)
- Forces thinking about use cases, not tables

---

#### 4. No Service Layer Until Multiple Consumers

**Pattern**: Scheduler IS the service layer. Don't add intermediate service classes unless needed.

**Add a service layer when:**
- ✅ Multiple consumers need same orchestration (API + worker + CLI)
- ✅ Complex multi-aggregate transactions
- ✅ Shared validation/authorization logic

**Current state**: Single consumer (scheduler worker) → No extra service layer needed

**Example of when we'd add one**:
```typescript
// When we build HTTP API for manual triggers:
class JobManagementService {
  constructor(
    private jobs: JobsRepo,
    private auth: AuthService,
    private audit: AuditLog,
  ) {}
  
  async triggerJobNow(userId: string, jobId: string) {
    await this.auth.requirePermission(userId, "trigger-jobs");
    await this.jobs.setNextRunAtIfEarlier(jobId, new Date());
    await this.audit.log("job-triggered", { userId, jobId });
  }
}
```

**See**: `docs/architecture-repos-vs-services.md` for full comparison

---

### Deferred Patterns (YAGNI Enforcement)

The following patterns are **architecturally sound** but deferred until proven necessary:

#### ❌ Deferred: Cross-Cutting Concern Ports

**Patterns evaluated**:
- `Logger` port (info/warn/error with structured fields)
- `Metrics` port (counter, histogram, gauge)
- `Tracer` port (startSpan/finish for APM)
- `UnitOfWork` port (multi-repo transactions)
- `RateLimiter` port (per-tenant concurrency limits)

**Decision**: Defer all until we have concrete need.

**Add when:**
- **Logger**: Building worker/API and want structured logs (not just console.log)
- **Metrics**: Deploying to production with monitoring system
- **Tracer**: Adding APM/observability tooling
- **UnitOfWork**: Operations span multiple aggregates (cross-repo transactions)
- **RateLimiter**: Per-tenant concurrency or rate limiting requirements

**Rationale**: 
- We don't have monitoring infrastructure yet
- console.log sufficient for development/scenarios
- No multi-repo transactions currently
- Adding ports without implementations is YAGNI

**Example of when Logger becomes valuable**:
```typescript
// When we deploy worker:
const scheduler = new Scheduler({
  ...deps,
  logger: new StructuredLogger({ service: "scheduler", level: "info" }),
});

// vs current (fine for dev):
console.log("[scheduler] tick complete");
```

---

#### ❌ Deferred: IScheduler Interface

**Pattern**: Interface for Scheduler class to enable substitution.

```typescript
// Evaluated but deferred:
export interface IScheduler {
  tick(batchSize: number, lockTtlMs: number): Promise<void>;
}

export class Scheduler implements IScheduler { /* ... */ }
```

**Decision**: Defer until we have multiple scheduler implementations.

**Add when:**
- Second scheduler variant needed (e.g., `CachedScheduler`, `BatchScheduler`)
- Testing requires different scheduler behavior (current: just mock the class)

**Rationale**: Single implementation. Tests already mock `Scheduler` class directly. Interface would be YAGNI.

---

#### ⏭️ Next Step: Contract Test Suite

**Pattern**: Reusable test suites that verify adapter contracts.

```typescript
// packages/domain/tests/contracts/jobs-repo.contract.ts
export function testJobsRepoContract(createRepo: () => JobsRepo) {
  test("claimDueEndpoints returns only due jobs", async () => {
    const repo = createRepo();
    // ... test the contract
  });
  
  test("claimDueEndpoints respects pausedUntil", async () => { /* ... */ });
  test("claimDueEndpoints respects locking", async () => { /* ... */ });
}

// Apply to all implementations
testJobsRepoContract(() => new InMemoryJobsRepo(clock));
testJobsRepoContract(() => new DrizzleJobsRepo(db)); // Future
```

**Decision**: HIGH VALUE, but defer to separate task (after current cleanup).

**Add when**: Before building SQL/Drizzle adapter (next major milestone).

**Rationale**: 
- Catches "works in memory but breaks in SQL" bugs
- Validates all adapters meet port contracts
- Not blocking current work

**Estimated effort**: 2-3 hours to create contract suites for `JobsRepo`, `RunsRepo`, `Dispatcher`.

---

#### ⏰ Deferred: Error Taxonomy

**Pattern**: Domain-specific error classes for structured error handling.

```typescript
// Evaluated but deferred:
export class NotFoundError extends Error { /* ... */ }
export class InvalidStateError extends Error { /* ... */ }
export class CronParseError extends Error { /* ... */ }
```

**Decision**: Defer until building API layer with user-facing error responses.

**Add when**: HTTP API needs to map errors to status codes (404, 400, 500).

**Rationale**: 
- Current consumers (scenarios, tests) use generic errors
- `packages/domain/src/errors/index.ts` exists but empty (placeholder)
- No error handling/retry logic yet

---

#### ⏰ Deferred: Config System

**Pattern**: Zod-validated config objects for environment variables.

**Decision**: Defer until building worker/API apps (composition roots need config).

**Add when**: Deploying to production with environment-specific settings.

---

#### ⏰ Deferred: Concurrency Control

**Pattern**: Semaphores, worker pools, parallelism.

**Decision**: Defer until proven bottleneck. Serial execution is fine for MVP.

**Add when**: Profiling shows concurrency would improve throughput.

---

#### ⏰ Deferred: Lint Enforcement

**Pattern**: `no-restricted-imports` to prevent architectural violations.

**Decision**: Defer until team grows beyond 1-2 people.

**Rationale**: TypeScript prevents most violations. Manual code review sufficient for small team.

---

## Consequences

### Positive

✅ **YAGNI enforced**: Only build abstractions when proven necessary  
✅ **Clear criteria**: Documented triggers for when to add each pattern  
✅ **Reduced complexity**: Fewer abstractions to maintain  
✅ **Faster development**: No premature optimization  
✅ **Standards established**: `SchedulerDeps` + `implements` pattern for all future code  
✅ **Validation**: All current code passes tests (10 domain + 5 AI SDK + 467 simulator)

### Trade-offs

⚠️ **Potential refactoring**: May need to retrofit Logger/Metrics when deploying  
- **Mitigation**: Clear criteria for when to add (production deployment trigger)
- **Benefit**: Avoid building monitoring we don't use

⚠️ **Missing contract tests**: Won't catch adapter bugs until SQL implementation  
- **Mitigation**: High-priority next step (before SQL adapter)
- **Benefit**: Focus on domain correctness first

### Negative

None identified. YAGNI is a core principle (`core-principles.instructions.md`).

## Implementation Checklist

**Completed Today (2025-10-10)**:
- ✅ Created `SchedulerDeps` interface (`packages/scheduler/src/deps.ts`)
- ✅ Added `implements JobsRepo` to `InMemoryJobsRepo`
- ✅ Improved `claimDueEndpoints` documentation with guarantees
- ✅ All tests pass (no behavior changes)

**Next Steps** (separate tasks):
- [ ] Contract test suite for `JobsRepo`, `RunsRepo`, `Dispatcher` (before SQL adapter)
- [ ] Logger port (when building worker/API apps)
- [ ] Error taxonomy (when building HTTP API)
- [ ] Config system (when deploying to production)

**Never** (or when third use case proven):
- IScheduler interface (single implementation)
- Metrics/Tracer ports (no monitoring yet)
- UnitOfWork (no multi-repo transactions)
- RateLimiter (no rate limiting needs)
- Concurrency control (no proven bottleneck)
- Lint enforcement (small team)

## References

- **Previous ADR**: ADR-0001 (domain boundary enforcement)
- **Pattern validation**: `docs/architecture-repos-vs-services.md`
- **Living guide**: `docs/domain-architecture-explained.md`
- **Core principles**: `.github/instructions/core-principles.instructions.md`
- **YAGNI**: "Don't build options until the third real use"

## Revision History

- **2025-10-10**: Initial version (covers all deferred patterns from external review)
