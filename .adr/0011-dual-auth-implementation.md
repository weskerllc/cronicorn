# ADR-0011: Dual Authentication Implementation with Better Auth

**Date:** 2025-10-13  
**Status:** Accepted

## Context

The API server needs to support two authentication methods:
1. **OAuth sessions** for web UI users (GitHub login)
2. **API keys** for service-to-service authentication (programmatic access)

We chose Better Auth (v1.3.27) as our authentication provider because:
- Built-in support for both OAuth and API key authentication
- Drizzle ORM adapter (matches our database layer)
- Type-safe API with TypeScript support
- Active maintenance and good documentation

### Initial Confusion: Database Adapter Configuration

Our first implementation attempt failed because we passed the wrong type to Better Auth:

```typescript
// ❌ WRONG - Passing raw Pool instead of Drizzle instance
const auth = betterAuth({
  database: {
    provider: "postgres",
    pool: db.$client, // This is a raw pg.Pool
  },
});
```

**Root cause**: Better Auth's Drizzle adapter needs the Drizzle instance, not the underlying connection pool. The Pool-based configuration is for Kysely adapter, not Drizzle.

**Error encountered**: `[BetterAuthError: Failed to initialize database adapter]`

**Fix**:
```typescript
// ✅ CORRECT - Using drizzleAdapter with Drizzle instance
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // ... rest of config
});
```

## Decision

### 1. Authentication Architecture

Implemented unified middleware (`requireAuth`) that checks both authentication methods with clear precedence:

1. **First**: Check for OAuth session cookie (automatic via Better Auth)
2. **Second**: Check for `x-api-key` header (manual validation)
3. **Fail**: Return 401 Unauthorized

### 2. OAuth Session Flow

```typescript
// Try OAuth session first (automatic from cookie)
const sessionResult = await auth.api.getSession({ headers: c.req.raw.headers });

if (sessionResult?.user) {
  c.set("session", sessionResult);
  c.set("userId", sessionResult.user.id);
  return next();
}
```

**Benefits**:
- Better Auth handles all session management (creation, validation, expiry)
- Full user object available (id, email, name, image)
- Automatic cookie handling (httpOnly, secure, sameSite)

### 3. API Key Authentication - Optimized Implementation

**Initial approach** (abandoned): Query database for full user details after key validation
```typescript
// ❌ Too expensive - DB query on every API key request
const userResult = await db.query.user.findFirst({
  where: (user, { eq }) => eq(user.id, userId),
});
```

**Final approach** (optimized): Only store `userId`, skip user details
```typescript
// ✅ Fast - No extra DB queries
const apiKeyResult = await auth.api.verifyApiKey({
  body: { key: apiKeyHeader },
});

if (apiKeyResult?.valid && apiKeyResult.key) {
  c.set("userId", apiKeyResult.key.userId);
  c.set("session", null); // API key auth doesn't have traditional session
  return next();
}
```

**Rationale**:
- API key validation already confirms the key belongs to a valid user
- For authorization checks, we only need `userId` (which we already have)
- Full user details (email, name) are only needed for UI display (not API-to-API calls)
- Eliminates ~1 DB query per API key request (significant performance gain)
- Better Auth's rate limiting (100 req/min) provides protection without extra queries

### 4. Route Protection Pattern

Applied authentication at the router level using path-specific middleware:

```typescript
// apps/api/src/jobs/jobs.index.ts
const router = createRouter();

// Protect all /jobs routes with auth
router.use("/jobs/*", async (c, next) => {
  const auth = c.get("auth");
  return requireAuth(auth)(c, next);
});

router.openapi(routes.create, handlers.create);
```

**Public routes** (no authentication):
- `/api/health` - Health check
- `/api/reference` - OpenAPI documentation
- `/api/doc` - OpenAPI spec JSON
- `/api/auth/**` - Better Auth OAuth flows

**Protected routes** (authentication required):
- `/api/jobs/*` - All job management endpoints

### 5. Context Management

