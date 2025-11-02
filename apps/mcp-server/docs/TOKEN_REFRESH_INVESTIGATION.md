# Token Refresh Investigation - Todo Item #1

**Date**: 2025-11-01  
**Status**: In Progress  
**Investigator**: AI Assistant

## Summary

Better Auth's `deviceAuthorization` plugin **provides refresh_token** in the device flow response, but **NO refresh endpoint is documented**. We need to verify if Better Auth supports the OAuth 2.0 standard refresh grant.

## What We Know

### 1. Device Flow Response Includes `refresh_token`

From Better Auth docs for POST `/auth/device/token`:

```json
{
  "access_token": "eyJraWQiOiJmQ1...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJraWQiOiJmQ1...",  // ← This is provided
  "scope": "openid profile email"
}
```

### 2. Our Current Implementation STORES but NEVER USES It

```typescript
// apps/mcp-server/src/auth/device-flow.ts
const credentials: Credentials = {
  access_token: token.access_token,
  refresh_token: token.refresh_token || "",  // ← Stored
  expires_at: Date.now() + (token.expires_in * 1000),
};
await saveCredentials(credentials);  // ← Saved to ~/.cronicorn/credentials.json

// apps/mcp-server/src/auth/token-store.ts
export function isTokenExpired(credentials: Credentials): boolean {
  const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
  return Date.now() + BUFFER_MS >= credentials.expires_at;
}
// ← Helper exists but is NEVER called anywhere
```

### 3. Possible Refresh Endpoints (Need Testing)

Based on OAuth 2.0 standards and Better Auth patterns:

**Option A**: Same endpoint with different grant type
```bash
POST /api/auth/device/token
{
  "grant_type": "refresh_token",  // ← Instead of device_code grant
  "refresh_token": "...",
  "client_id": "cronicorn-mcp-server"
}
```

**Option B**: Dedicated refresh endpoint
```bash
POST /api/auth/refresh
{
  "refresh_token": "..."
}
```

**Option C**: Session refresh (Bearer token in header)
```bash
POST /api/auth/session/refresh
Headers: Authorization: Bearer <access_token>
```

## Testing Required

I've created a test script: `apps/mcp-server/scripts/test-token-refresh.ts`

### Run Test

```bash
cd apps/mcp-server

# First, complete device flow to get credentials
pnpm inspect
# (complete device flow in browser)

# Then test refresh endpoints
pnpm test:refresh
```

### Expected Outcomes

#### ✅ Success Case
```
🧪 Testing Better Auth token refresh endpoint...
✅ Found credentials
🔍 Testing POST /auth/device/token with grant_type=refresh_token...
   Status: 200 OK
✅ REFRESH WORKS via /auth/device/token!
   New access_token: abc123...
   New refresh_token: xyz789...
   Expires in: 3600s
```

#### ❌ Failure Case
```
🧪 Testing Better Auth token refresh endpoint...
✅ Found credentials
🔍 Testing POST /auth/device/token with grant_type=refresh_token...
   Status: 400 Bad Request
   Response: {"error":"unsupported_grant_type"}
🔍 Testing POST /auth/refresh...
   Status: 404 Not Found
❌ No built-in refresh endpoint found.
```

## Decision Matrix

### If Better Auth Supports Refresh ✅

**Action**: Use built-in endpoint
- Update `device-flow.ts` to add `refreshAccessToken()` function
- Call discovered endpoint with refresh_token
- Handle token rotation (if new refresh_token is returned)
- Estimated time: **2 hours**

### If Better Auth Does NOT Support Refresh ❌

**Action**: Implement custom endpoint in API server

**File**: `apps/api/src/routes/auth/refresh.ts`

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import type { AppContext } from "../../lib/types.js";

const refreshSchema = z.object({
  refresh_token: z.string(),
  client_id: z.string().optional().default("cronicorn-mcp-server"),
});

