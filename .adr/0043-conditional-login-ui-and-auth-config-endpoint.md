# Conditional Login UI and Auth Config Endpoint

**Date:** 2024-11-04
**Status:** Accepted

## Context

After implementing dual authentication (admin email/password + GitHub OAuth) in ADR-0011, we needed a way for the login UI to dynamically adapt based on which authentication methods are enabled. This ADR documents the complete authentication system implementation including:

1. **Admin User Authentication** - Email/password authentication for self-hosting, CI/CD, and local development
2. **GitHub OAuth Integration** - Social authentication for production deployments
3. **Dynamic Login UI** - Conditional rendering based on enabled authentication methods
4. **Auth Config Endpoint** - Public API to expose available authentication methods

### Challenges Addressed

1. **Dynamic Configuration**: The web app needs to know which auth methods are available without hardcoding assumptions
2. **User Experience**: Users should only see login options that are actually enabled
3. **Self-Hosting Flexibility**: Different deployments may enable different combinations (admin-only, GitHub-only, or both)
4. **Security**: The config endpoint must be public (no auth required) since users aren't authenticated yet
5. **Instant Setup**: Enable local development without requiring external OAuth providers
6. **CI/CD Friendly**: Automated testing without OAuth configuration complexity
7. **Zero Breaking Changes**: Backward compatible with existing GitHub OAuth deployments

The previous implementation showed both login methods unconditionally, which was confusing when only one method was configured.

## Decision

This implementation consists of five major components that work together to provide a flexible, dual-authentication system:

### 1. Configuration System with Validation

**File**: `apps/api/src/lib/config.ts`

Made GitHub OAuth credentials optional and added admin user configuration:

```typescript
// GitHub OAuth (optional - only required if admin user is not configured)
GITHUB_CLIENT_ID: z.string().optional(),
GITHUB_CLIENT_SECRET: z.string().optional(),

// Admin User (optional - for CI/testing environments without OAuth)
ADMIN_USER_EMAIL: z.string().email().optional(),
ADMIN_USER_PASSWORD: z.string().min(8).optional(),
ADMIN_USER_NAME: z.string().default("Admin User"),
```

**Validation Logic**: Ensures at least one authentication method is configured:

```typescript
const hasGitHubOAuth = !!(parsed.GITHUB_CLIENT_ID && parsed.GITHUB_CLIENT_SECRET);
const hasAdminUser = !!(parsed.ADMIN_USER_EMAIL && parsed.ADMIN_USER_PASSWORD);

if (!hasGitHubOAuth && !hasAdminUser) {
  throw new Error(
    "At least one authentication method must be configured:\n" +
    "- GitHub OAuth: Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET\n" +
    "- Admin User: Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD"
  );
}
```

### 2. Better Auth Integration with Conditional Plugins

**File**: `apps/api/src/auth/config.ts`

Better Auth is configured to enable authentication plugins based on environment variables:

```typescript
export function createAuth(config: Env, db: Database) {
  // Determine which authentication methods are enabled
  const hasGitHubOAuth = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
  const hasAdminUser = !!(config.ADMIN_USER_EMAIL && config.ADMIN_USER_PASSWORD);

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],
    
    // Email/Password auth enabled if admin user is configured
    emailAndPassword: hasAdminUser
      ? {
          enabled: true,
          requireEmailVerification: false, // Skip verification for admin users
        }
      : undefined,
    
    // GitHub OAuth enabled only if credentials are provided
    socialProviders: hasGitHubOAuth
      ? {
          github: {
            clientId: config.GITHUB_CLIENT_ID!,
            clientSecret: config.GITHUB_CLIENT_SECRET!,
            redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
          },
        }
      : undefined,
    
    plugins: [
      bearer(),  // Bearer tokens for AI agents
      apiKey(),  // API keys for service-to-service
      deviceAuthorization(),  // OAuth Device Flow for MCP/CLI
    ],
  });
}
```

