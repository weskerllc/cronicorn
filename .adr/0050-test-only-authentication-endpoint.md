# Test-Only Authentication Endpoint for E2E Tests

**Date:** 2025-11-20  
**Status:** Accepted

## Context

Our application uses Better Auth for authentication with a default admin user seeded with known credentials (zero-config approach). Playwright E2E tests need to authenticate frequently, but filling out the login form for every test is:

1. **Slow** - Each login requires page navigation, form interaction, and waiting
2. **Brittle** - Login form changes break all authenticated tests
3. **Repetitive** - Every test file needs the same login boilerplate
4. **Verbose** - Tests focus on login mechanics rather than actual features

Industry-standard solutions for test authentication include:
- **Storage state reuse** - Save authenticated state once, reuse across tests
- **Backdoor endpoints** - Special test-only endpoints that bypass normal auth
- **Magic tokens** - Special authentication tokens for test environments
- **Session injection** - Directly manipulate session storage

We needed a solution that:
- Has minimal code footprint
- Introduces no security vulnerabilities in production
- Works seamlessly with our existing Better Auth setup
- Requires no UI changes
- Is simple to use in tests

## Decision

We implemented a **test-only authentication endpoint** at `/api/test/auth/login` that:

1. **Creates real authenticated sessions** using Better Auth's sign-in flow
2. **Only works in non-production** environments (`NODE_ENV !== 'production'`)
3. **Uses existing admin credentials** from environment variables
4. **Returns session cookies** that Playwright automatically uses
5. **Logs all access** for debugging and security monitoring

### Implementation Details

**Endpoint Structure:**
- Path: `POST /api/test/auth/login`
- Returns: `{ success: true, message: "..." }` with session cookies
- Protected by: Middleware that checks `NODE_ENV !== 'production'`
- Error handling: Returns 403 in production, 503 if admin not configured

**Playwright Helper:**
```typescript
// fixtures/auth.ts
export async function authenticateAsAdmin(page: Page): Promise<void> {
  const response = await page.request.post(`${apiUrl}/api/test/auth/login`);
  // Cookies automatically stored by Playwright
}
```

**Usage in Tests:**
```typescript
test("authenticated feature", async ({ page }) => {
  await authenticateAsAdmin(page);
  await page.goto("/dashboard");
  // Test authenticated features...
});
```

### Security Measures

1. **Production Guard**: Middleware blocks access when `NODE_ENV=production`
2. **Clear Logging**: All attempts to access endpoint are logged with timestamps
3. **No New Dependencies**: Uses existing Better Auth infrastructure
4. **Explicit Warning**: Console warns when endpoint is enabled (non-production)
5. **Test Coverage**: Comprehensive tests verify production blocking works

## Consequences

### Positive

✅ **Fast Tests** - Authentication takes milliseconds instead of seconds  
✅ **Cleaner Tests** - One line of code vs. complex form interactions  
✅ **Less Brittle** - Tests don't break when login UI changes  
✅ **Better DX** - Simple, discoverable API for test authors  
✅ **Zero Production Impact** - Completely disabled in production  
✅ **Minimal Code** - ~150 lines total (endpoint + helper + tests)  

### Negative

⚠️ **Development Exposure** - Endpoint available in dev/test environments (acceptable tradeoff)  
⚠️ **Documentation Burden** - Need to keep README up-to-date with usage  

### Files Changed

- **New Files:**
  - `apps/api/src/routes/test-auth/test-auth.routes.ts` - Route definition
  - `apps/api/src/routes/test-auth/test-auth.handlers.ts` - Implementation
  - `apps/api/src/routes/test-auth/test-auth.index.ts` - Router + middleware
  - `apps/api/src/routes/test-auth/__tests__/test-auth.api.test.ts` - Tests
  - `apps/e2e/fixtures/auth.ts` - Playwright helper
  - `apps/e2e/tests/authenticated-dashboard.spec.ts` - Example test

- **Modified Files:**
  - `apps/api/src/app.ts` - Register test-auth routes
  - `apps/e2e/README.md` - Document auto-login usage
  - `.adr/0050-test-only-authentication-endpoint.md` - This ADR

### Future Considerations

If we later need to:
- **Add more test users**: Extend endpoint to accept user parameters
- **Support different auth methods**: Create separate endpoints for OAuth, API keys, etc.
- **Use in integration tests**: The API endpoint works for any HTTP client
- **Disable completely**: Remove the route registration in `app.ts`

The implementation is intentionally simple and focused on the 80% use case (admin user authentication). We can extend it later if needed without breaking existing tests.

## Alternatives Considered

1. **Storage State Reuse** - Save cookies once, reuse across tests
   - ❌ Complex setup/teardown
   - ❌ State pollution between tests
   - ❌ Hard to debug when state becomes invalid

2. **Magic Authentication Token** - Special header that bypasses auth
   - ❌ Doesn't test real authentication flow
   - ❌ Creates parallel authentication system
   - ❌ More code to maintain

3. **Direct Session Injection** - Manipulate browser storage directly
   - ❌ Tightly coupled to Better Auth internals
   - ❌ Breaks when auth implementation changes
   - ❌ Requires knowledge of cookie structure

4. **Keep Using Manual Login** - Fill out login form in every test
   - ❌ Slow
   - ❌ Brittle
   - ❌ Poor developer experience

## References

- Better Auth documentation: https://www.better-auth.com
- Playwright authentication guide: https://playwright.dev/docs/auth
- Industry patterns: Auth0, Firebase, Supabase all provide test-mode endpoints