Added `auth` to app-wide context (alongside `jobsManager`):

```typescript
// apps/api/src/types.ts
export type AppBindings = {
  Variables: {
    jobsManager: JobsManager;
    auth: Auth;
    // Set by requireAuth middleware
    session?: AuthContext["session"];
    userId?: string;
  };
  // ... rest
};

// apps/api/src/app.ts
app.use("*", async (c, next) => {
  c.set("jobsManager", jobsManager);
  c.set("auth", auth); // Available to all routes
  await next();
});
```

**Benefits**:
- Auth instance available to all routes
- No prop drilling through middleware stack
- Type-safe access via context bindings

### 6. Better Auth Configuration

```typescript
// apps/api/src/auth/config.ts
export function createAuth(config: Env, db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    socialProviders: {
      github: {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      apiKey({
        apiKeyHeaders: "x-api-key",
        rateLimit: {
          enabled: true,
          timeWindow: 60 * 1000, // 1 minute
          maxRequests: 100,
        },
      }),
    ],
  });
}
```

**Configuration notes**:
- Drizzle adapter properly configured with `provider: "pg"`
- GitHub OAuth as first social provider (more can be added)
- API key plugin with built-in rate limiting (100 requests/minute)
- Better Auth automatically creates required tables via Drizzle adapter

## Consequences

### Positive

1. **Dual auth support**: Single middleware handles both OAuth and API keys
2. **Performance optimized**: Zero extra DB queries for API key auth
3. **Developer experience**: Type-safe context access, clear error messages
4. **Security**: Built-in rate limiting, proper session management, httpOnly cookies
5. **Flexibility**: Easy to add more OAuth providers (Google, Microsoft, etc.)
6. **Scalability**: API key auth optimized for high-throughput service-to-service calls
7. **Clean architecture**: Middleware separated from business logic

### Tradeoffs

1. **API key sessions are minimal**: 
   - Only `userId` available (no email/name)
   - Routes needing full user details would need separate query
   - **Accepted**: API-to-API calls rarely need display info

2. **Session type mismatch**:
   - OAuth: Full `AuthSession` object
   - API key: `session = null`, only `userId` set
   - **Mitigation**: `getAuthContext()` helper validates presence of `userId`

3. **Auth library coupling**:
   - Tightly coupled to Better Auth's API
   - **Accepted**: Better Auth is well-maintained, migration would be major refactor anyway

4. **Manual API key session construction**:
   - Better Auth doesn't auto-create sessions for API keys
   - **Accepted**: Simple implementation, clear separation of concerns

### Code Affected

**New files**:
- `apps/api/src/auth/config.ts` - Better Auth configuration
- `apps/api/src/auth/middleware.ts` - Unified auth middleware
- `apps/api/src/auth/types.ts` - Auth context types

**Modified files**:
- `apps/api/src/app.ts` - Added auth to context, mounted auth routes
- `apps/api/src/types.ts` - Added auth to AppBindings Variables
- `apps/api/src/jobs/jobs.index.ts` - Applied requireAuth middleware

**Database schema** (Better Auth managed):
- `user` - User accounts (created by OAuth or API key)
- `session` - OAuth sessions
- `account` - OAuth provider links (GitHub, etc.)
- `verification` - Email verification tokens

### Future Considerations

1. **Additional OAuth providers**: Easy to add (Google, Microsoft, etc.)
2. **API key management UI**: Need endpoints for create/list/revoke API keys
3. **User profile endpoints**: GET/PATCH `/api/users/me` for OAuth users
4. **Webhook signatures**: Consider adding HMAC signature validation for webhooks
5. **Audit logging**: Log auth events (login, API key usage) for security monitoring
6. **Multi-tenancy**: `tenantId` field exists but not yet utilized in auth flow

## References

- Better Auth documentation: https://www.better-auth.com/docs
- Drizzle adapter guide: https://www.better-auth.com/docs/concepts/database
- Tech debt log: `docs/_RUNNING_TECH_DEBT.md` (API Auth Middleware section)
