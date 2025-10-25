# Phase 3: Job Grouping and Execution Visibility

**Date:** 2025-01-14
**Status:** Accepted

## Context

Phase 3 required extending the scheduler to support:
1. **Job Grouping** - Organize endpoints under logical jobs for multi-tenancy
2. **Execution Visibility** - Track and query run history with source attribution
3. **AI-First Orchestration** - Support AI-driven coordination without explicit dependency graphs

Key design questions:
- Should `jobId` be required or optional on endpoints?
- How to track what triggered each run (baseline, AI hint, manual)?
- Should we store dependency graphs or let AI interpret natural language?
- How to handle type assertions and Drizzle's query builder types?

## Decision

### 1. Job-Endpoint Relationship
- Made `jobId` **optional** on `JobEndpoint` entity
- Nullable FK in database with cascade delete
- Empty string in domain converts to NULL in adapter layer
- Backward compatible: existing endpoints work without jobs

### 2. Run Source Tracking
- Added `source?: string` field to runs table
- Captured in `RunsRepo.create()` and exposed in `listRuns()`/`getRunDetails()`
- Enables answering "what triggered this run?" for debugging and AI learning

### 3. AI-First Orchestration (No Dependency Graph)
- **Removed** `tier` and `dependencyGraph` fields from initial design
- **Rationale**: AI can interpret natural language job descriptions better than rigid graph structures
- Jobs describe coordination needs in `description` field
- AI planner determines execution order dynamically per flash sale

### 4. Type Safety Fixes
- Removed type assertions by properly extending `StoredJob` type with `jobId?: string`
- Fixed Drizzle query builder types using fluent chaining (no reassignment)
- Converted empty string jobId to NULL in adapter to satisfy FK constraints

### 5. Phase 3.1 Scope (Data Layer Only)
Extended ports with 8 new methods:
- **JobsRepo**: `createJob`, `getJob`, `listJobs`, `updateJob`, `archiveJob`, `listEndpointsByJob`
- **RunsRepo**: `listRuns`, `getRunDetails`

Implemented in:
- `InMemoryJobsRepo`/`InMemoryRunsRepo` (moved to `domain/fixtures` for reuse)
- `DrizzleJobsRepo`/`DrizzleRunsRepo` (full PostgreSQL implementation)

## Consequences

### What Changed
1. **Schema** (migration `0000_happy_magneto.sql`):
   - Added `jobs` table (id, userId, name, description, status, timestamps)
   - Added `job_endpoints.job_id` nullable FK with cascade delete
   - Added `runs.source` text field for trigger tracking
   - Removed `tier` and `dependencyGraph` columns (not needed)

2. **Domain**:
   - `JobEndpoint.jobId` is now optional
   - New `Job` entity for grouping
   - Extended `JobsRepo` and `RunsRepo` ports
   - Test fixtures moved to `domain/fixtures` for cross-package reuse

3. **Adapters**:
   - Drizzle repos handle NULL jobId conversion
   - Drizzle query builder uses fluent chaining (no type assertions)
   - In-memory repos use `StoredJob` type for jobId tracking

### Tradeoffs
- ✅ **Pro**: Flexible AI orchestration without rigid dependency structures
- ✅ **Pro**: Backward compatible (existing endpoints unaffected)
- ✅ **Pro**: Rich execution visibility for debugging and AI learning
- ⚠️ **Con**: No database-enforced execution ordering (relies on AI)
- ⚠️ **Con**: Job coordination logic lives in AI planner (harder to audit)

### Next Steps (Phase 3.2+)
- Services layer: `JobsService` for job lifecycle + endpoint assignment
- API routes: CRUD for jobs, list endpoints by job, execution history
- AI planner integration: Use job descriptions for coordination
- Flash sale scenario testing with real AI-driven orchestration

### If We Reverse This
To revert to explicit dependency graphs:
1. Add back `tier` (integer) and `dependencyGraph` (JSONB) columns
2. Create migration to populate from job descriptions (AI-assisted)
3. Update governor to respect tier ordering
4. Add validation in `JobsService` to prevent cycles

## References
- Related to `.tasks/01-mvp.md` TASK-3.1 (Data Layer)
- Implements job grouping spec from `docs/domain-package-task-list.md`
- Follows hexagonal architecture from `.adr/0002-hexagonal-architecture-principles.md`
- AI orchestration philosophy documented in `docs/flash-sale-scenario.md`
