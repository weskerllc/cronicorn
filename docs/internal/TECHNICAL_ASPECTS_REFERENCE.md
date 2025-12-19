# Cronicorn's Unique Technical Aspects - Quick Reference

This document catalogs the distinctive technical patterns, architectural decisions, and implementation details that make Cronicorn interesting for technical content.

## Architecture & Design Patterns

### 1. Hexagonal Architecture with YAGNI Enforcement
**What**: Ports & Adapters pattern with strict criteria for when to add abstractions
**Why it's unique**: Most tutorials show 50+ ports from day 1. We document when to add each one.
**Location**: 
- ADR-0002: Hexagonal Architecture Principles
- `.github/instructions/architecture.instructions.md`
**Key insight**: Only 5 ports needed on day 1 (Clock, Cron, Repos, Dispatcher, Logger can wait)

### 2. Database as Integration Point (No Message Queue)
**What**: PostgreSQL state changes act as events between decoupled workers
**Why it's unique**: Counter-intuitive (everyone says "use Kafka"), but operationally simpler
**Location**:
- ADR-0018: Decoupled AI Worker Architecture
- `packages/worker-ai-planner/` and `packages/worker-scheduler/`
**Key insight**: Re-read pattern + eventual consistency eliminates need for message bus

### 3. Vertical Slice Architecture in Monorepo
**What**: Features organized by capability (workers) not by layer (MVC)
**Why it's unique**: Clear boundaries, independent testing, parallel development
**Location**:
- ADR-0017: Worker Package Naming Pattern
- `packages/` directory structure
**Key insight**: Each worker is self-contained with its own tests and dependencies

### 4. Domain-Driven Design with Ports
**What**: Pure domain logic separated from infrastructure via interfaces
**Why it's unique**: Practical DDD (not just theory), production-validated
**Location**:
- `packages/domain/` (pure logic)
- `packages/adapter-*/` (infrastructure)
**Key insight**: Domain has zero imports of infrastructure libraries

## Testing Strategies

### 5. Transaction-Per-Test Pattern
**What**: Vitest fixtures that wrap each test in BEGIN/ROLLBACK
**Why it's unique**: Zero database pollution, perfect isolation, parallel-safe
**Location**:
- ADR-0038: Transactional Test Isolation
- `packages/adapter-drizzle/src/tests/fixtures.ts`
**Key insight**: Rollback is faster than DELETE/TRUNCATE and truly isolated

### 6. Contract Testing for Adapters
**What**: Reusable test suites that verify adapter implementations
**Why it's unique**: Same tests work for in-memory, PostgreSQL, Redis, etc.
**Location**:
- `packages/domain/src/testing/contracts.ts`
**Key insight**: Write contract tests once, run against all adapter implementations

### 7. Three-Layer Test Pyramid
**What**: Unit (mocked ports) → Integration (real DB) → API (full stack)
**Why it's unique**: Clear boundaries on what to test at each layer
**Location**:
- `.github/instructions/testing-strategy.instructions.md`
**Key insight**: Unit tests are fast (no DB), integration tests use transactions

## TypeScript & Monorepo Patterns

### 8. Correct ESM Package.json Format
**What**: Export from `dist/` not `src/`, proper `exports` field ordering
**Why it's unique**: Most monorepos export from source (breaks in production)
**Location**:
- `.github/instructions/package-json-best-practices.instructions.md`
- All `packages/*/package.json`
**Key insight**: `types` must come before `default` in exports map

### 9. TypeScript Project References
**What**: Incremental builds with cross-package type checking
**Why it's unique**: Fast builds (only changed packages), better IDE support
**Location**:
- `tsconfig.base.json` and package-level `tsconfig.json`
**Key insight**: Prevents domain from importing adapters (compile-time enforcement)

### 10. Bundling Internal Dependencies
**What**: tsup bundles `@cronicorn/api-contracts` into MCP server
**Why it's unique**: Eliminates version drift, simpler for npm consumers
**Location**:
- ADR-0040: MCP Server Bundling Strategy
- `apps/mcp-server/tsup.config.ts`
**Key insight**: One published package instead of coordinating versions

## AI Integration Patterns

### 11. 1:1 API-to-Tool Mapping
**What**: MCP tools map directly to API endpoints using same Zod schemas
**Why it's unique**: Zero schema drift, eliminates abstraction layer
**Location**:
- ADR-0041: MCP 1:1 API Tool Pattern
- `apps/mcp-server/src/tools/api/`
**Key insight**: Spread `...Schema.shape` to reuse API contracts