**Key Features**:
- Conditional plugin activation based on environment variables
- Both methods can be enabled simultaneously
- Long-lived sessions (30 days) for MCP/CLI tools
- Maintains backward compatibility with existing GitHub OAuth setups

### 3. Admin User Auto-Seeding

**File**: `apps/api/src/auth/seed-admin.ts`

Automatically creates the admin user on application startup:

```typescript
export async function seedAdminUser(config: Env, db: Database, auth: Auth): Promise<void> {
  // Skip if admin user credentials are not configured
  if (!config.ADMIN_USER_EMAIL || !config.ADMIN_USER_PASSWORD) {
    return;
  }

  try {
    // Check if user already exists
    const existingUser = await db.execute(
      sql`SELECT id FROM ${schema.user} WHERE email = ${config.ADMIN_USER_EMAIL} LIMIT 1`
    );

    if (existingUser.rows.length === 0) {
      // Create new admin user using Better Auth
      await auth.api.signUpEmail({
        body: {
          email: config.ADMIN_USER_EMAIL,
          password: config.ADMIN_USER_PASSWORD,
          name: config.ADMIN_USER_NAME,
        },
      });

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Admin user created successfully",
      }));
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Admin user already exists",
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Failed to seed admin user",
      error: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
}
```

**Security Features**:
- Uses Better Auth's secure password hashing (bcrypt-based)
- Prevents duplicate user creation
- No sensitive data logged (passwords never logged)
- Automatic password updates via env var change + restart

**Integration**: Called during app startup in `apps/api/src/index.ts`:

```typescript
const { app, auth } = await createApp(db, config);
await seedAdminUser(config, db, auth);
```

### 4. Public Auth Config API Endpoint

Added a new public endpoint at `GET /api/auth/config` that returns which authentication methods are enabled:

```typescript
// apps/api/src/routes/auth/auth-config.routes.ts
export const getAuthConfig = createRoute({
    path: "/auth/config",
    method: "get",
    tags: ["Authentication"],
    summary: "Get available authentication methods",
    description: "Returns which authentication methods are enabled on this server",
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            AuthConfigResponseSchema,
            "Available authentication methods",
        ),
    },
});

// Response schema
{
    hasEmailPassword: boolean;  // True if ADMIN_USER_EMAIL/PASSWORD set
    hasGitHubOAuth: boolean;    // True if GITHUB_CLIENT_ID/SECRET set
}
```

**Handler Implementation**:
```typescript
// apps/api/src/routes/auth/auth-config.handlers.ts
export const getAuthConfig = async (c: AppRouteHandler<GetAuthConfigRoute>) => {
    const config = c.get("config");
    
    return c.json({
        hasEmailPassword: !!(config.ADMIN_USER_EMAIL && config.ADMIN_USER_PASSWORD),
        hasGitHubOAuth: !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET),
    }, HttpStatusCodes.OK);
};
```

### 5. Route Registration Order Critical Fix

**Problem**: Initially, the auth config route was being hidden by Better Auth's wildcard handler.

**Root Cause**: Hono's route matching was causing `/auth/**` to intercept `/auth/config` before our custom handler could respond. This resulted in 404 errors for both the auth config endpoint AND all Better Auth endpoints (sign-in, get-session, etc.).

**Solution**: Changed from double-wildcard to single-wildcard and ensured specific routes are registered first:

```typescript
// apps/api/src/app.ts

// ✅ Mount specific auth config endpoint FIRST
app.route("/", authConfig);

// ✅ Changed from app.on(["GET", "POST"], "/auth/**") 
// to app.all("/auth/*") for better route precedence
app.all("/auth/*", (c) => {
    return auth.handler(c.req.raw);
});
```

**Key Insight**: Using `app.all("/auth/*")` instead of `app.on(["GET", "POST"], "/auth/**")` allows specific routes registered first to take precedence while still catching all Better Auth routes.

