---
applyTo: '**'
---

# Architecture Overview

## High-Level Structure

```
apps/
  api/           # Hono HTTP API (entrypoints, routes, DI)
  scheduler/     # Background worker for job execution

packages/
  core-schemas/  # Domain models (business entities)
  contracts/     # API DTOs (Zod schemas for requests/responses)
  db-core/       # Drizzle tables + migrations
  feature-*/     # Vertical slices (ports/repos/managers)
  core-observability/  # Typed logger interface
```

## Dependency Flow

```
core-schemas ─┬─> db-core
              └─> contracts
                   │
db-core ───────────┤
                   v
feature-<slice>  ───────> apps (api, scheduler)
```

## Clean Architecture Layers

1. **Contracts (API/UI DTOs)** - HTTP request/response validation
2. **Managers (Business Logic)** - Orchestration and domain rules
3. **Repos (Data Access)** - Database operations only
4. **No circular dependencies** - Strict DAG enforced

## Key Patterns

- **Request-Scoped Transactions**: Every API route opens a transaction
- **Vertical Slices**: Each feature owns its complete stack
- **Port Interfaces**: Define contracts between layers
- **Pragmatic Typing**: Use DB types directly when domain models align

## Data Flow

1. HTTP Request → Zod validation (contracts)
2. Transaction opened → Scope created with bound repos
3. Manager orchestrates → Calls repo via port interface
4. DB operation → Results mapped back through layers
5. JSON response → Client

## Technology Stack

- **Framework**: Hono (HTTP) + Drizzle (ORM)
- **Language**: TypeScript with strict settings
- **Validation**: Zod schemas end-to-end
- **Testing**: Vitest with transaction-per-test
- **Build**: pnpm workspaces + TypeScript project refs</content>