### 12. AI Hints with TTL and Graceful Degradation
**What**: AI writes scheduling hints with expiry; scheduler has fallback
**Why it's unique**: AI failure doesn't break scheduling
**Location**:
- `packages/domain/src/governor/plan-next-run.ts`
**Key insight**: AI hints are advisory (not required), always have baseline fallback

### 13. Prompt Engineering with Tool-Based Actions
**What**: AI analyzes patterns and calls tools to adjust schedules
**Why it's unique**: Tools are endpoint-scoped, budget-limited, auditable
**Location**:
- `packages/worker-ai-planner/src/tools.ts`
**Key insight**: Tools write state, nudge scheduler, not direct execution

### 14. Cost-Effective AI Analysis
**What**: Batch analysis every 5 minutes with gpt-4o-mini (~$0.36/month)
**Why it's unique**: AI at scale without breaking the bank
**Location**:
- `apps/ai-planner/README.md` (cost analysis)
**Key insight**: Lookback window + infrequent ticks + cheap model = affordable

## Database & ORM Patterns

### 15. Drizzle ORM for Type Safety
**What**: Type-safe SQL queries with zero magic, migrations as SQL files
**Why it's unique**: Better than Prisma (no client generation), better than raw SQL (types)
**Location**:
- `packages/adapter-drizzle/src/`
**Key insight**: `Database` and `Tx` are same type (NodePgDatabase)

### 16. Rate Limiting Without Redis
**What**: Quota enforcement using PostgreSQL queries and transactions
**Why it's unique**: ACID guarantees, simpler ops, no Redis to manage
**Location**:
- ADR-0021: Tier-Based Quota Enforcement
- `packages/domain/src/quota/tier-limits.ts`
**Key insight**: 5-10ms vs 1ms is acceptable for accuracy + simplicity trade-off

### 17. Tier-Based Limits and Metering
**What**: Different limits per subscription tier (free/pro/enterprise)
**Why it's unique**: Single source of truth, compile-time checked
**Location**:
- `packages/domain/src/quota/tier-limits.ts`
**Key insight**: Export const objects + TypeScript inference = type-safe limits

## Authentication & Security

### 18. OAuth Device Flow for CLI
**What**: Device Authorization Grant for MCP server (not API keys)
**Why it's unique**: Better UX (browser login), better security (no keys)
**Location**:
- ADR-0042: Long-Lived Tokens for MCP Server
- `apps/mcp-server/src/lib/auth/device-flow.ts`
**Key insight**: 30-day tokens with automatic refresh flow

### 19. Dual Auth Implementation
**What**: Cookie-based (web) + token-based (API/MCP) auth in same system
**Why it's unique**: Separate concerns, appropriate auth per client type
**Location**:
- ADR-0011: Dual Auth Implementation
**Key insight**: Middleware detects client type and applies appropriate auth

## Model Context Protocol (MCP)

### 20. Production MCP Server with Prompts
**What**: Published npm package with guided workflows
**Why it's unique**: One of the first production MCP servers (published Nov 2024)
**Location**:
- `apps/mcp-server/` entire package
- npmjs.com/@cronicorn/mcp-server
**Key insight**: Prompts guide users through complex workflows step-by-step

### 21. MCP Server Bundling Strategy
**What**: Single executable with all dependencies bundled (except MCP SDK)
**Why it's unique**: Zero version coordination, works offline after install
**Location**:
- ADR-0040: MCP Server Bundling Strategy
- `apps/mcp-server/BUNDLING.md`
**Key insight**: tsup bundles everything into 470KB executable

## Observability & Operations

### 22. Structured Logging with Pino
**What**: JSON logs with consistent fields across all services
**Why it's unique**: Easy to parse, correlate across services, aggregate
**Location**:
- ADR-0031: Structured Logging with Pino
- `packages/adapter-pino/`
**Key insight**: Log events not messages, include context (tenantId, jobId)

### 23. Zero-Config Environment Variables
**What**: Single `.env` file at repo root, loaded by all apps
**Why it's unique**: No per-app env files, consistent across dev/prod
**Location**:
- `.github/instructions/running-commands.instructions.md`
- Root `.env.example`
**Key insight**: dotenv-cli wraps all commands in package.json

### 24. Docker Compose for Local Development
**What**: Full stack (db, migrations, scheduler, AI, API, web) in one command
**Why it's unique**: Production-like environment locally, isolated
**Location**:
- `docker-compose.yml` and `docker-compose.dev.yml`
**Key insight**: Dev and prod use same Docker images (different env vars)

