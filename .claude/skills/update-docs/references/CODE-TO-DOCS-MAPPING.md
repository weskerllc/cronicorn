# Code-to-Docs Mapping

Maps source code locations to the documentation files they affect. Use this reference when analyzing code changes to identify which docs need updating.

---

## Apps

### `apps/api/` — HTTP API Server

| Source path | Docs affected |
|-------------|---------------|
| `apps/api/src/routes/` | `docs/public/api-reference.md` |
| `apps/api/src/routes/auth/` | `docs/public/api-reference.md` (Authentication section), `docs/contributors/authentication.md` |
| `apps/api/src/routes/jobs/` | `docs/public/api-reference.md` (Jobs endpoints) |
| `apps/api/src/routes/endpoints/` | `docs/public/api-reference.md` (Endpoints section) |
| `apps/api/src/routes/runs/` | `docs/public/api-reference.md` (Runs section) |
| `apps/api/src/index.ts` | `docs/contributors/workspace-structure.md` (composition root) |

### `apps/web/` — Frontend Web App

| Source path | Docs affected |
|-------------|---------------|
| `apps/web/src/routes/` | May affect `docs/public/quick-start.md` (UI screenshots/instructions) |
| `apps/web/src/components/` | Rarely affects docs directly (UI internals) |

### `apps/scheduler/` — Scheduler Worker App

| Source path | Docs affected |
|-------------|---------------|
| `apps/scheduler/src/` | `docs/public/technical/system-architecture.md`, `docs/public/technical/how-scheduling-works.md` |
| `apps/scheduler/src/index.ts` | `docs/contributors/workspace-structure.md` (composition root) |

### `apps/ai-planner/` — AI Planner Worker App

| Source path | Docs affected |
|-------------|---------------|
| `apps/ai-planner/src/` | `docs/public/technical/system-architecture.md`, `docs/public/technical/how-ai-adaptation-works.md` |
| `apps/ai-planner/src/index.ts` | `docs/contributors/workspace-structure.md` (composition root) |

### `apps/mcp-server/` — MCP Server

| Source path | Docs affected |
|-------------|---------------|
| `apps/mcp-server/src/` | `docs/public/mcp-server.md` |
| `apps/mcp-server/src/tools/` | `docs/public/mcp-server.md` (Available Tools section) |
| `apps/mcp-server/src/resources/` | `docs/public/mcp-server.md` (Resources section) |
| `apps/mcp-server/package.json` | `docs/public/mcp-server.md` (installation instructions, version) |

### `apps/docs/` — Documentation Site

| Source path | Docs affected |
|-------------|---------------|
| `apps/docs/` | Docusaurus config only; content lives in `docs/` |
| `apps/docs/docusaurus.config.ts` | Sidebar structure, site metadata |

### `apps/migrator/` — Database Migrator

| Source path | Docs affected |
|-------------|---------------|
| `apps/migrator/src/` | `docs/contributors/quick-start.md` (database setup) |

---

## Packages — Domain & Core

### `packages/domain/` — Pure Domain Logic

| Source path | Docs affected |
|-------------|---------------|
| `packages/domain/src/scheduler.ts` | `docs/public/technical/how-scheduling-works.md` |
| `packages/domain/src/governor.ts` (or governor logic) | `docs/public/technical/how-scheduling-works.md`, `docs/public/core-concepts.md` (Governor section) |
| `packages/domain/src/ports/` | `docs/public/technical/system-architecture.md` (Ports section) |
| `packages/domain/src/entities/` | `docs/public/core-concepts.md` (if new entity types) |
| `packages/domain/src/policies/` | `docs/public/technical/configuration-and-constraints.md` |
| Any new port interface | `docs/contributors/workspace-structure.md`, `docs/public/technical/system-architecture.md` |

### `packages/services/` — Business Logic Layer

| Source path | Docs affected |
|-------------|---------------|
| `packages/services/src/` | `docs/public/technical/system-architecture.md` (Services layer) |
| Job management services | `docs/public/core-concepts.md`, `docs/public/api-reference.md` |
| Scheduling services | `docs/public/technical/how-scheduling-works.md` |

### `packages/api-contracts/` — API Contracts

| Source path | Docs affected |
|-------------|---------------|
| `packages/api-contracts/src/` | `docs/public/api-reference.md` (request/response schemas) |
| New route contracts | `docs/public/api-reference.md` (new endpoint documentation) |

---

## Packages — Adapters

### `packages/adapter-drizzle/` — Database Adapter

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-drizzle/src/schema/` | `docs/contributors/workspace-structure.md`, may affect `docs/public/core-concepts.md` if data model changes |
| `packages/adapter-drizzle/src/repos/` | `docs/contributors/workspace-structure.md` |
| `packages/adapter-drizzle/src/migrations/` | `docs/contributors/quick-start.md` (migration instructions) |

### `packages/adapter-ai/` — AI SDK Adapter

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-ai/src/` | `docs/public/technical/how-ai-adaptation-works.md` |

### `packages/adapter-http/` — HTTP Dispatcher

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-http/src/` | `docs/public/technical/how-scheduling-works.md` (endpoint execution) |

### `packages/adapter-cron/` — Cron Parser

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-cron/src/` | `docs/public/core-concepts.md` (schedule/cron expression section) |

