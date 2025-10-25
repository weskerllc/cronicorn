# API Testing with Dependency Injection for Auth Mocking

**Date:** 2025-10-14
**Status:** Accepted

## Context

After implementing 17 API routes with OpenAPI schemas and handlers, we needed comprehensive integration tests. The primary challenge was that all routes are protected by Better Auth middleware, which performs OAuth validation and API key verification. Running real OAuth flows in tests would be:

1. Slow and brittle (external dependency on GitHub)
2. Complex to set up (requires test OAuth apps, secrets)
3. Non-deterministic (network issues, rate limits)
4. Expensive (CI/CD would hit external APIs repeatedly)

We considered three approaches:

**Option 1: Dependency Injection** - Add optional `authInstance` parameter to `createApp()`
- ✅ Clean separation, no test-specific code in production paths
- ✅ Production code unchanged (calls without param)
- ✅ Tests inject mock auth explicitly
- ❌ Requires refactoring createApp signature

**Option 2: Environment Variable Toggle** - Check `NODE_ENV === 'test'` to skip auth
- ❌ Test-specific branching in production code
- ❌ Risk of accidentally disabling auth in production
- ❌ Harder to test auth middleware itself

**Option 3: Test Database with Real Auth** - Seed test users and generate real sessions
- ❌ Still requires external OAuth setup
- ❌ Complex session management
- ❌ Slow tests (real crypto operations)

## Decision

Implement **Option 1: Dependency Injection** for auth mocking in API tests.

### Implementation

1. **Modified `createApp()` signature**:
   ```typescript
   export async function createApp(
     db: Database,
     config: Env,
     authInstance?: Auth  // ← Optional parameter
   ): Promise<AppOpenAPI>
   ```

2. **Created test helpers** (`apps/api/src/lib/__tests__/test-helpers.ts`):
   - `createTestDatabase()` - Returns DB with cleanup function
   - `createMockSession(userId, email?, name?)` - Generates realistic session objects
   - `createMockAuth(mockSession)` - Returns mock Better Auth with `getSession()` and `verifyApiKey()`

3. **Test pattern**:
   ```typescript
   const mockSession = createMockSession("test-user-1");
   const mockAuth = createMockAuth(mockSession);
   const app = await createApp(db, config, mockAuth);
   const res = await app.request("/api/jobs", { method: "POST", ... });
   ```

4. **Production unchanged**:
   ```typescript
   // index.ts - no changes needed
   const app = await createApp(db, config);  // Uses real auth
   ```

### Test Coverage Achieved

- **21 integration tests** covering all 17 routes
- **97.29%** statement coverage on `app.ts`
- **82.74%** statement coverage on routes layer
- **Transaction-per-test** pattern for database isolation
- **403ms** total test execution time

## Consequences

### Positive

1. **Fast tests**: No external OAuth calls, all tests run in <1s
2. **Deterministic**: Mock sessions are predictable, no flaky tests
3. **Production safety**: No test-specific code paths in production
4. **Flexible mocking**: Can easily test different user scenarios (different userIds, permissions)
5. **Minimal refactoring**: Only one function signature changed
6. **Clear separation**: Test code lives in `__tests__/` directories

### Negative

1. **Not testing real auth**: Mock auth bypasses actual OAuth flow
   - Mitigated by: Auth middleware itself is covered by its own unit tests
   - Mitigated by: E2E tests (future) will use real auth

2. **Additional parameter**: `createApp()` now has optional third param
   - Mitigated by: Parameter is optional, production code works unchanged
   - Mitigated by: TypeScript enforces correct usage

3. **Mock maintenance**: If Better Auth API changes, mocks need updates
   - Mitigated by: Test helpers are centralized in one file
   - Mitigated by: TypeScript will catch signature mismatches

### Code Affected

**Modified:**
- `apps/api/src/app.ts` - Added optional `authInstance?: Auth` parameter

**Created:**
- `apps/api/src/lib/__tests__/test-helpers.ts` - Test utilities
- `apps/api/src/routes/jobs/__tests__/jobs.api.test.ts` - 21 integration tests

**Unchanged:**
- `apps/api/src/index.ts` - Production entry point
- All route handlers and schemas
- Better Auth configuration

### Future Considerations

1. **E2E Tests**: Add separate E2E suite that tests full OAuth flow with real GitHub
2. **Shared Test Utilities**: If other apps (MCP server, CLI) need similar patterns, extract to `packages/test-utils`
3. **Auth Middleware Tests**: Add dedicated tests for `requireAuth` middleware itself
4. **API Key Testing**: Add tests for API key authentication path (currently only testing OAuth session path)

## References

- Task: TASK-4.0 (Phase 4: Testing)
- Related ADR: [0011-dual-auth-implementation.md](.adr/0011-dual-auth-implementation.md)
- Related ADR: [0014-api-composition-root-refactoring.md](.adr/0014-api-composition-root-refactoring.md)