**Routes Now Working**:
- `/api/auth/config` → Custom auth config handler ✅
- `/api/auth/sign-in/email` → Better Auth email sign-in ✅
- `/api/auth/sign-in/social/github` → Better Auth GitHub OAuth ✅
- `/api/auth/get-session` → Better Auth session check ✅
- `/api/auth/sign-out` → Better Auth sign-out ✅
- All other `/api/auth/*` routes → Better Auth handlers ✅

### 6. Frontend Query Implementation

Created type-safe React Query hooks following the established pattern:

```typescript
// apps/web/src/lib/api-client/queries/auth-config.queries.ts
const $get = apiClient.api.auth.config.$get;
export type AuthConfigResponse = SuccessResponse<InferResponseType<typeof $get>>;

export async function getAuthConfig(): Promise<AuthConfigResponse> {
  const response = await apiClient.api.auth.config.$get({ param: {} });
  const json = await response.json();

  if ("message" in json) {
    throw new Error(String(json.message));
  }
  return json;
}

export const AUTH_CONFIG_QUERY_KEY = ["auth", "config"] as const;

export function authConfigQueryOptions() {
    return queryOptions({
        queryKey: AUTH_CONFIG_QUERY_KEY,
        queryFn: getAuthConfig,
        staleTime: Number.POSITIVE_INFINITY, // Config never changes during session
    });
}
```

**Type Safety Fix**: Initially used `apiClient.auth.config.$get()` which failed because the client is constructed with `/api` base path. Correct usage: `apiClient.api.auth.config.$get()`.

### 7. Conditional Login UI Rendering

Updated the login page to use suspense query and conditionally render based on config:

```tsx
// apps/web/src/routes/login.tsx
export const Route = createFileRoute("/login")({
  loader: async ({ context }) => {
    // Preload auth config during route loading
    await context.queryClient.ensureQueryData(authConfigQueryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: authConfig } = useSuspenseQuery(authConfigQueryOptions());

  return (
    <>
      {/* Email/Password Form - only show if enabled */}
      {authConfig.hasEmailPassword && (
        <form onSubmit={handleEmailLogin}>
          {/* Email and password inputs */}
        </form>
      )}

      {/* Separator - only show if BOTH methods enabled */}
      {authConfig.hasEmailPassword && authConfig.hasGitHubOAuth && (
        <div className="relative">
          <Separator />
          <span>Or continue with</span>
        </div>
      )}

      {/* GitHub OAuth - only show if enabled */}
      {authConfig.hasGitHubOAuth && (
        <Button onClick={handleGithubLogin}>
          Sign in with GitHub
        </Button>
      )}
    </>
  );
}
```

## End-to-End Authentication Flows

### Scenario 1: Admin-Only Auth (Self-Hosting / CI/CD)

**Use Case**: Local development, CI pipelines, self-hosted deployments without external dependencies

**Configuration** (`.env`):
```bash
# Admin user credentials
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=your-secure-password-min-8-chars
ADMIN_USER_NAME=Admin User  # Optional

# No GitHub credentials set
# GITHUB_CLIENT_ID=(not set)
# GITHUB_CLIENT_SECRET=(not set)

# Other required config
DATABASE_URL=postgresql://user:password@localhost:6666/db
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3333
WEB_URL=http://localhost:5173
```

**Server Startup Flow**:
```
1. Environment Validation:
   - Config validates hasAdminUser=true, hasGitHubOAuth=false
   - Passes validation (at least one method enabled)

2. Better Auth Initialization:
   - createAuth() detects hasAdminUser=true
   - Enables emailAndPassword plugin
   - Skips GitHub OAuth (socialProviders=undefined)
   - Endpoints created: /auth/sign-in/email, /auth/sign-up/email, etc.

3. Admin User Seeding:
   - seedAdminUser() runs after app creation
   - Checks if admin@example.com exists in database
   - If not exists: Creates user via auth.api.signUpEmail()
   - Logs: "Admin user created successfully"
   - Password hashed securely using Better Auth

4. Routes Mounted:
   - /auth/config → Returns { hasEmailPassword: true, hasGitHubOAuth: false }
   - /auth/* → Better Auth handler (email/password endpoints available)
```