### `packages/adapter-stripe/` — Stripe Integration

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-stripe/src/` | `docs/public/` (pricing-related docs if they exist) |

### `packages/adapter-pino/` — Logger

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-pino/src/` | `docs/contributors/` (logging conventions if documented) |

### `packages/adapter-system-clock/` — System Clock

| Source path | Docs affected |
|-------------|---------------|
| `packages/adapter-system-clock/src/` | Rarely affects docs (infrastructure detail) |

---

## Packages — Workers

### `packages/worker-scheduler/` — Scheduler Worker Logic

| Source path | Docs affected |
|-------------|---------------|
| `packages/worker-scheduler/src/` | `docs/public/technical/how-scheduling-works.md`, `docs/public/technical/system-architecture.md` |
| Simulation logic | `docs/contributors/workspace-structure.md` (`pnpm sim`) |

### `packages/worker-ai-planner/` — AI Planner Worker Logic

| Source path | Docs affected |
|-------------|---------------|
| `packages/worker-ai-planner/src/` | `docs/public/technical/how-ai-adaptation-works.md`, `docs/public/technical/system-architecture.md` |
| AI tool definitions | `docs/public/technical/how-ai-adaptation-works.md` |
| Hint/nudge logic | `docs/public/core-concepts.md` (Hints section) |

---

## Packages — UI & Content

### `packages/ui-library/` — Shared UI Components

| Source path | Docs affected |
|-------------|---------------|
| `packages/ui-library/src/` | Rarely affects user docs (internal UI) |

### `packages/content/` — Centralized Content

| Source path | Docs affected |
|-------------|---------------|
| `packages/content/src/` | May affect multiple docs (brand, pricing, copy changes) |

---

## Configuration & Infrastructure

| Source path | Docs affected |
|-------------|---------------|
| `.env` / `.env.example` | `docs/contributors/environment-configuration.md` |
| `package.json` (root) | `docs/contributors/quick-start.md` (commands) |
| `docker-compose.yml` | `docs/contributors/quick-start.md`, `docs/public/self-hosting.md` |
| `drizzle.config.ts` | `docs/contributors/quick-start.md` (database section) |
| `pnpm-workspace.yaml` | `docs/contributors/workspace-structure.md` |

---

## Documentation Files

| Source path | Docs affected |
|-------------|---------------|
| `.adr/` | Cross-reference with relevant public/contributor docs |
| `docs/_RUNNING_TECH_DEBT.md` | Standalone (no cross-references needed) |
| `.claude/rules/` | `docs/contributors/` (if dev workflow changes) |
| `.claude/CLAUDE.md` | Should stay in sync with `docs/contributors/workspace-structure.md` |

---

## Common Change Patterns

### New API Endpoint

1. Add route contract in `packages/api-contracts/`
2. Implement route in `apps/api/src/routes/`
3. **Docs**: Update `docs/public/api-reference.md` with new endpoint
4. **Docs**: Update `docs/public/code-examples.md` if usage example is helpful

### New Domain Entity or Concept

1. Add entity/port in `packages/domain/`
2. Add adapter in `packages/adapter-drizzle/`
3. Add service in `packages/services/`
4. **Docs**: Add to `docs/public/core-concepts.md`
5. **Docs**: Update `docs/contributors/workspace-structure.md` if new package

### New Scheduling Behavior

1. Change domain logic in `packages/domain/`
2. Update worker in `packages/worker-scheduler/`
3. **Docs**: Update `docs/public/technical/how-scheduling-works.md`
4. **Docs**: Update `docs/public/core-concepts.md` if new terminology
5. **Docs**: Consider ADR if this is an architectural decision

### New AI Feature

1. Update AI adapter in `packages/adapter-ai/`
2. Update planner in `packages/worker-ai-planner/`
3. **Docs**: Update `docs/public/technical/how-ai-adaptation-works.md`
4. **Docs**: Update `docs/public/core-concepts.md` if new concept
5. **Docs**: Update `docs/public/use-cases.md` if new use case enabled

### New MCP Tool

1. Add tool in `apps/mcp-server/src/tools/`
2. **Docs**: Update `docs/public/mcp-server.md` (Available Tools section)

### New Package or App

1. Create package/app in workspace
2. **Docs**: Update `docs/contributors/workspace-structure.md`
3. **Docs**: Update `.claude/CLAUDE.md` if it affects the project overview

### Configuration Change

1. Update `.env.example` or config loading
2. **Docs**: Update `docs/contributors/environment-configuration.md`
3. **Docs**: Update `docs/public/self-hosting.md` if user-facing
4. **Docs**: Update `docs/public/technical/configuration-and-constraints.md` if constraint

---

## Quick Search Commands

When you need to find docs related to a specific topic, use these search strategies:

```bash
# Find docs mentioning a specific feature
Grep pattern="surge.detection" path="docs/"

# Find all docs with specific tags
Grep pattern="tags:.*scheduling" path="docs/public/"

# Find docs referencing a specific package
Grep pattern="adapter-drizzle\|DrizzleJobsRepo" path="docs/"

# Find all API endpoint documentation
Grep pattern="POST\|GET\|PUT\|DELETE\|PATCH" path="docs/public/api-reference.md"

# Find all frontmatter with MCP metadata
Grep pattern="^mcp:" path="docs/public/"

# List all doc files sorted by modification time
Glob pattern="docs/**/*.md"
```
