# Architecture: Repos vs Services - Are We Following the Correct Pattern?

## TL;DR

**Yes, we're following the correct pattern.** We're using **Hexagonal Architecture (Ports & Adapters)**, not traditional N-tier. Our "repos" are actually **ports** (interfaces) that define use-case-specific operations, not generic CRUD repositories.

---

## Traditional Backend Architecture (N-Tier)

### Typical Structure
```
┌─────────────────────────────────┐
│   Controllers (HTTP/API Layer)  │  ← Handle requests/responses
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Services (Business Logic)     │  ← Orchestrate workflows, validation
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Repositories (Data Access)    │  ← CRUD operations
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Database                      │
└─────────────────────────────────┘
```

### Traditional Repository Pattern
```typescript
// Generic CRUD operations
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Service orchestrates business logic
class UserService {
  constructor(private userRepo: UserRepository) {}
  
  async registerUser(email: string, password: string): Promise<User> {
    // Business logic here
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error("Email taken");
    
    const user = new User(email, hashPassword(password));
    await this.userRepo.save(user);
    return user;
  }
}
```

**Characteristics:**
- **Data-centric**: Repos are thin wrappers around database
- **Generic**: CRUD methods work for any use case
- **Service layer**: Contains all business logic
- **Transaction management**: Usually in service layer

---

## Our Architecture (Hexagonal/Ports & Adapters)

### Our Structure
```
┌─────────────────────────────────┐
│   Scheduler (Orchestration)     │  ← Domain service (business logic)
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Ports (Interfaces)            │  ← Use-case-specific contracts
│   - JobsRepo                    │
│   - RunsRepo                    │
│   - Dispatcher                  │
│   - Clock, Cron                 │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Adapters (Implementations)    │  ← Concrete infrastructure
│   - InMemoryJobsRepo            │
│   - SqlJobsRepo (future)        │
│   - HttpDispatcher (future)     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   Infrastructure (DB/HTTP/etc)  │
└─────────────────────────────────┘
```

### Our "Repository" Pattern (Actually Ports)
```typescript
// Use-case-specific operations
export type JobsRepo = {
  // Not just "findById" - business intent is clear
  getEndpoint: (id: string) => Promise<JobEndpoint>;
  
  // Encapsulates complex claiming logic
  claimDueEndpoints: (limit: number, withinMs: number) => Promise<string[]>;
  
  // Domain operation, not just "save"
  updateAfterRun: (id: string, patch: {
    lastRunAt: Date;
    nextRunAt: Date;
    status: ExecutionResult;
    failureCountPolicy: "increment" | "reset";
    clearExpiredHints: boolean;
  }) => Promise<void>;
  
  // Business-specific operations
  writeAIHint: (id: string, hint: {...}) => Promise<void>;
  setPausedUntil: (id: string, until: Date | null) => Promise<void>;
  setNextRunAtIfEarlier: (id: string, when: Date) => Promise<void>;
};
```

**Characteristics:**
- **Use-case-centric**: Methods reflect domain operations
- **Business intent**: Method names reveal what the domain needs
- **Abstraction**: Hides implementation complexity
- **Swappable**: Memory, SQL, Redis - all implement same port

---

## Key Differences

| Aspect | Traditional Repo | Our Ports |
|--------|-----------------|-----------|
| **Purpose** | Abstract database CRUD | Abstract domain operations |
| **Methods** | `save()`, `find()`, `delete()` | `claimDueEndpoints()`, `writeAIHint()` |
| **Logic** | None (just data access) | Can encapsulate coordination logic |
| **Naming** | Entity-based (`UserRepo`) | Domain-based (`JobsRepo`) |
| **Service Layer** | Required (contains all logic) | Optional (Scheduler is the service) |
| **Testability** | Mock repo, test service | Mock ports, test scheduler |

---

## Is Our Pattern Correct?

### ✅ **YES - We're Following Hexagonal Architecture Correctly**

**Why this works:**

1. **Scheduler IS the service layer**
   - It orchestrates the scheduling workflow
   - Contains business logic (planning, execution coordination)
   - Depends on ports, not concrete implementations

2. **Ports define boundaries**
   - `JobsRepo`, `RunsRepo` are **ports**, not traditional repos
   - They specify what the domain needs, not how it's stored
   - Adapters implement these ports differently (memory, SQL, Redis)

3. **Domain logic stays pure**
   - `planNextRun()` is pure function (no IO)
   - Scheduler orchestrates but doesn't do IO directly
   - All IO happens through ports

4. **Clear dependencies**
   ```typescript
   // Scheduler depends on interfaces, not implementations
   constructor(
     private deps: { 
       clock: Clock;         // Port
       jobs: JobsRepo;       // Port
       runs: RunsRepo;       // Port
       dispatcher: Dispatcher; // Port
       cron: Cron;          // Port
     }
   ) {}
   ```

5. **Testability**
   ```typescript
   // Easy to test with fakes
   const scheduler = new Scheduler({
     clock: new FakeClock(),
     jobs: new InMemoryJobsRepo(),
     runs: new InMemoryRunsRepo(),
     dispatcher: new FakeDispatcher(),
     cron: new CronParser(),
   });
   ```

---

## Common Objections & Responses

### 🤔 "But `claimDueEndpoints()` does business logic - shouldn't that be in a service?"

**Response**: This is a **port method**. The Scheduler (service) decides *when* to claim. The port defines *how* to claim (filtered by time, limit, locking). Implementation details vary:

- **Memory adapter**: Filter in-memory array, set locks
- **SQL adapter**: Use `SELECT FOR UPDATE SKIP LOCKED` (database-level locking)
- **Redis adapter**: Use Redlock pattern with TTL