export const refreshRoute = createRoute({
  method: "post",
  path: "/auth/refresh",
  request: {
    body: {
      content: {
        "application/json": {
          schema: refreshSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token refreshed successfully",
      content: {
        "application/json": {
          schema: z.object({
            access_token: z.string(),
            refresh_token: z.string(),
            expires_in: z.number(),
            token_type: z.literal("Bearer"),
          }),
        },
      },
    },
    401: {
      description: "Invalid refresh token",
    },
  },
});

export function registerRefreshRoute(app: Hono<AppContext>, auth: Auth) {
  app.openapi(refreshRoute, async (c) => {
    const { refresh_token, client_id } = c.req.valid("json");

    // Validate refresh token against Better Auth's oauthTokens table
    // This requires direct database access since Better Auth doesn't expose this
    const db = c.get("db");
    
    const tokenRecord = await db.query.oauthTokens.findFirst({
      where: (tokens, { eq, and }) => 
        and(
          eq(tokens.refreshToken, refresh_token),
          eq(tokens.clientId, client_id)
        ),
    });

    if (!tokenRecord) {
      return c.json({ error: "Invalid refresh token" }, 401);
    }

    // Generate new access token
    // Note: Better Auth doesn't expose token generation, so we'd need to:
    // 1. Use auth.api.getSession() with user ID to create session
    // 2. Extract session token as access_token
    // This is a workaround and may not be ideal

    // Alternative: Ask Better Auth team for refresh support
    return c.json({ error: "Not implemented" }, 501);
  });
}
```

**Challenges with Custom Implementation**:
1. Better Auth doesn't expose token generation APIs
2. Need direct database access to `oauthTokens` table
3. Token rotation logic must be implemented manually
4. Session management becomes complex

**Estimated time**: **6-8 hours** (complex)

## Recommendation

1. **Run test script first** to determine if Better Auth supports refresh
2. **If supported**: Implement using built-in endpoint (preferred)
3. **If not supported**: 
   - File issue with Better Auth team
   - Consider increasing token lifetime to 30-90 days as temporary solution
   - Only implement custom endpoint if absolutely necessary

## Next Steps

1. ✅ Created test script
2. ✅ Run test with actual API server
3. ✅ Document findings
4. ✅ Update Todo Item #1 status based on results
5. ⏳ Proceed with implementation (Todo Item #2)

## References

- [OAuth 2.0 RFC 6749 - Refresh Token Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-6)
- [Better Auth Device Authorization Docs](https://www.better-auth.com/docs/plugins/device-authorization)
- [Better Auth Bearer Plugin Docs](https://www.better-auth.com/docs/plugins/bearer)
- [Better Auth GitHub Issues](https://github.com/better-auth/better-auth/issues)

---

## ✅ TEST RESULTS - CRITICAL FINDING

**Date Tested**: 2025-11-01  
**Test Command**: `pnpm test:refresh`

### Actual Credentials File Content

```json
{
  "access_token": "olEilHpz92h1igHxDIsP2IAYLT6Wg7L4",
  "refresh_token": "",
  "expires_at": 1762657749118
}
```

### Finding: NO REFRESH TOKEN PROVIDED

**Better Auth's device flow did NOT provide a `refresh_token`** in the response!

The `bearer()` plugin in our API configuration has **no options**:

```typescript
// apps/api/src/auth/config.ts
plugins: [
  bearer(), // ← No configuration!
  deviceAuthorization({
    expiresIn: "30m",
    interval: "5s",
  }),
]
```

### Why This Happened

From Better Auth documentation, the `bearer()` plugin can be configured:

```typescript
bearer({
  expiresIn: 60 * 60 * 24 * 7, // 7 days
})
```

But **we're using the default**, which may not include refresh tokens in the device flow response.

## DECISION MATRIX UPDATE

Given that Better Auth device flow doesn't provide refresh tokens with our current configuration, we have **3 options**:

### Option A: Configure Long-Lived Tokens ✅ RECOMMENDED

**Simplest solution**: Just make tokens last longer so refresh isn't needed.

**Implementation**:
```typescript
// apps/api/src/auth/config.ts
session: {
  expiresIn: 60 * 60 * 24 * 30, // 30 days
  updateAge: 60 * 60 * 24 * 7,  // Refresh session weekly
},
plugins: [
  bearer({
    expiresIn: 60 * 60 * 24 * 30, // 30-day bearer tokens
  }),
  // ...
]
```

**Pros**:
- ✅ Zero code changes in MCP server
- ✅ Works immediately
- ✅ Acceptable for CLI/MCP tools (not web browsers)
- ✅ 30 days matches industry standards (AWS CLI, GitHub CLI, etc.)

**Cons**:
- ⚠️ User must re-auth every 30 days
- ⚠️ No automatic refresh

**Estimated Time**: **30 minutes** (just config change + testing)

### Option B: Investigate Better Auth Refresh Support

**Research if Bearer plugin supports refresh tokens with different config**.

**Next Steps**:
1. Check Better Auth GitHub issues for device flow + refresh token
2. Try configuring bearer plugin with refresh options
3. Test if device flow response includes refresh_token after config change

**Estimated Time**: **2-4 hours** (research + experimentation)

**Risk**: May not be supported at all

### Option C: Custom Refresh Endpoint

**Build our own `/auth/refresh` endpoint** that:
1. Validates the access token (even if expired)
2. Issues a new access token
3. Extends the session

**Implementation**: See Path B in original investigation above

**Estimated Time**: **6-8 hours**

**Risk**: Complex, may conflict with Better Auth internals

## ✅ RECOMMENDATION

**Go with Option A** (Long-lived tokens) for v0.1.0:

1. **Immediate**: Configure 30-day token lifetime in API
2. **Short-term**: Implement startup token validation (warn user if expired)
3. **Future**: Investigate Option B if users report 30 days is too short

**This gets MCP server to production-ready fastest** while maintaining good UX.

### Updated Implementation Plan

**HIGH PRIORITY** (Do before v0.1.0 release):
- [ ] Todo #11: Configure 30-day token lifetime
- [ ] Todo #5: Add startup token expiry check
- [ ] Todo #8: Add expiry logging

**MEDIUM PRIORITY** (Can do after release):
- [ ] Research Better Auth refresh token support
- [ ] Consider implementing refresh if users need longer sessions

**LOW PRIORITY** (Tech debt):
- [ ] Monitor token expiry patterns
- [ ] Gather user feedback on 30-day limit
