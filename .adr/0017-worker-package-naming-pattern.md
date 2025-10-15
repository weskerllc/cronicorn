# Worker Package Naming Pattern

**Date:** 2025-10-15  
**Status:** Accepted

## Context

During AI Planner implementation, we discovered an architectural inconsistency:
- Scheduler worker code lived in `packages/scheduler`
- AI Planner service code initially placed in `packages/services/scheduling`

This created confusion about package organization:
- **Where do worker-specific orchestration services belong?**
- **What distinguishes `services` from worker orchestration code?**
- **How should we name packages for consistency?**

The `services` package was created (ADR-0009) for framework-agnostic business logic consumed by multiple entry points (API, MCP, CLI). However, AI Planner is **worker-specific orchestration** - not reusable by API/MCP/CLI.

**Key distinction identified:**
- **services**: User-facing, reusable business logic (JobsManager for CRUD operations)
- **worker orchestration**: Background worker-specific coordination (Scheduler, AIPlanner)

We already had a naming pattern for infrastructure (`adapter-*`), but no pattern for workers.

## Decision

**Establish `worker-*` prefix for background worker orchestration packages.**

### Package Structure

```
packages/
  domain/                    # Pure algorithms + ports
  worker-ai-planner/         # AI planner orchestration ✅ NEW
  scheduler/                 # Scheduler orchestration (consider renaming to worker-scheduler)
  services/                  # User-facing business logic (JobsManager)
  adapter-ai/                # AI SDK adapter
  adapter-cron/              # Cron parsing adapter
  adapter-drizzle/           # Database adapter
  adapter-http/              # HTTP client adapter
  adapter-system-clock/      # System clock adapter

apps/
  scheduler/                 # Scheduler composition root
  ai-planner/                # AI planner composition root
  api/                       # API composition root
```

### Naming Convention Rules

| Package Type | Prefix | Purpose | Examples |
|---|---|---|---|
| **Domain** | `domain` | Pure algorithms, port interfaces | domain |
| **Workers** | `worker-*` | Background worker orchestration | worker-ai-planner, (worker-scheduler) |
| **Services** | `services` | User-facing reusable business logic | services (JobsManager) |
| **Adapters** | `adapter-*` | Infrastructure implementations | adapter-drizzle, adapter-ai |
| **Apps** | (no prefix) | Composition roots | scheduler, api, web |

### Changes Made

1. **Created `packages/worker-ai-planner`**:
   - Moved AI planner logic from `packages/services/scheduling`
   - Files: `planner.ts`, `tools.ts`, `index.ts`
   - Tests: `__tests__/planner.test.ts`, `__tests__/tools.test.ts`
   - Package name: `@cronicorn/worker-ai-planner`

2. **Updated `apps/ai-planner`**:
   - Changed dependency from `@cronicorn/services` to `@cronicorn/worker-ai-planner`
   - Updated import: `from "@cronicorn/worker-ai-planner"`

3. **Removed `packages/services/src/scheduling`**:
   - Deleted directory entirely
   - Services package now only contains user-facing logic (JobsManager)

4. **Updated root `tsconfig.json`**:
   - Added `worker-ai-planner` to project references

## Consequences

### Positive

✅ **Clear architectural boundaries**: Worker orchestration vs user-facing services  
✅ **Consistent naming**: Matches `adapter-*` pattern for infrastructure  
✅ **Self-documenting**: Package name reveals deployment context  
✅ **Prevents confusion**: Future workers will follow established pattern  
✅ **Package cohesion**: Each package has single, clear responsibility  
✅ **Reusability clarity**: Easy to identify what's meant for reuse vs workers

### Neutral

⚠️ **Scheduler package inconsistency**: `packages/scheduler` doesn't follow `worker-*` pattern  
- Could rename to `worker-scheduler` for full consistency
- Deferring to avoid churn; acceptable grandfathered exception
- All new workers will use `worker-*` prefix

⚠️ **Import path changes**: AI planner imports changed during refactoring  
- One-time migration cost
- Caught by TypeScript compiler (no silent breakage)

### Negative

None identified. All 113 tests pass, Docker build succeeds.

## References

- **Related ADRs**: 
  - ADR-0009: Extract Services Layer (established `services` for reusable logic)
  - ADR-0018: Decoupled AI Worker Architecture (worker communication pattern)
- **Tasks**: Phase 2-3 of AI Worker implementation (docs/TODO.md)
- **Sequential Thinking Analysis**: 15 thoughts documented in conversation analyzing package organization

## Implementation Notes

**Files Modified:**
- Created `packages/worker-ai-planner/` directory structure
- Created `packages/worker-ai-planner/package.json`
- Created `packages/worker-ai-planner/tsconfig.json`
- Created `packages/worker-ai-planner/README.md`
- Created `packages/worker-ai-planner/src/planner.ts` (moved from services)
- Created `packages/worker-ai-planner/src/tools.ts` (moved from services)
- Created `packages/worker-ai-planner/src/index.ts`
- Created `packages/worker-ai-planner/src/__tests__/planner.test.ts` (6 tests)
- Created `packages/worker-ai-planner/src/__tests__/tools.test.ts` (10 tests)
- Updated `apps/ai-planner/src/index.ts` (import path)
- Updated `apps/ai-planner/package.json` (dependency)
- Updated `apps/ai-planner/tsconfig.json` (project reference)
- Updated `tsconfig.json` (added worker-ai-planner reference)
- Deleted `packages/services/src/scheduling/` directory

**Validation:**
- ✅ All tests pass: 113/113 (including 16 AI planner tests)
- ✅ TypeScript build succeeds: `pnpm build`
- ✅ Docker build succeeds: `docker compose build ai-planner`
- ✅ Test coverage maintained:
  - `planner.ts`: 100% statements, 86.66% branches
  - `tools.ts`: 100% statements, 93.33% branches

**Future Consideration:**
If renaming `packages/scheduler` to `packages/worker-scheduler`:
1. Update package name in package.json
2. Update all imports across apps/scheduler, packages/services
3. Update root tsconfig.json references
4. Update Docker Compose service names
5. Update documentation

Pattern is established - can apply retroactively when convenient.