The port abstracts the claiming strategy so domain doesn't care.

### 🤔 "Shouldn't we split `JobsRepo` into multiple services?"

**Possible, but not necessary:**
```typescript
// Could do this (more granular)
type JobsStore = { getEndpoint, updateAfterRun };
type JobsClaimer = { claimDueEndpoints };
type HintsManager = { writeAIHint, setNextRunAtIfEarlier };
type PauseController = { setPausedUntil };

// But current approach is fine
type JobsRepo = { ...all operations };
```

**Why we don't split yet**:
- All operations relate to the same aggregate (`JobEndpoint`)
- Splitting creates more dependencies to inject
- Current port is ~50 lines - not overwhelming
- **YAGNI**: Split when it becomes painful, not preemptively

### 🤔 "Why not use a traditional `save(job)` method?"

**Response**: We could, but it would push coordination logic into Scheduler:

```typescript
// ❌ Traditional approach (verbose domain)
async tick() {
  const allJobs = await this.jobs.findAll();
  const now = this.clock.now();
  const due = allJobs.filter(j => 
    j.nextRunAt <= now 
    && (!j.pausedUntil || j.pausedUntil <= now)
    && (!j._lockedUntil || j._lockedUntil <= now)
  );
  
  for (const job of due.slice(0, 10)) {
    job._lockedUntil = new Date(now.getTime() + 5000);
    await this.jobs.save(job);
  }
}

// ✅ Port approach (concise domain)
async tick() {
  const ids = await this.jobs.claimDueEndpoints(10, 5000);
  // Focus on orchestration
}
```

The port encapsulates the claim logic, keeping Scheduler focused on workflow.

---

## When Would We Need a Service Layer?

**Add a service layer if:**
- ✅ Scheduler needs to coordinate multiple complex workflows
- ✅ Multiple consumers need same business logic (API + worker + CLI)
- ✅ Complex validation/authorization logic
- ✅ Transactions span multiple aggregates

**We don't need it now because:**
- Scheduler has one responsibility (run jobs on schedule)
- No other consumers yet
- Simple validation (domain rules in `planNextRun`)
- Transactions are single-aggregate (one job at a time)

**Example of when we'd need it:**
```typescript
// If we added an API for manual job triggers
class JobManagementService {
  constructor(
    private jobs: JobsRepo,
    private auth: AuthService,
    private audit: AuditLog,
  ) {}
  
  async triggerJobNow(userId: string, jobId: string) {
    // Multi-concern coordination
    await this.auth.requirePermission(userId, "trigger-jobs");
    const job = await this.jobs.getEndpoint(jobId);
    await this.jobs.setNextRunAtIfEarlier(jobId, new Date());
    await this.audit.log("job-triggered", { userId, jobId });
  }
}
```

**Then we'd have:**
- Scheduler (automated workflow)
- JobManagementService (user-initiated actions)
- Both use same ports

---

## Naming: Should We Call Them "Repos"?

**Current**: `JobsRepo`, `RunsRepo`

**Alternatives**:
- `JobsPort` (more accurate)
- `JobSchedulingPort` (very explicit)
- `JobsStore` (neutral)
- Keep `Repo` (understood in context)

**Recommendation**: **Keep `JobsRepo` for now**

**Why:**
- Team understands "repo" (familiar pattern)
- Clear from context these are ports (defined in `ports/` directory)
- Renaming is easy later if needed
- The pattern is correct regardless of name

---

## Comparison: Traditional vs Hexagonal

### Traditional N-Tier (e.g., Express API)
```typescript
// ✅ Good for: CRUD APIs, standard business apps
@Controller()
class JobsController {
  constructor(private jobsService: JobsService) {}
  
  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }
}

class JobsService {
  constructor(private jobsRepo: JobsRepository) {}
  
  async getJob(id: string): Promise<Job> {
    const job = await this.jobsRepo.findById(id);
    if (!job) throw new NotFoundException();
    return job;
  }
}

class JobsRepository {
  async findById(id: string): Promise<Job | null> {
    return this.db.query('SELECT * FROM jobs WHERE id = ?', [id]);
  }
}
```

### Hexagonal (Our Scheduler)
```typescript
// ✅ Good for: Domain-rich apps, complex workflows
class Scheduler {
  constructor(private deps: { 
    jobs: JobsRepo; // Port
    runs: RunsRepo; // Port
  }) {}
  
  async tick() {
    const ids = await this.deps.jobs.claimDueEndpoints(10, 5000);
    for (const id of ids) await this.handleEndpoint(id);
  }
}

// Port (interface) - defines what domain needs
type JobsRepo = {
  claimDueEndpoints: (limit: number, withinMs: number) => Promise<string[]>;
};

// Adapter - implements port
class InMemoryJobsRepo implements JobsRepo {
  async claimDueEndpoints(limit: number, withinMs: number) {
    // Implementation details hidden
  }
}
```

---

## Conclusion

### Our Pattern is Correct ✅

We're using **Hexagonal Architecture (Ports & Adapters)**, which is the right choice for a domain-rich scheduling system.

**Key Takeaways:**
1. **Scheduler = Service layer** (orchestrates domain workflow)
2. **"Repos" = Ports** (use-case-specific interfaces)
3. **Adapters = Implementations** (memory, SQL, Redis)
4. **No extra service layer needed** (Scheduler already provides orchestration)
5. **Domain logic is pure** (`planNextRun` has no IO)

**When to revisit:**
- If we add an HTTP API (might need `JobManagementService`)
- If port interfaces grow beyond ~100 lines (consider splitting)
- If multiple consumers need same orchestration (extract shared service)

**For now**: Keep the current pattern. It's clean, testable, and follows hexagonal architecture principles correctly. 🎯
