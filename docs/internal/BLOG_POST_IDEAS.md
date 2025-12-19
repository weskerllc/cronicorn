# Technical Blog Post Ideas for Cronicorn

This document captures unique, interesting technical aspects of Cronicorn that would make compelling blog posts. Each idea is designed to showcase technical depth while using Cronicorn as a concrete implementation example.

## Format for Each Idea

- **Title**: Catchy, SEO-friendly title
- **Hook**: Why readers care / the problem this solves
- **Technical Depth**: What makes this interesting
- **Code Examples**: What we can show from Cronicorn
- **Target Audience**: Who this resonates with
- **Estimated Word Count**: Blog post length
- **Difficulty**: Easy/Medium/Hard (to write)

---

## 1. Database as Integration Point: Event-Driven Without Events

**Title**: "You Don't Need Kafka: Using PostgreSQL as Your Message Queue"

**Hook**: Microservices need coordination, but do you really need Kafka/RabbitMQ? What if your database *is* your message bus?

**Technical Depth**:
- Decoupled worker architecture using database state changes as "events"
- Transaction-per-test pattern with proper isolation
- No additional infrastructure (Redis, Kafka, etc.)
- Trade-offs: eventual consistency vs operational simplicity
- When this pattern works (and when it doesn't)

**Code Examples from Cronicorn**:
```typescript
// Scheduler writes execution results
await runs.finish(runId, { status, durationMs });

// AI Planner reads as "events" (5 minutes later)
const endpointIds = await runs.getEndpointsWithRecentRuns(since);

// AI writes hints as new state
await jobs.writeAIHint(endpointId, { intervalMs, expiresAt });

// Scheduler picks up on next tick
const ep = await jobs.getEndpoint(endpointId);
// ep.aiHintIntervalMs is now available
```

**Target Audience**: Backend engineers building distributed systems, people evaluating Kafka vs simpler alternatives

**Estimated Word Count**: 2000-2500

**Difficulty**: Medium

**SEO Keywords**: PostgreSQL as message queue, microservices without Kafka, event-driven architecture, database integration patterns

**Why It's Compelling**:
- Goes against the grain ("just use Kafka")
- Shows when YAGNI principles apply at scale
- Real production code as proof
- Saves money and complexity

**References**:
- ADR-0018: Decoupled AI Worker Architecture
- `packages/domain/src/ports/repos.ts` - Integration contract

---

## 2. Hexagonal Architecture in TypeScript: YAGNI Edition

**Title**: "Clean Architecture in TypeScript: Only Add Ports When You Need Them"

**Hook**: Hexagonal architecture tutorials show you 100 ports and adapters. But when do you *actually* need each one?

**Technical Depth**:
- Domain-driven design with clear boundaries
- Ports & Adapters pattern (not just theory)
- YAGNI enforcement: when to add abstractions
- Contract testing for adapters
- Compile-time safety with `implements` keyword

**Code Examples from Cronicorn**:
```typescript
// Port definition (interface)
export interface JobsRepo {
  claimDueEndpoints(limit: number, withinMs: number): Promise<string[]>;
  writeAIHint(id: string, hint: AIHint): Promise<void>;
}

// Adapter implementation (compile-time checked)
export class InMemoryJobsRepo implements JobsRepo {
  async claimDueEndpoints(limit: number, withinMs: number) {
    // TypeScript ensures contract compliance
  }
}

// Composition root wires it up
const scheduler = new Scheduler({
  jobs: new DrizzleJobsRepo(db),  // or InMemoryJobsRepo for tests
  runs: new DrizzleRunsRepo(db),
  clock: new SystemClock(),
  dispatcher: new HttpDispatcher()
});
```

**Target Audience**: TypeScript developers learning DDD, teams struggling with "too much abstraction" or "not enough abstraction"

**Estimated Word Count**: 2500-3000

**Difficulty**: Medium-Hard

**SEO Keywords**: hexagonal architecture TypeScript, clean architecture, ports and adapters, domain-driven design, YAGNI principle

**Why It's Compelling**:
- Practical guide (not just theory)
- Shows the "when" not just the "how"
- Real decision-making criteria
- Addresses common over-engineering

**References**:
- ADR-0002: Hexagonal Architecture Principles and YAGNI Enforcement
- ADR-0022: Hexagonal Architecture Enforcement
- `.github/instructions/architecture.instructions.md`

---

## 3. Transaction-Per-Test: The Only Way to Test Databases

**Title**: "Zero Database Pollution: Transaction-Per-Test Pattern in Vitest"

**Hook**: Your integration tests fail randomly? Tests interfere with each other? You're probably not isolating database state properly.

**Technical Depth**:
- Why truncate/cleanup doesn't work
- Vitest fixtures (`test.extend()`)
- Transaction rollback > DELETE statements
- Type safety (`Database` and `Tx` are same type)
- Connection pool management

**Code Examples from Cronicorn**:
```typescript
// fixtures.ts
export const test = base.extend<{ tx: NodePgDatabase<typeof schema> }>({
  tx: async ({ }, use) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = drizzle(client, { schema });
      await use(tx); // Test runs here
      await client.query("ROLLBACK"); // Always clean
    } finally {
      client.release();
    }
  },
});

// my-repo.test.ts
test("creates record", async ({ tx }) => {
  const repo = new MyRepo(tx);
  const result = await repo.create({ name: "test" });
  expect(result.id).toBeDefined();
  // Automatic rollback - zero pollution
});
```

**Target Audience**: Developers writing integration tests, anyone frustrated with flaky database tests

**Estimated Word Count**: 1500-2000

**Difficulty**: Easy-Medium

**SEO Keywords**: transaction per test, database testing, Vitest integration tests, test isolation, flaky tests

**Why It's Compelling**:
- Solves a universal pain point
- Simple pattern with big impact
- Framework-agnostic (concept works anywhere)
- Shows before/after code

**References**:
- ADR-0038: Transactional Test Isolation Pattern
- `packages/adapter-drizzle/src/tests/fixtures.ts`
- `.github/instructions/testing-strategy.instructions.md`

---

## 4. Bundling Internal Dependencies for npm Publishing

**Title**: "Stop Publishing Private Packages: Bundle Your Monorepo for npm"

**Hook**: Your npm package depends on internal monorepo packages. Do you publish them all, or bundle them together?

**Technical Depth**:
- Monorepo publishing strategies
- tsup for zero-config bundling
- When to bundle vs publish separately
- pnpm workspace protocol transformation
- Trade-offs: bundle size vs version management

**Code Examples from Cronicorn**:
```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  external: ["@modelcontextprotocol/sdk"], // Host-provided
  // Everything else bundled: @cronicorn/api-contracts, zod, etc.
});

// package.json (dev dependency becomes bundled code)
{
  "devDependencies": {
    "@cronicorn/api-contracts": "workspace:*"  // Not published
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2"     // Only external dep
  }
}
```

**Target Audience**: Maintainers of monorepos, npm package authors, TypeScript library developers

**Estimated Word Count**: 1800-2200

**Difficulty**: Medium

**SEO Keywords**: npm monorepo publishing, tsup bundler, bundle internal dependencies, pnpm workspaces

**Why It's Compelling**:
- Non-obvious decision with clear trade-offs
- Practical solution to common problem
- Reduces version management headaches
- Shows tooling setup

**References**:
- ADR-0040: MCP Server Bundling Strategy
- `apps/mcp-server/tsup.config.ts`
- `apps/mcp-server/BUNDLING.md`

---

## 5. Building AI Tools That Don't Break: The 1:1 API Pattern

**Title**: "Building Reliable AI Tools: Map APIs 1:1 Instead of Inventing Abstractions"

**Hook**: AI tools (OpenAI functions, MCP tools, etc.) need API access. Most developers create custom abstractions. We found a better way: 1:1 mapping.

**Technical Depth**:
- Why abstractions cause drift
- Schema reuse with Zod
- Error handling in AI tool context
- Type safety from API to tool
- MCP SDK best practices

**Code Examples from Cronicorn**:
```typescript
// API contract (single source of truth)
export const CreateJobRequestSchema = z.object({
  name: z.string(),
  tenantId: z.string(),
  // ...
});

// MCP tool (directly uses contract)
server.registerTool({
  name: "POST_jobs",
  description: "Create a new job",
  inputSchema: { ...CreateJobRequestSchema.shape },  // Zero drift
  handler: async (params) => {
    try {
      const validated = CreateJobRequestSchema.parse(params);
      const response = await apiClient.fetch("/jobs", { 
        method: "POST",
        body: validated 
      });
      return { 
        content: [{ type: "text", text: "✅ Created job" }],
        structuredContent: JobResponseSchema.parse(response)
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
});
```

**Target Audience**: Developers building AI agents, MCP server authors, teams integrating AI with APIs

**Estimated Word Count**: 2000-2500

**Difficulty**: Medium

**SEO Keywords**: AI tools, MCP server, OpenAI functions, API integration, Zod validation

**Why It's Compelling**:
- Counter-intuitive (don't abstract!)
- Solves schema drift problem
- Applicable to OpenAI, MCP, and other agent frameworks
- Production-validated pattern

**References**:
- ADR-0041: MCP 1:1 API Tool Pattern Validation
- `apps/mcp-server/docs/1-to-1-API-TOOL-PATTERN.md`
- `apps/mcp-server/src/tools/api/post-jobs.ts`

---

## 6. OAuth Device Flow for CLI Tools: Better UX Than API Keys

**Title**: "Stop Using API Keys in CLIs: OAuth Device Flow for Better UX"

**Hook**: Your CLI tool needs authentication. Most use API keys (bad UX, security risk). Device flow is better—and easier than you think.

**Technical Depth**:
- OAuth 2.0 Device Authorization Grant
- Token storage with proper permissions
- Token refresh strategies
- Long-lived vs short-lived tokens
- Security considerations

**Code Examples from Cronicorn**:
```typescript
// Start device flow
const device = await startDeviceFlow();
console.log(`Visit: ${device.verification_uri}`);
console.log(`Code: ${device.user_code}`);
await open(device.verification_uri); // Auto-open browser

// Poll for authorization
const tokens = await pollForTokens(device.device_code);

// Store securely
await fs.writeFile(
  credentialsPath, 
  JSON.stringify(tokens),
  { mode: 0o600 }  // Owner read/write only
);

// Use token
const response = await fetch(apiUrl, {
  headers: { Authorization: `Bearer ${tokens.access_token}` }
});
```

**Target Audience**: CLI tool developers, devtools engineers, anyone building developer-facing tools

**Estimated Word Count**: 1800-2300

**Difficulty**: Medium

**SEO Keywords**: OAuth device flow, CLI authentication, OAuth 2.0, device authorization grant, CLI tools

**Why It's Compelling**:
- Better UX than competitors (GitHub CLI, AWS CLI use this)
- Security benefits over API keys
- Step-by-step implementation
- Handles token refresh

**References**:
- ADR-0042: Long-Lived Tokens for MCP Server
- `apps/mcp-server/src/lib/auth/device-flow.ts`
- `apps/mcp-server/docs/AUTHENTICATION.md`

---

## 7. TypeScript Monorepo Package.json: The Right Way

**Title**: "Stop Exporting from `src/`: TypeScript Monorepo Package.json Done Right"

**Hook**: Your TypeScript monorepo builds fine in dev, but breaks in production? You're probably exporting from `src/` instead of `dist/`.

**Technical Depth**:
- ESM vs CommonJS in Node.js
- TypeScript project references
- `exports` field best practices
- `main`, `types`, `exports` - what each does
- Common mistakes and fixes

**Code Examples from Cronicorn**:
```json
{
  "name": "@cronicorn/domain",
  "type": "module",
  "main": "./dist/index.js",           // Legacy fallback
  "types": "./dist/index.d.ts",        // TypeScript types
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",    // Types FIRST
      "default": "./dist/index.js"      // Then runtime
    }
  },
  "files": ["dist"]                     // Only ship compiled code
}
```

**Before/After**:
```json
// ❌ WRONG - Tries to load .ts at runtime
"exports": {
  ".": {
    "types": "./src/index.ts",
    "default": "./src/index.ts"
  }
}

// ✅ CORRECT - Loads compiled .js
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

**Target Audience**: TypeScript developers, monorepo maintainers, library authors

**Estimated Word Count**: 1500-2000

**Difficulty**: Easy-Medium

**SEO Keywords**: TypeScript package.json, ESM exports, TypeScript monorepo, project references

**Why It's Compelling**:
- Extremely common mistake
- Clear before/after comparison
- Official TypeScript recommendations
- Prevents production bugs

**References**:
- `.github/instructions/package-json-best-practices.instructions.md`
- All `packages/*/package.json` files

---

## 8. Building an MCP Server: From Idea to npm in 48 Hours

**Title**: "We Built an MCP Server in 48 Hours: Here's What We Learned"

**Hook**: Model Context Protocol is new, but building servers is easier than you think. Here's a soup-to-nuts guide using our production MCP server.

**Technical Depth**:
- MCP architecture basics
- Tool registration patterns
- Resource and prompt patterns
- Authentication for MCP servers
- Publishing to npm

**Code Examples from Cronicorn**:
```typescript
// Minimal MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "cronicorn", version: "1.0.0" });

// Register a tool
server.registerTool({
  name: "create_job",
  description: "Create a new cron job",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      schedule: { type: "string" }
    },
    required: ["name", "schedule"]
  },
  handler: async (params) => {
    const result = await createJob(params);
    return {
      content: [{ type: "text", text: `✅ Created: ${result.id}` }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Target Audience**: Developers interested in MCP, AI agent builders, tool creators

**Estimated Word Count**: 2500-3000

**Difficulty**: Medium-Hard

**SEO Keywords**: MCP server, Model Context Protocol, Claude desktop, AI agents, tool building

**Why It's Compelling**:
- MCP is hot right now
- End-to-end tutorial
- Production-ready code
- Includes deployment/publishing

**References**:
- `apps/mcp-server/` entire directory
- ADR-0040, ADR-0041, ADR-0042
- MCP server documentation

---

## 9. AI-Powered Scheduling: When to Use AI (and When Not To)

**Title**: "We Built an AI Scheduler So You Don't Have To: Lessons on When AI Actually Helps"

**Hook**: Everyone's adding AI to their product. We actually did it—and learned when AI helps vs when it's just expensive noise.

**Technical Depth**:
- Use cases where AI adds value
- Cost analysis (token usage, API calls)
- Graceful degradation patterns
- Prompt engineering for scheduling
- Tool design for AI agents

**Code Examples from Cronicorn**:
```typescript
// AI tools for adaptive scheduling
const tools = [
  {
    name: "propose_interval",
    description: "Adjust execution frequency based on patterns",
    parameters: z.object({
      intervalMs: z.number(),
      reason: z.string()
    }),
    execute: async ({ intervalMs, reason }) => {
      await jobs.writeAIHint(endpointId, { intervalMs, expiresAt });
    }
  },
  {
    name: "pause_until",
    description: "Pause execution during failures",
    parameters: z.object({
      untilIso: z.string().datetime().nullable()
    }),
    execute: async ({ untilIso }) => {
      await jobs.setPausedUntil(endpointId, untilIso ? new Date(untilIso) : null);
    }
  }
];

// Analysis with real metrics
const prompt = `
Endpoint: ${endpoint.name}
Last 24h: ${health.totalRuns} runs, ${health.failureRate}% failures
Avg duration: ${health.avgDurationMs}ms
Current interval: ${endpoint.baselineIntervalMs}ms

Based on these metrics, should we adjust the schedule?
`;
```

**Cost Analysis**:
```
100 endpoints/day × 300 tokens × $0.15/1M = $0.012/day
Monthly: ~$0.36 (negligible for value delivered)
```

**Target Audience**: Product engineers evaluating AI features, technical leaders deciding on AI investments

**Estimated Word Count**: 2000-2500

**Difficulty**: Medium

**SEO Keywords**: AI scheduling, OpenAI SDK, AI cost analysis, adaptive algorithms, when to use AI

**Why It's Compelling**:
- Honest assessment (AI isn't always the answer)
- Real cost numbers
- Shows decision-making process
- Actionable lessons

**References**:
- ADR-0018: Decoupled AI Worker Architecture
- `packages/worker-ai-planner/` entire package
- `apps/ai-planner/README.md`

---

## 10. Vertical Slice Architecture in a TypeScript Monorepo

**Title**: "Feature Folders Done Right: Vertical Slice Architecture in TypeScript"

**Hook**: Organizing by layer (controllers, services, repos) sucks. Organizing by feature is better. Here's how.

**Technical Depth**:
- Vertical slice vs horizontal layer architecture
- Feature-based package organization
- Shared kernel pattern (domain)
- Dependency rules between features
- Testing feature slices in isolation

**Code Examples from Cronicorn**:
```
packages/
├── domain/              # Shared kernel (entities, ports)
├── adapter-drizzle/     # Infrastructure adapter
├── adapter-http/        # Infrastructure adapter
├── worker-scheduler/    # Scheduling feature
│   ├── src/
│   │   ├── scheduler.ts
│   │   ├── planner.ts
│   │   └── __tests__/
├── worker-ai-planner/   # AI analysis feature
│   ├── src/
│   │   ├── planner.ts
│   │   ├── tools.ts
│   │   └── __tests__/
└── services/            # Cross-cutting business logic
    └── src/
        ├── jobs/
        ├── endpoints/
        └── runs/
```

**Dependency Graph**:
```
worker-scheduler ──→ domain ←── worker-ai-planner
                      ↑
                      │
                 adapter-drizzle
```

**Target Audience**: Software architects, team leads organizing codebases, TypeScript developers

**Estimated Word Count**: 2200-2700

**Difficulty**: Medium-Hard

**SEO Keywords**: vertical slice architecture, feature folders, TypeScript monorepo, clean architecture

**Why It's Compelling**:
- Clear before/after comparison
- Scalability benefits
- Real monorepo structure
- Testing advantages

**References**:
- `packages/` directory structure
- ADR-0017: Worker Package Naming Pattern
- `.github/instructions/architecture.instructions.md`

---

## 11. Rate Limiting Without Redis: Database-Backed Quotas

**Title**: "Rate Limiting in PostgreSQL: Why We Skipped Redis"

**Hook**: Rate limiting usually means Redis. But what if you could do it in PostgreSQL with better durability guarantees?

**Technical Depth**:
- Database-backed quota tracking
- Transaction isolation for accurate counts
- Tier-based limits (free, pro, enterprise)
- Time window bucketing (hourly, daily, monthly)
- Performance characteristics vs Redis

**Code Examples from Cronicorn**:
```typescript
// Tier limits
export const TIER_LIMITS = {
  free: {
    jobs: 10,
    endpoints: 20,
    runsPerDay: 1000,
  },
  pro: {
    jobs: 100,
    endpoints: 500,
    runsPerDay: 50000,
  }
};

// Quota check (transactional)
export async function checkRunsQuota(
  tx: Database,
  tenantId: string,
  tier: Tier
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const today = startOfDay(new Date());
  
  const [usage] = await tx
    .select({ count: count() })
    .from(runs)
    .where(
      and(
        eq(runs.tenantId, tenantId),
        gte(runs.startedAt, today)
      )
    );
    
  const limit = TIER_LIMITS[tier].runsPerDay;
  return {
    allowed: usage.count < limit,
    used: usage.count,
    limit
  };
}
```

**Trade-offs Table**:
| Aspect | Redis | PostgreSQL |
|--------|-------|------------|
| Speed | ~1ms | ~5-10ms |
| Durability | Eventual | Immediate |
| Complexity | +1 service | Existing stack |
| Cost | $$$ | $ |
| Accuracy | ~99% | 100% |

**Target Audience**: Backend engineers building rate limiters, anyone evaluating Redis vs database solutions

**Estimated Word Count**: 1800-2200

**Difficulty**: Medium

**SEO Keywords**: rate limiting, PostgreSQL rate limiting, Redis alternatives, quota management

**Why It's Compelling**:
- Goes against conventional wisdom
- Clear trade-off analysis
- Simpler infrastructure
- Production-proven

**References**:
- ADR-0021: Tier-Based Quota Enforcement
- `packages/domain/src/quota/tier-limits.ts`
- `packages/services/src/usage/quota-checker.ts`

---

## 12. Structured Logging with Pino: Production Observability Patterns

**Title**: "From console.log to Production Logs: Structured Logging with Pino"

**Hook**: console.log is fine for dev. But production needs structured, searchable, correlatable logs. Here's how we leveled up.

**Technical Depth**:
- Structured logging concepts
- Pino configuration for production
- Log levels and when to use each
- Context propagation (request IDs, tenant IDs)
- Log aggregation patterns

**Code Examples from Cronicorn**:
```typescript
// Create logger with context
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Log with structured data
logger.info({
  event: 'scheduler_tick_complete',
  endpointsClaimed: 12,
  successCount: 10,
  failureCount: 2,
  durationMs: 345,
  tenantId: 'tenant_123'
});

// Output (JSON for easy parsing):
{
  "level": "info",
  "time": "2025-01-10T10:00:00.000Z",
  "event": "scheduler_tick_complete",
  "endpointsClaimed": 12,
  "successCount": 10,
  "failureCount": 2,
  "durationMs": 345,
  "tenantId": "tenant_123"
}
```

**Before/After**:
```typescript
// ❌ Before: Unstructured
console.log(`[scheduler] tick complete: claimed=${claimed} success=${success}`);

// ✅ After: Structured
logger.info({
  event: 'scheduler_tick_complete',
  endpointsClaimed: claimed,
  successCount: success
});
```

**Target Audience**: Developers moving from dev to production, DevOps engineers, anyone setting up observability

**Estimated Word Count**: 1500-2000

**Difficulty**: Easy-Medium

**SEO Keywords**: Pino logging, structured logging, Node.js logging, production observability

**Why It's Compelling**:
- Practical upgrade path
- Shows real production setup
- Searchable/aggregatable logs
- Performance considerations

**References**:
- ADR-0031: Structured Logging with Pino
- `packages/adapter-pino/` entire package
- Logging configuration in all apps

---

## Prioritization Recommendations

### Tier 1: Highest Impact / Broad Appeal
1. **Transaction-Per-Test** (#3) - Universal pain point, easy to write
2. **Database as Integration Point** (#1) - Unique, counter-intuitive, timely
3. **Stop Exporting from src/** (#7) - Common mistake, clear solution

### Tier 2: Strong Technical Depth
4. **Hexagonal Architecture YAGNI** (#2) - Addresses common confusion
5. **Building an MCP Server** (#8) - Hot topic, end-to-end guide
6. **AI-Powered Scheduling** (#9) - Honest AI assessment (rare)

### Tier 3: Niche but Valuable
7. **Bundling Internal Dependencies** (#4) - Solves specific monorepo problem
8. **1:1 API Pattern** (#5) - Novel approach to AI tools
9. **OAuth Device Flow** (#6) - Better UX for CLI tools
10. **Vertical Slice Architecture** (#10) - Good for team leads

### Tier 4: Deeper Dives
11. **Rate Limiting Without Redis** (#11) - Interesting trade-offs
12. **Structured Logging** (#12) - Production best practices

## Writing Guidelines

For each blog post:

1. **Start with the problem** (not Cronicorn)
2. **Show bad approaches** (what people do wrong)
3. **Introduce solution** (general principle)
4. **Demonstrate with Cronicorn** (concrete example)
5. **Discuss trade-offs** (when this works/doesn't)
6. **Provide code you can copy** (GitHub links)

## Distribution Strategy

- **Dev.to**: Transaction-per-test, Database as Integration Point
- **Medium**: All posts (with canonical links)
- **Hacker News**: #1, #2, #8, #9 (controversial/interesting)
- **Reddit r/programming**: #1, #2, #3, #7
- **Reddit r/typescript**: #2, #7, #10
- **Twitter/X**: All posts (thread format)
- **LinkedIn**: #2, #9, #10 (more professional)

## Success Metrics

For each post, track:
- Views (target: 5k+ for successful post)
- GitHub stars gained (target: 50+ per post)
- Comments/discussion (quality > quantity)
- Conversion to docs page views (track via UTM params)
- MCP server installs (for MCP-related posts)

## Timeline

Suggested publication cadence:
- Week 1: Post #3 (easiest, validates audience)
- Week 2: Post #1 (big impact if #3 performs)
- Week 3: Post #7 (quick win, different angle)
- Week 4: Post #2 (deeper dive)
- Month 2: One post per week from Tier 2
- Month 3: One post per 2 weeks from Tier 3-4

---

## Additional Ideas (Future)

These didn't make the main list but could be blog posts:

- **Monorepo with pnpm**: Why we chose pnpm over npm/yarn
- **Testing Strategy**: Unit, integration, E2E boundaries
- **Zero-Config Env Files**: Making .env Just Work™
- **ADR-Driven Development**: Documenting decisions that matter
- **TypeScript Project References**: Faster builds, better IDE
- **Drizzle ORM**: Type-safe queries without magic
- **Stripe Webhooks**: Idempotent webhook handling
- **GitHub Actions**: Semantic release automation
- **Docker Compose for Dev**: Local development environment
- **Multi-Tenant Architecture**: Isolation patterns in PostgreSQL

Let me know which posts to prioritize or expand!
