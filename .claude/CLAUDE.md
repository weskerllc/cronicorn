# Cronicorn - Adaptive Cron Job Scheduler

## What This Project Is

Cronicorn is an AI-powered cron job scheduler built with hexagonal architecture principles. It provides intelligent scheduling with adaptive intervals, real-time monitoring, and comprehensive API management.

**Tech Stack:**
- **Backend**: TypeScript 5.7, Node 24+, Hono (API), PostgreSQL 17, Drizzle ORM
- **Frontend**: React 19, TanStack Start (SSR), Tailwind CSS 4, shadcn/ui
- **Testing**: Vitest, Playwright
- **Infrastructure**: Docker, pnpm workspaces (monorepo)
- **AI**: OpenAI API (adaptive scheduling)
- **Auth**: Better Auth
- **Payments**: Stripe

## Monorepo Structure

This is a pnpm workspace monorepo with **8 apps** and **15 packages**.

### Apps (Deployable Services)
- `@cronicorn/api` - Hono HTTP API server (REST + OpenAPI)
- `@cronicorn/web` - TanStack Start SSR frontend
- `@cronicorn/scheduler-app` - Background worker for job execution
- `@cronicorn/ai-planner-app` - AI optimization engine
- `@cronicorn/migrator` - Database migration runner
- `@cronicorn/docs` - Docusaurus documentation site
- `@cronicorn/mcp-server` - Model Context Protocol server (npm published)
- `@cronicorn/e2e` - Playwright end-to-end tests

### Packages (Shared Libraries)

**Core Domain:**
- `domain` - Pure business logic (no I/O, framework-free)
- `services` - Business orchestration layer (managers)

**Adapters (Infrastructure):**
- `adapter-drizzle` - PostgreSQL repository implementation
- `adapter-http` - HTTP client for webhook execution
- `adapter-cron` - Cron expression parsing
- `adapter-pino` - Structured logging
- `adapter-ai` - OpenAI API client
- `adapter-stripe` - Payment processing
- `adapter-system-clock` - Time abstraction (for testing)

**Workers:**
- `worker-scheduler` - Main scheduling loop
- `worker-ai-planner` - AI analysis engine

**Shared:**
- `ui-library` - Reusable React components (shadcn-style)
- `api-contracts` - OpenAPI schemas & types
- `config-defaults` - Default environment variables
- `content` - Static assets (logos, etc.)

## Architecture

**Hexagonal (Ports & Adapters) Pattern:**
- **Domain** (`packages/domain/**`) - Pure business logic, no I/O, only Zod allowed
- **Ports** - Interfaces defined in domain (Clock, Cron, Dispatcher, JobsRepo, RunsRepo)
- **Adapters** (`packages/adapter-*/**`) - Concrete implementations of ports
- **Services** (`packages/services/**`) - Business layer that orchestrates multiple repositories
- **Composition Roots** (`apps/*/src/index.ts`) - Wire dependencies together

**Key Principles:**
- Domain is pure and testable in isolation
- All I/O goes through adapter implementations
- Transaction-per-test for perfect database isolation
- Vertical slices (features own their ports and repositories)

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
```

### Build & Testing
```bash
pnpm build            # Full build (all apps + packages)
pnpm build:packages   # Packages only (TypeScript project references)
pnpm test             # Unit + integration tests (Vitest)
pnpm test:e2e         # End-to-end tests (Playwright)
```

### Code Quality
```bash
pnpm lint             # Check for errors
pnpm lint:fix         # Auto-fix and format
```

### Scenarios
```bash
pnpm scenarios        # Interactive scenario selector
pnpm scenarios:clean  # Clean baseline (no jobs)
pnpm scenarios:test   # Test data for E2E
```

## Key Locations

- **/.adr/** - 63+ Architecture Decision Records (numbered 0001-0055)
  - ADR-0002: Hexagonal Architecture Principles (important!)
  - ADR-0009: Transaction-per-Test Pattern
- **/docs/_RUNNING_TECH_DEBT.md** - MANDATORY tech debt logging (must log all TODOs here)
- **/docs/public/developers/** - Developer guides (quality checks, workspace structure, quick start)
- **.env** - Single environment file at root (loaded via dotenv-cli)

## Conventions

### File Naming
- **kebab-case** for all files (`job-manager.ts`, not `JobManager.ts`)
- **PascalCase** for types (`JobsRepo`, `Clock`)
- **camelCase** for functions (`claimDueEndpoints`)
- **UPPER_SNAKE_CASE** for constants (`MAX_EXECUTION_TIME_MS`)

### Code Quality
- **No console.log** - Use logger (Pino) instead (ESLint error)
- **No any type** - Strict TypeScript everywhere
- **No process.env** - Inject config through dependency injection
- **Sorted imports** - Automatically enforced by ESLint (@antfu/eslint-config)
- **Small files** - <150 lines per file preferred

### Module System
- **All packages**: `"type": "module"` (ESM)
- **Apps use @/ alias** for imports
- **Packages use @cronicorn/**** for cross-package imports
- **Exports point to dist/**, never `src/`
- **Types first in exports map**: `"types": "./dist/index.d.ts"` must come first

### Git Workflow
- **Conventional commits** for semantic-release (feat/fix/chore)
- **Pre-commit hook** runs `pnpm lint:fix` automatically (.husky/pre-commit)
- **semantic-release** on push to main (automated versioning)

## Quality Checklist

**Before Commit:**
- [ ] `pnpm test` passes
- [ ] Lint auto-fixed by pre-commit hook
- [ ] `pnpm build:packages` succeeds

**Before Merge:**
- [ ] `pnpm test` + `pnpm test:e2e` pass
- [ ] `pnpm build` succeeds
- [ ] Zero lint warnings
- [ ] ADR created if architectural change
- [ ] Tech debt logged in `docs/_RUNNING_TECH_DEBT.md`

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

## Need Help?

- Architecture questions? Check `.adr/` folder (especially ADR-0002)
- Dev workflow? See `docs/public/developers/quick-start.md`
- Quality checks? See `docs/public/developers/quality-checks.md`
- Workspace structure? See `docs/public/developers/workspace-structure.md`