## Scheduling Algorithm

### 25. Governor Pattern (Adaptive Scheduling)
**What**: Policy-based next-run calculation with multiple sources
**Why it's unique**: Cron + intervals + AI hints + constraints all in one
**Location**:
- `packages/domain/src/governor/plan-next-run.ts`
**Key insight**: Candidates list + earliest wins + clamp to min/max

### 26. AI Hints Override Baseline (with TTL)
**What**: AI can temporarily override cron/interval schedules
**Why it's unique**: Dynamic adaptation without permanent changes
**Location**:
- ADR-0026: AI Hints Override Baseline
**Key insight**: Expired hints ignored, revert to baseline automatically

### 27. Exponential Backoff for Failures
**What**: Automatic interval increase on failures, reset on success
**Why it's unique**: Self-healing without manual intervention
**Location**:
- ADR-0023: Exponential Backoff for Failures
**Key insight**: Failure count stored per endpoint, drives backoff multiplier

### 28. Pause/Resume Mechanism
**What**: Endpoints can be paused until specific time or indefinitely
**Why it's unique**: AI can pause during downtime, resume automatically
**Location**:
- `packages/domain/src/entities/job.ts` (pausedUntil field)
**Key insight**: Governor checks pausedUntil before scheduling

## Codebase Organization

### 29. ADR-Driven Development
**What**: Every major decision documented as Architectural Decision Record
**Why it's unique**: 54 ADRs with task IDs, context, trade-offs
**Location**:
- `.adr/` directory (54 files)
**Key insight**: References to task IDs make decisions traceable

### 30. Instruction Files for AI Agents
**What**: `.github/instructions/` files guide AI code generation
**Why it's unique**: AI agents follow project conventions automatically
**Location**:
- `.github/instructions/*.instructions.md`
**Key insight**: Pattern-based instructions (applyTo globs)

### 31. Tech Debt Log
**What**: Running markdown file tracking technical debt and decisions
**Why it's unique**: Single source of truth for "should we fix this?"
**Location**:
- `docs/_RUNNING_TECH_DEBT.md`
**Key insight**: Categorized (blocking, nice-to-have, deferred)

## Additional Unique Aspects

### 32. Workspace Structure Documentation
**What**: Clear README in every package explaining its purpose
**Why it's unique**: New contributors understand monorepo instantly
**Location**:
- Each `packages/*/README.md` and `apps/*/README.md`

### 33. Semantic Release Automation
**What**: Version bumps and changelogs generated from commit messages
**Why it's unique**: Zero manual versioning, conventional commits enforced
**Location**:
- `.releaserc` and GitHub Actions

### 34. E2E Tests with Manual Server Startup
**What**: Playwright tests against real running servers (not mocks)
**Why it's unique**: True integration testing, catches real issues
**Location**:
- ADR-0045: Playwright E2E Testing
- `apps/e2e/`

### 35. Fair Source License (FSL-1.1-MIT)
**What**: Free for small/medium use, converts to MIT after 2 years
**Why it's unique**: Balance between open source and sustainability
**Location**:
- `LICENSE` file

---

## How to Use This Reference

### For Blog Posts
- Pick 1-3 unique aspects per post
- Show code examples from referenced locations
- Link to ADRs for deeper context

### For Documentation
- Extract "how-to" guides from implementations
- Cross-reference between related aspects
- Keep updated as codebase evolves

### For Presentations
- Use as outline for conference talks
- Each aspect = 1-2 slides
- Demo from actual codebase

### For Comparisons
- Compare to industry standards (Kafka vs DB, Prisma vs Drizzle)
- Explain trade-offs honestly
- Show when NOT to use our approach

---

## Categories Summary

- **Architecture**: 4 unique patterns
- **Testing**: 3 innovative approaches
- **TypeScript**: 3 best practices
- **AI Integration**: 4 novel patterns
- **Database**: 3 alternatives to common tools
- **Authentication**: 2 security patterns
- **MCP**: 2 early implementations
- **Observability**: 3 operational patterns
- **Scheduling**: 4 algorithm innovations
- **Codebase**: 3 organizational approaches
- **Misc**: 5 additional aspects

**Total**: 35+ bloggable technical aspects

---

**Remember**: Each aspect is valuable because it's either:
1. **Counter-intuitive** (DB instead of Kafka)
2. **Solves a common pain** (transaction-per-test)
3. **Novel approach** (1:1 API-to-tool mapping)
4. **Production-validated** (MCP server with 1000+ downloads)
5. **Well-documented** (ADRs + implementation + tests)
