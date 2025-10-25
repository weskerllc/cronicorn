# Endpoint Deletion Implementation

**Date:** 2025-10-14
**Status:** Accepted

## Context

The service layer had a TODO placeholder for deleting endpoints. Users need the ability to remove endpoints they no longer need, but this operation must be properly authorized and integrated across the entire hexagonal architecture stack (domain ports, adapters, and service layer).

The existing codebase had:
- A `deleteEndpoint` method in `JobsManager` that threw "not yet implemented"
- No `deleteEndpoint` method in the `JobsRepo` port interface
- No implementations in the repository adapters

## Decision

Implemented full endpoint deletion capability following hexagonal architecture principles:

### 1. Port Definition (Domain)
Added `deleteEndpoint: (id: string) => Promise<void>` to the `JobsRepo` interface in `packages/domain/src/ports/repos.ts`.

**Rationale**: Keep the port simple - deletion by ID is the most straightforward contract. No return value needed since authorization happens in the service layer.

### 2. Repository Implementations

**In-Memory Repository** (`packages/domain/src/fixtures/in-memory-jobs-repo.ts`):
- Removes endpoint from the internal Map
- Throws error if endpoint doesn't exist for consistency

**Drizzle Repository** (`packages/adapter-drizzle/src/jobs-repo.ts`):
- Executes SQL `DELETE FROM job_endpoints WHERE id = ?`
- Optimistically assumes success (consistent with other Drizzle repo methods)

### 3. Service Layer

**JobsManager** (`packages/services/src/jobs/manager.ts`):
- Authorization check FIRST via `getEndpoint(userId, endpointId)` 
- Returns null if user doesn't own endpoint → throws "Endpoint not found or unauthorized"
- Only delegates to repo after authorization passes

**Testing**:
- Added 2 comprehensive tests covering both success and authorization failure cases
- Mocked the `deleteEndpoint` port method in test setup

## Consequences

### Positive
- ✅ **Complete CRUD**: Endpoints now support full lifecycle (Create, Read, Update, Delete)
- ✅ **Authorization enforced**: Users can only delete their own endpoints
- ✅ **Clean architecture**: Zero coupling between layers - service depends only on port
- ✅ **Testable**: Pure DI makes mocking trivial (18/18 tests passing)
- ✅ **Consistent patterns**: Follows same authorization-then-delegate pattern as other operations

### Tradeoffs
- **Hard delete**: Endpoints are permanently removed, not soft-deleted/archived
  - Alternative considered: Add `status: "deleted"` field and filter queries
  - Decision: Hard delete is simpler for Phase 3; soft delete can be added later if audit requirements emerge
  
- **No cascade behavior**: Deleting an endpoint does NOT delete associated run history
  - Rationale: Run history is valuable audit data; keep it for analytics/debugging
  - Future: Could add a `deletedAt` timestamp to endpoints and filter UI views

- **No batch delete**: One endpoint at a time
  - Could add `deleteEndpointsByJob(jobId)` if bulk deletion is needed
  - For now, API can loop if needed

### Affected Code
- `packages/domain/src/ports/repos.ts` - Added port method
- `packages/domain/src/fixtures/in-memory-jobs-repo.ts` - In-memory implementation  
- `packages/adapter-drizzle/src/jobs-repo.ts` - PostgreSQL implementation
- `packages/services/src/jobs/manager.ts` - Service layer implementation
- `packages/services/src/jobs/__tests__/manager.test.ts` - Test coverage

### Future Considerations
If we need to reverse this decision:
1. Change from hard delete to soft delete by adding `deletedAt: Date | null` field
2. Update all queries to filter `WHERE deleted_at IS NULL`
3. Rename method to `archiveEndpoint` for clarity
4. Add `restoreEndpoint` for undelete functionality

## References
- Related to TASK-3.2 (Service Layer Implementation)
- Follows patterns from ADR-0009 (Services Layer Extraction)
- Implements deletion for entities from ADR-0012 (Phase 3 Job Grouping)
