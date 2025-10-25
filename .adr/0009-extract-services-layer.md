# Extract Services Layer to Separate Workspace

**Date:** 2025-01-13
**Status:** Accepted

## Context

After implementing the JobsManager to separate business logic from HTTP routes, we identified that this manager layer should be reusable across multiple interface layers (HTTP API, MCP server, CLI tools). Currently, the manager lives in `apps/api/src/jobs/`, tightly coupling it to the API application despite being framework-agnostic.

We have a concrete near-term use case: building an MCP (Model Context Protocol) server adapter that will allow AI agents to interact with our scheduling service. This MCP server will need the same job creation logic currently in JobsManager, leading to either:
1. Code duplication (copy manager to MCP server)
2. Awkward cross-app imports (MCP imports from API app)
3. Extracting to shared package (this ADR)

### Current Structure
```
apps/api/
  src/
    jobs/
      manager.ts          ← Business logic (framework-agnostic)
      routes.ts           ← HTTP layer (Hono-specific)
      schemas.ts          ← API DTOs (Zod validation)
```

### Problem
- Manager is framework-agnostic but lives in HTTP-specific app
- Cannot be reused by MCP server without awkward dependencies
- Tests are split between API concerns and business logic
- `Database` type coupling to API's db configuration

## Decision

Extract the manager layer into a new `packages/services` workspace that is:
1. **Framework-agnostic** - No HTTP, Hono, or API-specific dependencies
2. **Reusable** - Can be consumed by any interface layer (HTTP, MCP, CLI)
3. **Independently testable** - Business logic tests without HTTP mocking
4. **Domain-focused** - Orchestrates domain entities and adapters

### New Structure
```
packages/services/
  src/
    jobs/
      manager.ts              # JobsManager (business logic)
      types.ts                # Service interfaces (TransactionProvider, CreateJobInput)
      index.ts
    __tests__/
      jobs/
        manager.test.ts       # Pure business logic tests

apps/api/
  src/
    jobs/
      routes.ts               # HTTP layer only (imports from services)
      schemas.ts              # Zod DTOs for HTTP validation
      index.ts
    __tests__/
      jobs/
        routes.test.ts        # HTTP integration tests

apps/mcp-server/ (future)
  src/
    tools/
      jobs.ts                 # MCP tools (imports from services)
```

### Dependency Tree
```
@cronicorn/services (new package)
  ├── @cronicorn/domain (entities, ports)
  ├── @cronicorn/adapter-cron
  ├── @cronicorn/adapter-drizzle
  ├── @cronicorn/adapter-system-clock
  └── nanoid

@cronicorn/api (app)
  ├── @cronicorn/services ← imports manager from here
  ├── hono, better-auth (HTTP-specific)
  └── @cronicorn/adapter-drizzle (for db setup)

@cronicorn/mcp-server (future app)
  ├── @cronicorn/services ← reuses same manager
  ├── @modelcontextprotocol/sdk (MCP-specific)
  └── @cronicorn/adapter-drizzle (for db setup)
```

## Key Architectural Changes

### 1. Abstract Database Dependency

**Problem:** Manager currently depends on `Database` type from `apps/api/src/lib/db.ts`

**Solution:** Define abstract `TransactionProvider` interface in services

```typescript
// packages/services/src/types.ts
export interface TransactionProvider {
  transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface TransactionContext {
  // Minimal interface needed for repository operations
  // Each app provides concrete Drizzle implementation
}
```

This makes services truly framework-agnostic while each app (API, MCP) provides the concrete Drizzle implementation.

### 2. Service Contracts

Services define plain TypeScript input/output types:
```typescript
// Service input (not Zod schema)
export type CreateJobInput = {
  name: string;
  baselineCron?: string;
  baselineIntervalMs?: number;
  // ... other fields
};
```

API layer maps between:
- HTTP DTOs (Zod schemas) ↔ Service inputs
- Service outputs ↔ HTTP responses

### 3. Clear Responsibilities

**Services Layer:**
- Business logic orchestration
- Domain entity construction
- Transaction management
- Repository coordination
- Adapter composition

**API Layer:**
- HTTP request/response handling
- Authentication/authorization
- DTO validation (Zod)
- Status code mapping
- Error serialization

**MCP Layer (future):**
- MCP tool definitions
- Parameter validation
- Result serialization
- Tool orchestration

## Consequences

### Positive

1. **Reusability**: Same business logic for HTTP API, MCP server, CLI, workers
2. **Testability**: Services tested without HTTP framework (faster, simpler)
3. **Separation**: Clear boundaries between interface and business logic
4. **Independence**: Services package can be versioned independently
5. **Discoverability**: Clear where business logic lives (`packages/services`)
6. **Forces abstraction**: Database coupling must be properly abstracted

### Negative

1. **More files**: Logic split across packages (small overhead)
2. **Indirection**: One more hop from route → service → repository
3. **Initial setup**: Need to create package structure and abstractions
4. **Type complexity**: TransactionProvider abstraction adds type layer

### Neutral

1. **Migration effort**: ~2-3 files to move, interface to define (manageable)
2. **Testing**: Total test count same, just reorganized by concern
3. **Documentation**: Need to update architecture docs

## Implementation Plan

1. **Create services package structure**
   - `packages/services/package.json`
   - `packages/services/tsconfig.json`
   - `packages/services/src/` directory

2. **Define abstractions**
   - `TransactionProvider` interface
   - `CreateJobInput` type
   - Export types from `src/types.ts`

3. **Move manager and tests**
   - Move `manager.ts` to `packages/services/src/jobs/`
   - Update imports to use `TransactionProvider`
   - Move `manager.test.ts` to `packages/services/src/__tests__/jobs/`

4. **Update API**
   - Add `@cronicorn/services` dependency
   - Update routes to import from services
   - Implement `TransactionProvider` with Drizzle
   - Verify all tests pass

5. **Document**
   - Update architecture documentation
   - Add inline comments about abstraction boundaries
   - Document in tech debt log

## References

- Related task: TASK-3 (Create JobsManager service layer)
- Related task: TASK-4 (Refactor routes.ts to use JobsManager)
- Future enabler: MCP server implementation
- Architecture pattern: Hexagonal architecture (ports & adapters)

## Notes

This decision aligns with:
- Hexagonal architecture principles (interface adapters separate from application core)
- SOLID principles (Single Responsibility, Dependency Inversion)
- DRY principle (Don't Repeat Yourself across API and MCP)
- Our core principle: "Prefer boring, proven solutions" (service layer is standard)

The extraction is justified by a concrete near-term use case (MCP server) rather than speculative future needs.
