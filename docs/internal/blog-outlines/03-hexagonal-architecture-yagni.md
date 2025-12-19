# Blog Post Outline: Hexagonal Architecture with YAGNI

**Title**: "Clean Architecture in TypeScript: Only Add Ports When You Need Them"

**Target Word Count**: 2500-3000 words

**SEO Keywords**: hexagonal architecture TypeScript, clean architecture, ports and adapters, domain-driven design, YAGNI principle

---

## I. Introduction (300 words)

### The Problem with Architecture Tutorials

Most clean architecture tutorials show you:

```typescript
// 50 interfaces, day 1
interface Logger { info(), warn(), error() }
interface Metrics { counter(), gauge(), histogram() }
interface Tracer { startSpan(), finish() }
interface Cache { get(), set(), delete() }
interface Queue { publish(), subscribe() }
interface EventBus { emit(), on() }
interface RateLimiter { check(), reset() }
// ... 43 more
```

**Then you wonder**:
- Do I need all of these NOW?
- Which ones are actually useful?
- When do I add each one?

### The YAGNI Tension

**Two camps**:
1. **"Abstract everything early"** → Avoid refactoring later
2. **"Only add what you use"** → Don't build what you don't need

**Both are right** (for different situations).

### This Post's Approach

**Show you WHEN to add each abstraction**, using a real production system (Cronicorn's scheduler) as proof.

**You'll learn**:
- Which ports/adapters to add on day 1
- Which to defer until proven necessary
- Clear criteria for "when to add X"
- How to enforce boundaries without over-engineering

---

## II. The Foundation: What IS Hexagonal Architecture? (400 words)

### The Core Idea

**Separate business logic from infrastructure.**

```
+------------------------+
|   Domain (pure logic)  |   No imports of:
|   - Entities           |   - Database libs
|   - Business rules     |   - HTTP libs
|   - Use cases          |   - AI SDKs
+------------------------+   - Time (Date.now())
         ↑    ↑
    ports│    │ports (interfaces)
         │    │
+--------+----+--------+
|    Adapters (IO)     |   Concrete implementations:
|  - PostgreSQL        |   - Drizzle for DB
|  - HTTP dispatcher   |   - fetch() for HTTP
|  - OpenAI SDK        |   - OpenAI lib
|  - System clock      |   - Date.now()
+----------------------+
```

### Example: Time

**❌ Without port** (domain depends on infrastructure):
```typescript
// domain/scheduler.ts
export class Scheduler {
  async tick() {
    const now = new Date(); // ❌ Hard dependency on system time
    const due = await this.jobs.getDue(now);
    // ...
  }
}

// Can't test with fake time!
```

**✅ With port** (domain depends on abstraction):
```typescript
// domain/ports.ts
export interface Clock {
  now(): Date;
}

// domain/scheduler.ts
export class Scheduler {
  constructor(private clock: Clock) {}
  
  async tick() {
    const now = this.clock.now(); // ✅ Injected dependency
    const due = await this.jobs.getDue(now);
    // ...
  }
}

// Tests use FakeClock, prod uses SystemClock
```

### The Three Layers

**1. Domain (pure)**
```typescript
// Only business logic
export function planNextRun(
  now: Date,
  endpoint: JobEndpoint,
  cron: Cron
): NextRunPlan {
  // Pure function - no IO
  const candidates: Date[] = [];
  
  if (endpoint.baselineCron) {
    candidates.push(cron.next(endpoint.baselineCron, now));
  }
  
  if (endpoint.aiHintIntervalMs) {
    candidates.push(new Date(now.getTime() + endpoint.aiHintIntervalMs));
  }
  
  return {
    nextRunAt: earliest(candidates),
    source: determineSource(candidates)
  };
}
```

**2. Ports (contracts)**
```typescript
// Interfaces the domain needs
export interface JobsRepo {
  claimDueEndpoints(limit: number): Promise<string[]>;
  updateAfterRun(id: string, data: UpdateData): Promise<void>;
}

export interface Cron {
  next(expression: string, from: Date): Date;
}
```

**3. Adapters (implementations)**
```typescript
// Concrete implementation of port
export class DrizzleJobsRepo implements JobsRepo {
  constructor(private db: Database) {}
  
  async claimDueEndpoints(limit: number): Promise<string[]> {
    // Real database queries using Drizzle
    return this.db
      .select({ id: jobEndpoints.id })
      .from(jobEndpoints)
      .where(lte(jobEndpoints.nextRunAt, new Date()))
      .limit(limit);
  }
}
```

---

## III. Day 1: Mandatory Ports (500 words)

### These Ports You Actually Need Immediately

**Why these?** Because you can't write tests without them.

#### 1. External Dependencies

**Clock** (time):
```typescript
export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}

// Test with FakeClock
// Prod with SystemClock
```

**Why mandatory**: Schedulers depend on time. Can't test time-based logic without controlling time.

**Cron** (expression parsing):
```typescript
export interface Cron {
  next(expression: string, from: Date): Date;
}

// Test with FakeCron (returns predictable values)
// Prod with CronsomeCron (real library)
```

**Why mandatory**: Third-party cron libraries have bugs. Need to test your logic independently.

#### 2. Core Business Operations

**JobsRepo** (scheduling state):
```typescript
export interface JobsRepo {
  claimDueEndpoints(limit: number, withinMs: number): Promise<string[]>;
  getEndpoint(id: string): Promise<JobEndpoint>;
  updateAfterRun(id: string, update: UpdateData): Promise<void>;
  writeAIHint(id: string, hint: AIHint): Promise<void>;
}
```

**Why mandatory**: 
- Test with in-memory version (fast, deterministic)
- Prod with database version (persistent)
- Can't test business logic without data storage

**RunsRepo** (execution history):
```typescript
export interface RunsRepo {
  createRun(endpointId: string, startedAt: Date): Promise<{ runId: string }>;
  finishRun(runId: string, data: FinishData): Promise<void>;
  getHealthSummary(endpointId: string, since: Date): Promise<HealthSummary>;
}
```

**Why mandatory**: Audit trail for every execution. Need this from day 1.

**Dispatcher** (external actions):
```typescript
export interface Dispatcher {
  execute(endpoint: JobEndpoint): Promise<{
    status: "success" | "failure";
    durationMs: number;
    errorMessage?: string;
  }>;
}
```

**Why mandatory**:
- Test with FakeDispatcher (controlled responses)
- Prod with HttpDispatcher (real HTTP calls)
- Can't test error handling without fake failures

### Dependency Injection Pattern

**DON'T do constructor proliferation**:
```typescript
// ❌ Bad: 8 constructor params
class Scheduler {
  constructor(
    clock: Clock,
    cron: Cron,
    jobs: JobsRepo,
    runs: RunsRepo,
    dispatcher: Dispatcher,
    logger: Logger,
    metrics: Metrics,
    tracer: Tracer
  ) {}
}
```

**DO use deps interface**:
```typescript
// ✅ Good: Single deps object
export interface SchedulerDeps {
  clock: Clock;
  cron: Cron;
  jobs: JobsRepo;
  runs: RunsRepo;
  dispatcher: Dispatcher;
}

class Scheduler {
  constructor(private readonly deps: SchedulerDeps) {}
  
  async tick() {
    const now = this.deps.clock.now();
    const due = await this.deps.jobs.claimDueEndpoints(10, 60000);
    // ...
  }
}
```

**Benefits**:
- Clear contract (all dependencies visible)
- Easy to extend (add to interface)
- Easy to test (mock deps object)

---

## IV. YAGNI: Deferred Patterns (800 words)

### The Patterns We DIDN'T Add (And Why)

These are architecturally sound but premature for MVP:

#### ❌ Logger Port

**Pattern**:
```typescript
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}
```

**Decision**: DEFER until production deployment.

**Reasoning**:
- MVP: `console.log()` is sufficient
- Adding port without use = YAGNI violation
- Will need it when we have log aggregation (Datadog, Splunk)

**When to add**: 
✅ Deploying to production with log aggregation  
✅ Need structured logging for debugging  
✅ Want request correlation IDs  

**Current state**:
```typescript
// Temporarily use console
console.log(`[scheduler] claimed ${due.length} endpoints`);

// Future (when we add Logger port):
logger.info('scheduler_tick', { 
  endpointsClaimed: due.length,
  durationMs: elapsed 
});
```

#### ❌ Metrics Port

**Pattern**:
```typescript
export interface Metrics {
  counter(name: string, value: number, tags?: Tags): void;
  gauge(name: string, value: number, tags?: Tags): void;
  histogram(name: string, value: number, tags?: Tags): void;
}
```

**Decision**: DEFER until monitoring infrastructure exists.

**Reasoning**:
- No Prometheus/DataDog yet
- Metrics without dashboards = useless
- Port would be unused code

**When to add**:
✅ Setting up monitoring (Prometheus, Grafana)  
✅ Need SLA tracking  
✅ Want alerting on anomalies  

#### ❌ Tracer Port (APM/Observability)

**Pattern**:
```typescript
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
}

export interface Span {
  setTag(key: string, value: any): void;
  finish(): void;
}
```

**Decision**: DEFER indefinitely.

**Reasoning**:
- No APM tool selected yet
- Distributed tracing is overkill for 2 workers
- Will know when we need it (when we CAN'T debug)

**When to add**:
✅ Multiple services with complex interactions  
✅ Need distributed tracing  
✅ APM tool chosen (DataDog, New Relic)  

#### ❌ UnitOfWork Port (Transactions)

**Pattern**:
```typescript
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
```

**Decision**: DEFER until multi-aggregate operations.

**Reasoning**:
- Current operations touch one aggregate at a time
- Database handles transactions internally
- Adding UoW without multi-repo operations = premature

**When to add**:
✅ Operations span multiple aggregates (Job + Tenant + Invoice)  
✅ Need coordinated transactions  
✅ Cross-repository consistency required  

**Example of when needed**:
```typescript
// Future: Create job + charge user + log audit
await unitOfWork.execute(async (tx) => {
  const job = await jobsRepo.create(tx, data);
  await billingRepo.charge(tx, userId, amount);
  await auditRepo.log(tx, 'job-created', { jobId: job.id });
});
```

#### ❌ RateLimiter Port

**Pattern**:
```typescript
export interface RateLimiter {
  check(key: string, limit: number, window: number): Promise<boolean>;
  reset(key: string): Promise<void>;
}
```

**Decision**: DEFER until per-tenant limits needed.

**Reasoning**:
- Single-tenant MVP
- No rate limiting requirements yet
- Would add complexity without value

**When to add**:
✅ Multi-tenant with per-tenant limits  
✅ Quota enforcement needed  
✅ Abuse prevention required  

#### ❌ IScheduler Interface

**Pattern**:
```typescript
export interface IScheduler {
  tick(batchSize: number): Promise<void>;
}

export class Scheduler implements IScheduler {
  async tick(batchSize: number) { /* ... */ }
}
```

**Decision**: DEFER until second scheduler variant.

**Reasoning**:
- Single Scheduler implementation
- Tests mock the class directly (works fine)
- Interface would be unused abstraction

**When to add**:
✅ Need multiple scheduler types (CachedScheduler, PriorityScheduler)  
✅ Need to swap implementations dynamically  
✅ Third-party needs to implement scheduler interface  

---

## V. Enforcement: How to Keep Boundaries Clean (400 words)

### 1. Use `implements` Keyword

**Pattern**: All adapters MUST explicitly implement their port.

```typescript
// ✅ Correct: Compile-time verification
export class DrizzleJobsRepo implements JobsRepo {
  async claimDueEndpoints(limit: number, withinMs: number) {
    // TypeScript ensures this matches JobsRepo interface
  }
  
  async getEndpoint(id: string) {
    // TypeScript ensures this matches JobsRepo interface
  }
  
  // If port changes, TypeScript errors here
}
```

**Benefits**:
- Catches breaking changes when ports evolve
- Self-documenting (clear which port this implements)
- IDE autocomplete/navigation works perfectly
- No runtime errors from mismatched signatures

### 2. Folder Structure Enforces Boundaries

```
packages/domain/
  src/
    entities/        # Pure types
    ports/           # Interfaces
    governor/        # Business logic (uses ports, not adapters)
    
packages/adapter-drizzle/
  src/
    jobs-repo.ts     # implements JobsRepo
    runs-repo.ts     # implements RunsRepo
    
packages/adapter-http/
  src/
    dispatcher.ts    # implements Dispatcher
```

**Rule**: Domain can import ports but NEVER adapters.

### 3. TypeScript Project References

```json
// packages/domain/tsconfig.json
{
  "compilerOptions": { /* ... */ },
  "references": []  // ← No references = can't import other packages
}

// packages/adapter-drizzle/tsconfig.json
{
  "compilerOptions": { /* ... */ },
  "references": [
    { "path": "../domain" }  // ← Can import domain (ports)
  ]
}
```

**Benefit**: TypeScript prevents domain from importing adapters.

### 4. Composition Root Pattern

**All wiring happens in ONE place**:

```typescript
// apps/scheduler/src/main.ts (composition root)
import { Scheduler } from "@cronicorn/worker-scheduler";
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { CronsomeCron } from "@cronicorn/adapter-cron";
import { DrizzleJobsRepo } from "@cronicorn/adapter-drizzle";
import { HttpDispatcher } from "@cronicorn/adapter-http";

const clock = new SystemClock();
const cron = new CronsomeCron();
const db = createDatabase();
const jobs = new DrizzleJobsRepo(db);
const runs = new DrizzleRunsRepo(db);
const dispatcher = new HttpDispatcher();

const scheduler = new Scheduler({
  clock,
  cron,
  jobs,
  runs,
  dispatcher
});

// Run
await scheduler.start();
```

**Tests wire differently**:
```typescript
// packages/worker-scheduler/__tests__/scheduler.test.ts
import { Scheduler } from "../src/scheduler.js";
import { FakeClock, InMemoryJobsRepo, /* ... */ } from "@cronicorn/domain/fixtures";

const clock = new FakeClock();
const jobs = new InMemoryJobsRepo(clock);
const runs = new InMemoryRunsRepo();
const dispatcher = new FakeDispatcher();

const scheduler = new Scheduler({ clock, jobs, runs, dispatcher });
```

**Benefit**: Domain code unchanged. Only composition root differs.

---

## VI. Real-World Example: Cronicorn's Evolution (500 words)

### Phase 1: MVP (Day 1)

**Ports added**:
- Clock (for testing)
- Cron (for testing)
- JobsRepo (for testing)
- RunsRepo (for auditing)
- Dispatcher (for testing)

**Total**: 5 ports, ~200 lines of interfaces

**Tests**:
- 100% domain coverage with fakes
- Zero database required for unit tests
- Fast feedback (tests run in <1s)

### Phase 2: Production (Week 2)

**Added**:
- DrizzleJobsRepo (real database)
- DrizzleRunsRepo (real database)
- HttpDispatcher (real HTTP calls)
- SystemClock (real time)
- CronsomeCron (real cron parsing)

**Did NOT add**:
- Logger port (used console.log)
- Metrics port (no monitoring yet)
- Tracer port (no APM)

**Reasoning**: Focus on shipping, not infrastructure.

### Phase 3: Observability (Month 2)

**Finally added**:
- Logger port (when we added Pino + structured logging)
- Config port (when we had environment-specific settings)

**Still did NOT add**:
- Metrics port (no monitoring infrastructure)
- Tracer port (debugging was still simple)
- RateLimiter port (still single-tenant)

### Phase 4: Scale (Month 4)

**Added**:
- Quota enforcement (but NOT as port, just business logic)
- Multi-tenancy (still no rate limiter port)

**Still NO**:
- Metrics port (dashboards not built yet)
- Tracer port (still not needed)
- UnitOfWork port (no multi-aggregate operations)

### Lessons Learned

**What worked**:
✅ Adding ports only when needed = less code to maintain  
✅ Clear criteria ("when to add X") prevented guessing  
✅ YAGNI kept codebase simple and focused  
✅ We never regretted NOT adding a port early  

**What didn't**:
❌ Waiting too long on Logger = hard to debug production issues  
❌ Should have added Config port earlier (env vars scattered)  

**Revised criteria**:
- Add **Clock, Cron, Repos, Dispatcher** on day 1 (testing)
- Add **Logger** when deploying to production (not before)
- Add **Config** when you have 3+ environment variables
- Add **Metrics/Tracer** when you have monitoring infrastructure
- Add **UoW** when you have multi-aggregate transactions

---

## VII. Conclusion (300 words)

### Key Takeaways

**Hexagonal architecture isn't all-or-nothing.**

**Start with 5 ports**:
1. Clock (for testing time-based logic)
2. External libs (Cron, AI SDK, etc.)
3. Data storage (JobsRepo, RunsRepo)
4. External actions (Dispatcher)
5. That's it!

**Add more when**:
- Logger: Deploying to production
- Config: 3+ environment variables
- Metrics: Monitoring infrastructure exists
- Tracer: Distributed systems debugging needed
- UnitOfWork: Multi-aggregate transactions
- RateLimiter: Per-tenant quotas needed

**Don't add**:
- Interfaces for single implementations
- Abstractions without concrete use
- Infrastructure for future scale

**Enforcement**:
- Use `implements` keyword (compile-time checking)
- Folder structure (domain/ vs adapters/)
- TypeScript project references (prevent imports)
- Composition root (wire in one place)

### See It In Action

Cronicorn's complete implementation:
- Ports: [packages/domain/src/ports/](link)
- Adapters: [packages/adapter-*/](link)
- ADR: [ADR-0002](link)
- Architecture guide: [architecture.instructions.md](link)

```bash
git clone https://github.com/weskerllc/cronicorn
cd cronicorn
pnpm install
pnpm test  # See hexagonal architecture in tests
```

### Further Reading

- Transaction-per-test pattern (how we test adapters)
- Database as integration point (when NOT to use ports)
- Vertical slice architecture (organizing features)

---

## Code Snippets to Include

1. Complete port definitions
2. Adapter implementation examples
3. Dependency injection pattern
4. Composition root examples (test vs prod)
5. Evolution timeline code

## Visual Assets Needed

1. Hexagonal architecture diagram
2. When-to-add decision tree
3. Evolution timeline (phases 1-4)
4. Folder structure diagram

## Related Reading

- Domain-Driven Design (Evans)
- Clean Architecture (Martin)
- YAGNI principle
- Growing Object-Oriented Software Guided by Tests (Freeman/Pryce)