**User Login Flow**:
```
1. User visits http://localhost:5173/login
   
2. Route Loader (before render):
   - Fetches GET /api/auth/config
   - Response: { hasEmailPassword: true, hasGitHubOAuth: false }
   - Cached with staleTime: Infinity

3. UI Renders:
   - Shows email/password form ONLY
   - No GitHub button (hasGitHubOAuth=false)
   - No separator (only one method available)

4. User enters credentials and submits:
   - POST /api/auth/sign-in/email
   - Body: { email: "admin@example.com", password: "your-secure-password-min-8-chars" }
   
5. Better Auth Validates:
   - Looks up user by email
   - Verifies password hash
   - Creates session
   - Sets session cookie (30-day expiry)
   
6. Response:
   {
     "redirect": false,
     "token": "IJHqej99nnR1WAXP8dZLzEM5RO3kd914",
     "user": {
       "id": "DCBo0qDyDYTzG48OwrnN67RXmNHTREwN",
       "email": "admin@example.com",
       "name": "Admin User",
       "emailVerified": false,
       "createdAt": "2025-11-04T15:15:48.604Z"
     }
   }

7. Redirect to Dashboard:
   - Session cookie stored
   - Redirects to /dashboard
   - Subsequent API calls authenticated via session cookie
```

**CI/CD Usage**:
```yaml
# GitHub Actions example
jobs:
  test:
    env:
      ADMIN_USER_EMAIL: ci-admin@example.com
      ADMIN_USER_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      BETTER_AUTH_SECRET: test-secret-key-must-be-at-least-32-characters
      # ... other env vars
    
    steps:
      - run: pnpm db:migrate
      - run: pnpm test:api
      # Admin user auto-created on first request, no manual setup needed
```

### Scenario 2: GitHub-Only Auth (Production / Public Hosting)

**Use Case**: Production deployments with external OAuth, regular users

**Configuration** (`.env`):
```bash
# GitHub OAuth credentials
GITHUB_CLIENT_ID=Ov23li3NAEXO5dPBZPW2
GITHUB_CLIENT_SECRET=a416a898786132da7fe006994585335d798a98f1

# No admin credentials set
# ADMIN_USER_EMAIL=(not set)
# ADMIN_USER_PASSWORD=(not set)

# Other required config
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

**Server Startup Flow**:
```
1. Environment Validation:
   - Config validates hasAdminUser=false, hasGitHubOAuth=true
   - Passes validation (at least one method enabled)

2. Better Auth Initialization:
   - createAuth() detects hasGitHubOAuth=true
   - Enables GitHub social provider
   - Skips email/password (emailAndPassword=undefined)
   - Endpoints created: /auth/sign-in/social/github, /auth/callback/github

3. Admin User Seeding:
   - seedAdminUser() checks for credentials
   - No credentials found, returns early (no-op)

