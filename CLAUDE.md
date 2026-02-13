# Cronicorn - Adaptive Cron Job Scheduler

## What This Project Is

Cronicorn is an AI-powered HTTP job scheduler with a dual-worker architecture (Scheduler + AI Planner) built using hexagonal architecture principles.

**Tech Stack:** TypeScript 5.7, Node 24+, React 19, TanStack Start, Hono, PostgreSQL 17, Drizzle ORM, Vitest, Playwright

**Key Characteristics:**
- pnpm workspace monorepo (8 apps + 15 packages)
- Hexagonal architecture (ports & adapters)
- Transaction-per-test isolation
- 63+ Architecture Decision Records

## Quick Reference

**Detailed documentation available at:**
- `docs/public/developers/quick-start.md` - Setup and commands
- `docs/public/developers/workspace-structure.md` - Apps and packages overview
- `docs/public/technical/system-architecture.md` - Dual-worker architecture
- `docs/public/developers/quality-checks.md` - Testing and quality standards
- `.adr/` - 63+ architectural decisions (see ADR-0002 for hexagonal architecture)

## Architecture Overview

**Hexagonal Pattern:**
- **Domain** (`packages/domain/**`) - Pure logic, no I/O
- **Ports** - Interfaces (Clock, Cron, Dispatcher, JobsRepo, RunsRepo)
- **Adapters** (`packages/adapter-*/**`) - Infrastructure implementations
- **Services** (`packages/services/**`) - Business orchestration
- **Composition Roots** (`apps/*/src/index.ts`) - Dependency wiring

**See `docs/public/technical/system-architecture.md` for full architecture details.**

## Common Commands

### Development
```bash
pnpm dev              # Start all services (API, web, scheduler, AI planner)
pnpm dev:api          # API server only (port 3333)
pnpm dev:web          # Web app only (port 5173)
pnpm dev:scheduler    # Scheduler worker only
pnpm dev:ai-planner   # AI planner worker only
```

### Database
```bash
pnpm db               # Start PostgreSQL (Docker)
pnpm db:migrate       # Run database migrations
pnpm scenarios        # Seed test data scenarios
pnpm studio           # Database browser (Drizzle Studio)
```

### Build & Testing
```bash
pnpm build            # Full build (all apps + packages)
pnpm build:packages   # Packages only (TypeScript project references)
pnpm test             # Unit + integration tests (Vitest)
pnpm test:e2e         # End-to-end tests (Playwright)

# For coverage
pnpm test:coverage    # Runs vitest tests with coverage. Coverage will be in the `coverage` directory in root of repo
```

### Code Quality
```bash
pnpm lint             # Check for errors
pnpm lint:fix         # Auto-fix and format
```

**See `docs/public/developers/quick-start.md` for complete command reference.**

## Key Locations

- **`.adr/`** - Architecture Decision Records
  - ADR-0002: Hexagonal Architecture Principles
  - ADR-0009: Transaction-per-Test Pattern
- **`docs/_RUNNING_TECH_DEBT.md`** - Tech debt log (mandatory for all TODOs)
- **`docs/public/developers/`** - Developer documentation
- **`.env`** - Single environment file at root

## Conventions

### File Naming
- **kebab-case** for all files: `job-manager.ts`
- **PascalCase** for types: `JobsRepo`, `Clock`
- **camelCase** for functions: `claimDueEndpoints`

### Code Quality
- **No console.log** - Use Pino logger (ESLint error)
- **No any type** - Strict TypeScript
- **No process.env** - Inject config via DI
- **Small files** - <150 lines preferred

### Module System
- **All packages**: `"type": "module"` (ESM)
- **Apps**: Use `@/` alias for imports
- **Packages**: Use `@cronicorn/*` for cross-package imports
- **Exports**: Point to `dist/`, never `src/`

### Git Workflow
- **Conventional commits** for semantic-release
- **Pre-commit hook** runs `pnpm lint:fix` automatically
- **Quality checks**: See `docs/public/developers/quality-checks.md`

## Important Patterns

### Transaction-per-Test
Every test gets its own database transaction that rolls back automatically:
```typescript
// Use the `tx` fixture
test('creates a job', async ({ tx }) => {
  const repo = new DrizzleJobsRepo(tx);
  // Test uses real database
  // Automatic rollback after test
});
```

### Domain Purity
```typescript
// ✅ GOOD - Domain depends only on ports
import type { Clock, JobsRepo } from '../ports';

// ❌ BAD - Domain imports infrastructure
import { drizzle } from 'drizzle-orm';
```

### Dependency Injection
```typescript
// Composition root wires everything
const clock = new SystemClock();
const jobs = new DrizzleJobsRepo(db);
const scheduler = new Scheduler({ clock, jobs });
```

---

## AI Contribution Guardrails (Read Carefully)

These rules exist to keep AI-generated changes understandable, reversible, and aligned with existing decisions.

### Before Writing Any Code
- Read relevant ADRs. Do not violate them.
- Search the codebase for existing implementations before creating new ones.
- Clarify where the change belongs (domain, port, adapter, service, or composition root).
- If the placement is unclear, stop and ask.

### Scope Control
- Do not add features that were not explicitly requested.
- Do not “complete” related work unless asked.
- If you notice future improvements, log them in `docs/_RUNNING_TECH_DEBT.md` instead of implementing them.

### Architecture Discipline
- Never introduce infrastructure concerns into the domain.
- Never bypass ports to “simplify” access.
- Adapters may depend on ports and infrastructure.
- Domain may depend only on other domain code and ports.

### Change Strategy
- Prefer small, incremental changes.
- Avoid refactors unless explicitly requested.
- If a refactor is necessary, explain why before proceeding.

### Testing Expectations
- Domain changes require domain tests.
- Adapter changes must satisfy existing contract tests.
- Do not weaken or delete tests to make changes pass.

### Output Expectations
- Favor boring, readable code over cleverness.
- Match existing naming and file structure.
- If unsure, stop and ask rather than guessing.

---

## Need Help?

- Architecture? See `docs/public/technical/system-architecture.md`
- Dev workflow? See `docs/public/developers/quick-start.md`
- Quality checks? See `docs/public/developers/quality-checks.md`
- Workspace structure? See `docs/public/developers/workspace-structure.md`
- Specific architectural decision? Check `.adr/` folder