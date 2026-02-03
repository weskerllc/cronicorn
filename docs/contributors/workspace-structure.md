# Workspace Structure

Cronicorn is organized as a pnpm monorepo with 8 apps and 13 packages. This guide helps you quickly locate code for specific features.

## Apps (8)

Deployable applications and services.

### `@cronicorn/api`
HTTP API server using Hono framework with OpenAPI/Swagger support and Better Auth authentication.
- **Tech**: Hono, Zod, Better Auth, Drizzle ORM
- **Port**: Configurable via env
- **Location**: `apps/api/`

### `@cronicorn/web`
Frontend web application built with React and TanStack Router.
- **Tech**: React 19, TanStack Router, Vite, Tailwind CSS 4
- **Dev**: Vite dev server with HMR
- **Location**: `apps/web/`

### `@cronicorn/scheduler-app`
Background worker that claims and executes scheduled job endpoints.
- **Tech**: Pino logging, Drizzle ORM, HTTP dispatcher
- **Purpose**: Main scheduling loop execution
- **Location**: `apps/scheduler/`

### `@cronicorn/ai-planner-app`
AI-powered worker that optimizes scheduling decisions using OpenAI.
- **Tech**: Vercel AI SDK, OpenAI provider
- **Purpose**: Adaptive scheduling intelligence
- **Location**: `apps/ai-planner/`

### `@cronicorn/docs`
Docusaurus-based documentation website.
- **Tech**: Docusaurus 3.9.2
- **Purpose**: Public and developer documentation
- **Location**: `apps/docs/`

### `@cronicorn/mcp-server`
Model Context Protocol server enabling AI agents to manage cron jobs.
- **Tech**: MCP SDK
- **Published**: Yes (public npm package)
- **Binary**: `cronicorn-mcp`
- **Location**: `apps/mcp-server/`

### `@cronicorn/migrator`
Database migration runner using Drizzle Kit.
- **Purpose**: Run migrations on startup or manually
- **Location**: `apps/migrator/`

### `@cronicorn/test-ai`
Test harness for AI integration experiments.
- **Purpose**: Development/testing only
- **Location**: `apps/test-ai/`

---

## Packages (13)

Shared libraries and adapters used by apps.

### Adapters (7)

Implement domain ports using external libraries/services.

#### `@cronicorn/adapter-ai`
AI SDK integration with mock support (MSW).
- **Location**: `packages/adapter-ai/`

#### `@cronicorn/adapter-cron`
Cron expression parsing using cron-parser.
- **Location**: `packages/adapter-cron/`

#### `@cronicorn/adapter-drizzle`
PostgreSQL database adapter with Drizzle ORM schema and repositories.
- **Location**: `packages/adapter-drizzle/`

#### `@cronicorn/adapter-http`
HTTP request dispatcher for endpoint execution.
- **Location**: `packages/adapter-http/`

#### `@cronicorn/adapter-pino`
Structured logging with Pino.
- **Location**: `packages/adapter-pino/`

#### `@cronicorn/adapter-stripe`
Stripe payment integration for subscriptions.
- **Location**: `packages/adapter-stripe/`

#### `@cronicorn/adapter-system-clock`
System clock implementation for production (vs fake clock for tests).
- **Location**: `packages/adapter-system-clock/`

### Core Domain (3)

#### `@cronicorn/domain`
Pure domain logic: ports, entities, policies, governor, scheduler (no external dependencies except Zod).
- **Location**: `packages/domain/`
- **Key**: All business rules live here

#### `@cronicorn/services`
Business logic layer: job management, scheduling services.
- **Location**: `packages/services/`

#### `@cronicorn/api-contracts`
OpenAPI contracts and Zod schemas for HTTP API routes (shared between API and Web).
- **Location**: `packages/api-contracts/`

### Workers (2)

#### `@cronicorn/worker-scheduler`
Core scheduling worker logic with simulation support.
- **Script**: `pnpm sim` runs deterministic scenarios
- **Location**: `packages/worker-scheduler/`

#### `@cronicorn/worker-ai-planner`
AI planner worker logic (orchestrates AI hints and nudges).
- **Location**: `packages/worker-ai-planner/`

### UI (1)

#### `@cronicorn/ui-library`
Shared React component library using shadcn/ui with Radix UI primitives.
- **Tech**: Tailwind CSS 4, Radix UI, React Hook Form, Recharts
- **Location**: `packages/ui-library/`

### Content (1)

#### `@cronicorn/content`
Centralized content: brand assets, pricing, FAQs, SEO metadata, business copy.
- **Exports**: Multiple subpaths (brand, pricing, docs, seo, etc.)
- **Location**: `packages/content/`

---

## Other folders

#### `/docs`
Central docs folder that is used by the docs app and mcp-server


## Key Architecture Notes

- **Monorepo**: pnpm workspaces with TypeScript project references
- **Build**: Packages build with `tsc`, apps use `tsx` (dev) or `tsc` (prod)
- **Env**: Single `.env` file at root, loaded via `dotenv-cli`
- **Testing**: Vitest with transaction-per-test pattern
- **Ports & Adapters**: Clean separation between domain and infrastructure

## Finding Code

| Looking for... | Check... |
|----------------|----------|
| API routes | `apps/api/src/routes/` |
| Database schema | `packages/adapter-drizzle/src/schema/` |
| Scheduling logic | `packages/domain/src/scheduler.ts` |
| UI components | `packages/ui-library/src/components/` |
| AI prompts | `packages/worker-ai-planner/src/` |
| HTTP dispatcher | `packages/adapter-http/` |
| Business logic | `packages/services/` |