4. Routes Mounted:
   - /auth/config → Returns { hasEmailPassword: false, hasGitHubOAuth: true }
   - /auth/* → Better Auth handler (GitHub OAuth endpoints available)
```

**User Login Flow**:
```
1. User visits https://yourdomain.com/login
   
2. Route Loader:
   - Fetches GET /api/auth/config
   - Response: { hasEmailPassword: false, hasGitHubOAuth: true }

3. UI Renders:
   - Shows GitHub button ONLY
   - No email/password form (hasEmailPassword=false)
   - No separator

4. User clicks "Sign in with GitHub":
   - POST /api/auth/sign-in/social/github
   - Body: { provider: "github", callbackURL: "https://yourdomain.com/dashboard" }

5. OAuth Flow:
   - Redirects to GitHub OAuth consent page
   - User authorizes application
   - GitHub redirects to /api/auth/callback/github with code

6. Better Auth Callback:
   - Exchanges code for access token
   - Fetches user profile from GitHub
   - Creates or updates user in database
   - Creates session and sets cookie

7. Redirect to Dashboard:
   - User redirected to callbackURL
   - Authenticated via session cookie
```

### Scenario 3: Both Methods Enabled (Hybrid Deployment)

**Use Case**: Internal admin access + public user signups

**Configuration** (`.env`):
```bash
# Both methods enabled
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=secure-admin-password
GITHUB_CLIENT_ID=Ov23li3NAEXO5dPBZPW2
GITHUB_CLIENT_SECRET=a416a898786132da7fe006994585335d798a98f1
```

**Server Startup Flow**:
```
1. Environment Validation:
   - Config validates hasAdminUser=true, hasGitHubOAuth=true
   - Passes validation (both methods enabled)

2. Better Auth Initialization:
   - createAuth() detects BOTH flags are true
   - Enables emailAndPassword plugin
   - Enables GitHub social provider
   - ALL authentication endpoints available

3. Admin User Seeding:
   - Creates admin user if doesn't exist
   - Admin can log in via email/password

4. Routes Mounted:
   - /auth/config → Returns { hasEmailPassword: true, hasGitHubOAuth: true }
   - /auth/* → Better Auth handler (all endpoints available)
```

**User Login Flow**:
```
1. User visits /login

2. Route Loader:
   - Fetches GET /api/auth/config
   - Response: { hasEmailPassword: true, hasGitHubOAuth: true }

3. UI Renders:
   - Shows email/password form
   - Shows separator with "Or continue with"
   - Shows GitHub button below

4. User chooses method:
   
   Option A - Admin Login:
   - Uses email/password form
   - POST /api/auth/sign-in/email
   - Instant login for internal users
   
   Option B - Public User:
   - Clicks GitHub button
   - OAuth flow as in Scenario 2
   - Social login for external users

5. Both paths lead to dashboard:
   - Session cookie set
   - Same authentication model
   - Same permissions/authorization
```

**Benefits of Hybrid Mode**:
- Admin users get instant access (no OAuth setup needed)
- Public users get familiar social login
- Separate credentials for admin vs regular users
- Flexibility to disable either method later

## Consequences

### Positive

1. **Instant Setup for Self-Hosting**: No OAuth app creation needed for local dev or self-hosted deployments
2. **CI/CD Friendly**: Automated testing without OAuth configuration complexity
3. **Better UX**: Users only see authentication options that actually work
4. **Self-Documenting**: The login UI clearly shows what's configured
5. **Type Safety**: Full type inference from API to frontend using Hono RPC
6. **Performance**: Auth config cached indefinitely (never changes during session)
7. **Flexible Deployments**: Same codebase adapts to different configurations
8. **Zero Breaking Changes**: Existing GitHub OAuth deployments work without modification
9. **Security Best Practices**: 
   - Password hashing via Better Auth (bcrypt-based)
   - Minimum 8-character password requirement
   - No sensitive data in logs
   - Same security model for both auth methods
10. **Auto-Seeding**: Admin user created automatically on startup, perfect for ephemeral environments

### Negative

1. **Extra Request**: Login page now requires 2 requests (config + actual auth)
   - *Mitigation*: Config cached with `staleTime: Infinity`, uses route loader for parallel fetching
2. **Route Order Dependency**: Auth config must be mounted before Better Auth wildcard
   - *Mitigation*: Clear comments in code, documented in this ADR, will cause 404s if violated
3. **Public Endpoint**: Auth config is public (no auth required)
   - *Mitigation*: Only exposes boolean flags, no sensitive data
4. **Password Management**: Admin password must be updated via environment variable + restart
   - *Mitigation*: Standard practice for env-based config, documented in AUTHENTICATION.md
5. **No Email Verification**: Admin users skip email verification
   - *Mitigation*: Acceptable for internal/admin users, can be enabled if needed

### Trade-offs Considered

**Alternative Approaches Rejected**:

1. **Hardcode auth method in frontend**
   - ❌ Requires rebuild for config changes
   - ❌ Doesn't work for multi-tenant deployments
   
2. **Use feature flags**
   - ❌ Adds complexity of flag management system
   - ❌ Unnecessary for this use case
   
3. **Always show both, disable unavailable**
   - ❌ Poor UX, confusing to users
   - ❌ Doesn't communicate system capabilities

4. **Database-based admin user config**
   - ❌ Chicken-and-egg: how to auth to configure auth?
   - ✅ Environment variables are standard for bootstrap config

5. **Separate admin user table**
   - ❌ Increases complexity
   - ✅ Better Auth users work for both methods

### Implementation Details

**Files Created**:
- `apps/api/src/routes/auth/auth-config.routes.ts` - OpenAPI route definition
- `apps/api/src/routes/auth/auth-config.handlers.ts` - Handler returning enabled auth methods
- `apps/api/src/routes/auth/auth-config.index.ts` - Router registration
- `apps/api/src/auth/seed-admin.ts` - Admin user auto-seeding logic
- `apps/api/src/auth/__tests__/seed-admin.test.ts` - Comprehensive integration tests
- `apps/web/src/lib/api-client/queries/auth-config.queries.ts` - Frontend React Query hooks
- `docs/AUTHENTICATION.md` - Comprehensive authentication guide
- `docs/ADMIN_USER_IMPLEMENTATION.md` - Implementation summary document

**Files Modified**:
- `apps/api/src/lib/config.ts` - Added admin user env vars, made GitHub OAuth optional, added validation
- `apps/api/src/auth/config.ts` - Conditional Better Auth plugin activation
- `apps/api/src/index.ts` - Admin user seeding integration
- `apps/api/src/app.ts` - Route registration order fix (critical), return signature update
- `apps/api/src/types.ts` - Added `config: Env` to AppBindings Variables
- `apps/api/src/client.ts` - Added authConfig to RPC client exports
- `apps/web/src/routes/login.tsx` - Conditional rendering based on auth config
- `.env.example` - Documentation for admin user configuration
- `README.md` - Self-hosting quick start guide

**Critical Routing Fix**:

Changed from:
```typescript
// ❌ This caused 404s for /auth/config AND Better Auth endpoints
app.route("/", authConfig);
app.on(["GET", "POST"], "/auth/**", (c) => auth.handler(c.req.raw));
```

To:
```typescript
// ✅ Specific route first, single wildcard for Better Auth
app.route("/", authConfig);  // Handles /auth/config
app.all("/auth/*", (c) => auth.handler(c.req.raw));  // Handles all other /auth/*
```

**Why This Matters**:
- `app.on(["GET", "POST"], "/auth/**")` with double wildcard was too greedy
- Caught `/auth/config` before the specific route could handle it
- Using `app.all("/auth/*")` with single wildcard allows proper route precedence
- Specific routes registered first take priority over wildcards

**Testing Coverage**:

```typescript
// apps/api/src/auth/__tests__/seed-admin.test.ts
✅ Creates admin user when configured
✅ Prevents duplicate user creation
✅ Allows login with admin credentials
✅ Skips seeding when credentials not configured
✅ Updates password on env var change + restart (manual test)
```

All existing API tests continue to pass, demonstrating zero breaking changes.

## References

- **ADR-0011**: Dual Auth Implementation (initial admin + GitHub OAuth decision)
- **Task**: Conditional login form rendering based on available auth methods
- **Better Auth Documentation**: 
  - Email/Password authentication configuration
  - Social provider (GitHub) setup
  - Session management and security
- **Hono Documentation**: Route matching, precedence rules, and wildcard patterns

## Migration Guide

### For Existing Deployments

**No action required** - existing GitHub OAuth deployments work without modification:

```bash
# Existing .env (continues to work)
GITHUB_CLIENT_ID=your_existing_id
GITHUB_CLIENT_SECRET=your_existing_secret
# No ADMIN_USER_* variables needed
```

### Adding Admin User to Existing Deployment

Simply add the admin user environment variables:

```bash
# Add these to existing .env
ADMIN_USER_EMAIL=admin@yourdomain.com
ADMIN_USER_PASSWORD=your-secure-password-min-8-chars
ADMIN_USER_NAME=Admin User
```

Restart the application. Admin user will be created automatically.

### Switching from GitHub OAuth to Admin-Only

1. Add admin user credentials to `.env`
2. Remove or comment out GitHub OAuth credentials
3. Restart application
4. Login page will automatically show only email/password form

### Quick Start for New Deployments

**Minimal Configuration** (admin-only):
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:6666/db

# Auth (Better Auth)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3333
WEB_URL=http://localhost:5173

# Admin User (required if no GitHub OAuth)
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=your-secure-password-min-8-chars

# Stripe (fake values work for local dev)
STRIPE_SECRET_KEY=sk_test_fake
STRIPE_WEBHOOK_SECRET=whsec_fake
STRIPE_PRICE_PRO=price_fake
STRIPE_PRICE_ENTERPRISE=price_fake
BASE_URL=http://localhost:5173
```

**Start Commands**:
```bash
pnpm install
pnpm db           # Start PostgreSQL in Docker
pnpm db:migrate   # Run database migrations
pnpm dev          # Start all services
```

Login at `http://localhost:5173/login` with your admin credentials.

## Security Considerations

### Password Security

1. **Hashing**: Better Auth uses bcrypt-based hashing with appropriate cost factor
2. **Minimum Length**: 8 characters enforced at config validation layer
3. **Storage**: Passwords never stored in plaintext, only hashed values in database
4. **Transmission**: Always use HTTPS in production to protect credentials in transit
5. **Environment Variables**: Standard practice for bootstrap credentials, keep `.env` out of version control

### Recommended Practices

**For Production**:
```bash
# Generate strong password
openssl rand -base64 32

# Use secrets management
ADMIN_USER_PASSWORD="${ADMIN_PASSWORD_FROM_SECRETS_MANAGER}"

# Or use GitHub Actions secrets
ADMIN_USER_PASSWORD=${{ secrets.ADMIN_PASSWORD }}
```

**For Development**:
```bash
# Acceptable for local dev
ADMIN_USER_PASSWORD=development-password-only
```

### Session Security

- **Session Duration**: 30 days by default (configurable)
- **Session Refresh**: Updated every 7 days to extend expiration
- **Secure Cookies**: httpOnly, secure (in production), sameSite
- **CORS**: Configured to trust only WEB_URL origin

### No Email Verification Trade-off

Admin users skip email verification (`requireEmailVerification: false`) because:
- Admin credentials are set by the deployment owner
- Email verification would require SMTP configuration
- Use case is for known, trusted admin users
- Can be enabled if needed by changing Better Auth config

If email verification is required:
```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,  // Enable this
  sendVerificationOnSignUp: true,
}
// Also configure Better Auth emailVerification plugin
```

## Troubleshooting

### Admin user not created

**Symptoms**: Login fails, logs don't show "Admin user created"

**Solutions**:
1. Verify both `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` are set in `.env`
2. Check application logs for errors during startup
3. Ensure database migrations have run: `pnpm db:migrate`
4. Verify database is accessible and running
5. Check for typos in environment variable names

### Login returns 404

**Symptoms**: POST to `/api/auth/sign-in/email` returns 404

**Solutions**:
1. **Restart the API server** - Server needs restart to pick up new env vars
2. Verify auth config endpoint works: `curl http://localhost:3333/api/auth/config`
3. Check that `hasEmailPassword` is `true` in config response
4. Verify Better Auth wildcard is using `app.all("/auth/*")` not `app.on(["GET", "POST"], "/auth/**")`

### "Failed to sign in" error

**Symptoms**: Login form shows error message

**Solutions**:
1. Verify email and password match `.env` configuration exactly
2. Check admin user was created (look for log message on startup)
3. Try with different credentials to rule out user error
4. Check database for user: `SELECT * FROM "user" WHERE email = 'admin@example.com';`
5. Restart application to re-seed admin user

### GitHub OAuth not working

**Symptoms**: GitHub button doesn't appear or OAuth flow fails

**Solutions**:
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
2. Check GitHub OAuth app callback URL: `${BETTER_AUTH_URL}/api/auth/callback/github`
3. Ensure callback URL in GitHub app settings matches exactly
4. Verify `BETTER_AUTH_URL` and `WEB_URL` are correct
5. Check auth config: `curl http://localhost:3333/api/auth/config` should show `hasGitHubOAuth: true`

### Both methods showing when only one configured

**Symptoms**: UI shows email form and GitHub button when only one should appear

**Solutions**:
1. Clear browser cache and hard reload (Cmd+Shift+R or Ctrl+Shift+R)
2. Check auth config response: `curl http://localhost:3333/api/auth/config`
3. Verify environment variables are set correctly
4. Restart API server to reload configuration
5. Check for client-side caching issues (auth config has infinite staleTime)

## API Authentication Methods

Beyond web UI authentication, Cronicorn supports additional auth methods for programmatic access:

### 1. Session Cookies (Web UI)

After logging in via `/login`, session stored in cookie automatically:
- Works for browser-based API calls
- 30-day expiration (refreshed every 7 days)
- httpOnly, secure cookies

### 2. Bearer Tokens (Device Flow)

For CLI tools, AI agents, MCP servers:

```bash
# 1. Initiate device authorization
POST /api/auth/device/code

# 2. User authorizes in browser
GET /api/auth/device/authorize?user_code=XXXX-XXXX

# 3. Poll for token
POST /api/auth/device/token

# 4. Use bearer token
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/jobs
```

See [MCP Server documentation](../apps/mcp-server/README.md) for complete device flow integration.

### 3. API Keys

For service-to-service authentication:

```bash
# 1. Generate API key in web UI (/settings/api-keys)

# 2. Use in requests
curl -H "X-API-Key: your-api-key" http://localhost:3333/api/jobs
```

**Features**:
- Per-key rate limiting (100 requests/minute)
- Revocable without affecting other keys
- Named keys for organization

## Future Enhancements

Potential improvements identified but not yet implemented:

1. **Additional OAuth Providers**
   - Google, Microsoft, etc.
   - Same conditional rendering pattern
   - Minimal code changes required

2. **Multi-Tenant Admin Users**
   - Multiple admin users per deployment
   - Role-based access control
   - Admin user management UI

3. **Password Reset Flow**
   - Email-based password reset for admin users
   - Requires SMTP configuration
   - Better Auth supports this out of the box

4. **Email Verification for Admin**
   - Optional email verification step
   - Configurable via environment variable
   - Requires email sending setup

5. **Authentication Telemetry**
   - Track which auth methods users choose
   - Login success/failure metrics
   - Geographic distribution of auth methods

6. **Config Validation Warnings**
   - Startup warnings if neither method enabled
   - Config health check endpoint
   - Auto-test auth methods on startup

7. **Two-Factor Authentication (2FA)**
   - Better Auth supports TOTP plugin
   - Would work with both auth methods
   - UI updates needed

## Related Improvements

This implementation enables several workflow improvements:

1. **Faster Onboarding**: New developers can start coding in minutes without OAuth setup
2. **Better CI/CD**: Automated tests don't need OAuth mock servers or test accounts
3. **Self-Hosting**: Organizations can deploy without external dependencies
4. **Hybrid Workflows**: Internal admins use email/password, external users use OAuth
5. **Disaster Recovery**: Admin access works even if OAuth provider is down
