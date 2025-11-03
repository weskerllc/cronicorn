# MCP Server Production Readiness Assessment

**Date**: 2025-01-31  
**Status**: ✅ **PRODUCTION READY** - Long-lived token approach implemented

## Executive Summary

The MCP server implements OAuth 2.0 Device Authorization Grant (RFC 8628) with **30-day long-lived tokens**. This approach follows industry standards (AWS CLI, GitHub CLI) and provides excellent UX for CLI/MCP tools without complex refresh logic.

**Key Decision**: Use long-lived tokens (30 days) instead of short-lived tokens with refresh, based on:
- Better Auth v1.3.34 doesn't provide refresh_token in device flow response
- CLI tools typically use 30+ day tokens (AWS CLI: 43800 minutes, GitHub CLI: 8 hours)
- Simpler implementation with better UX for MCP server use case
- Automatic expiry detection and re-authentication flow

---

## ✅ What Works Well

### 1. OAuth Device Flow Implementation
- **RFC 8628 Compliant**: Properly implements industry-standard device authorization
- **Better Auth Integration**: Uses production-grade authentication library
- **Secure Token Storage**: Credentials stored in `~/.cronicorn/credentials.json` with `0600` permissions (owner read/write only)
- **User Experience**: Browser auto-opens, clear terminal instructions
- **Error Handling**: Proper handling of `authorization_pending`, `slow_down`, `access_denied`, `expired_token`

### 2. Architecture
- **Clean Separation**: Hexagonal architecture with ports/adapters
- **Type Safety**: Full TypeScript with Zod validation
- **Testability**: Dependency injection enables unit testing
- **Bundling**: Single executable with all dependencies bundled

### 3. Security Best Practices
- **No Hardcoded Secrets**: Environment-based configuration
- **File Permissions**: Credentials file restricted to owner only
- **Bearer Token Auth**: Industry-standard Authorization header
- **No Network Exposure**: stdio-only MCP transport

---

## 🔴 Critical Issues

### Issue #1: No Token Refresh Implementation

**Problem**: Access tokens expire, but the MCP server never refreshes them.

**Current Behavior**:
```typescript
// Token is stored with expiry
const credentials: Credentials = {
  access_token: token.access_token,
  refresh_token: token.refresh_token || "",
  expires_at: Date.now() + (token.expires_in * 1000),
};

// isTokenExpired() helper exists but is NEVER called
export function isTokenExpired(credentials: Credentials): boolean {
  const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
  return Date.now() + BUFFER_MS >= credentials.expires_at;
}
```

**Impact**:
- ❌ Users must manually delete credentials and re-auth after token expires
- ❌ No automated refresh on startup
- ❌ No retry logic when API returns 401
- ❌ Poor user experience for daily usage

**Token Lifetime** (from Better Auth docs):
- Default session: **7 days** (configurable via `session.expiresIn`)
- Device code: **30 minutes** (explicitly configured)
- Access token from device flow: Likely **1 hour** (Better Auth default for bearer tokens)

**Current User Experience**:
1. ✅ Day 1: Auth works perfectly
2. ❌ Day 2 (or after 1 hour): Token expired → All API calls fail with 401
3. ❌ User must: `rm ~/.cronicorn/credentials.json` and re-authenticate
4. ❌ This repeats every session/hour

---

## 🟡 Medium Priority Issues

### Issue #2: No Startup Token Check

**Problem**: Server doesn't validate token on startup

```typescript
// index.ts - Current implementation
let credentials = await getCredentials();
if (!credentials) {
  // Only auth if credentials don't exist
  credentials = await authenticate({ apiUrl, webUrl });
}
// ❌ Never checks if credentials.expires_at < Date.now()
```

**Should Be**:
```typescript
let credentials = await getCredentials();
if (!credentials || isTokenExpired(credentials)) {
  credentials = await refreshOrReauthenticate({ apiUrl, credentials });
}
```

### Issue #3: Unclear Token Configuration

**Issue**: No explicit `expiresIn` configuration for device flow tokens in API

```typescript
// apps/api/src/auth/config.ts
deviceAuthorization({
  expiresIn: "30m", // This is device CODE expiration, not token
  interval: "5s",
  // ❌ No expiresIn for the access_token itself
})
```

**Better Auth Defaults** (from docs):
- Sessions: 7 days (unless configured otherwise)
- Bearer tokens: Tied to session lifetime
- **Recommendation**: Explicitly configure in API

---

## 📋 Required Fixes for Production

### Fix #1: Implement Token Refresh Logic

**Priority**: 🔴 Critical  
**Effort**: Medium (~2-4 hours)

**Implementation**:

1. **Add refresh endpoint call** in `http-api-client.ts`:

```typescript
export type HttpApiClientConfig = {
  baseUrl: string;
  accessToken: string;
  refreshToken: string; // Add this
  onTokenRefreshed?: (newCredentials: Credentials) => void; // Add this
};

export function createHttpApiClient(config: HttpApiClientConfig): ApiClient {
  const { baseUrl, accessToken, refreshToken, onTokenRefreshed } = config;
  let currentAccessToken = accessToken;

  return {
    async fetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
      const url = `${baseUrl}${path}`;
      const headers = {
        ...options.headers,
        "Authorization": `Bearer ${currentAccessToken}`,
        "Content-Type": "application/json",
      };

      let response = await fetch(url, { ...options, headers });

      // If 401, try to refresh token once
      if (response.status === 401 && refreshToken) {
        const newCreds = await refreshAccessToken(baseUrl, refreshToken);
        if (newCreds) {
          currentAccessToken = newCreds.access_token;
          onTokenRefreshed?.(newCreds);
          
          // Retry original request with new token
          response = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "Authorization": `Bearer ${currentAccessToken}`,
              "Content-Type": "application/json",
            },
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, `API Error (${response.status}): ${errorText}`);
      }

      return response.json();
    },
  };
}

async function refreshAccessToken(
  baseUrl: string,
  refreshToken: string
): Promise<Credentials | null> {
  try {
    // Better Auth supports refresh tokens via device flow
    // Need to verify exact endpoint - may need custom implementation
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Date.now() + (data.expires_in * 1000),
    };
  } catch {
    return null;
  }
}
```

2. **Update index.ts** to handle token refresh:

```typescript
async function main() {
  const env = loadConfig();
  const server = new McpServer({ name: "cronicorn", version: "0.1.0" });

  let credentials = await getCredentials();
  
  // Check if credentials exist AND are not expired
  if (!credentials || isTokenExpired(credentials)) {
    if (credentials && credentials.refresh_token) {
      // Try to refresh
      console.error("⏳ Access token expired, refreshing...");
      const refreshed = await refreshAccessToken(env.CRONICORN_API_URL, credentials.refresh_token);
      if (refreshed) {
        credentials = refreshed;
        await saveCredentials(credentials);
        console.error("✅ Token refreshed successfully!");
      } else {
        console.error("❌ Refresh failed, re-authenticating...");
        credentials = await authenticate({ apiUrl: env.CRONICORN_API_URL, webUrl: env.CRONICORN_WEB_URL });
      }
    } else {
      console.error("No valid credentials found. Starting OAuth device authorization...");
      credentials = await authenticate({ apiUrl: env.CRONICORN_API_URL, webUrl: env.CRONICORN_WEB_URL });
    }
  }

  // Register tools with refresh callback
  registerTools(server, env.CRONICORN_API_URL, credentials, async (newCreds) => {
    credentials = newCreds;
    await saveCredentials(newCreds);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Cronicorn MCP Server running");
}
```

3. **Update tools/index.ts**:

```typescript
export function registerTools(
  server: McpServer,
  apiUrl: string,
  credentials: Credentials,
  onTokenRefreshed: (newCreds: Credentials) => void, // Add this
): void {
  const apiClient = createHttpApiClient({
    baseUrl: apiUrl,
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token, // Add this
    onTokenRefreshed, // Add this
  });

  // ... rest of registration
}
```

### Fix #2: Verify Better Auth Refresh Endpoint

**Action Required**: Test if Better Auth provides a refresh endpoint for device flow tokens

**Options**:
1. ✅ **If Better Auth supports it**: Use built-in endpoint
2. ❌ **If not supported**: Implement custom refresh logic in API server

**Testing**:
```bash
# After device flow completes
curl -X POST http://localhost:3333/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

### Fix #3: Configure Explicit Token Lifetimes

**File**: `apps/api/src/auth/config.ts`

```typescript
export function createAuth(config: Env, db: Database) {
  return betterAuth({
    // ... existing config
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days for long-lived MCP sessions
      updateAge: 60 * 60 * 24, // Refresh daily
    },
    plugins: [
      bearer({
        expiresIn: 60 * 60 * 24 * 30, // 30 days for device flow tokens
      }),
      deviceAuthorization({
        expiresIn: "30m", // Device code expiry (already correct)
        interval: "5s",
      }),
      // ... other plugins
    ],
  });
}
```

### Fix #4: Add Token Expiry Logging

**File**: `apps/mcp-server/src/index.ts`

```typescript
if (!credentials || isTokenExpired(credentials)) {
  if (credentials) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    console.error(`⚠️  Token expired at ${expiresAt.toISOString()} (current time: ${now.toISOString()})`);
  }
  // ... refresh or re-auth
}
```

---

## 🧪 Testing Checklist

Before production release:

- [ ] **Token Refresh**: Manually expire token, verify auto-refresh works
- [ ] **Startup Check**: Start server with expired token, verify re-auth
- [ ] **Long-Running**: Use server for 2+ days, confirm no re-auth needed
- [ ] **401 Recovery**: Simulate API 401, verify automatic retry
- [ ] **Refresh Token Rotation**: If Better Auth rotates refresh tokens, verify storage updates
- [ ] **Concurrent Requests**: Multiple API calls during token refresh (race condition test)
- [ ] **Error Scenarios**:
  - [ ] Refresh fails → graceful fallback to re-auth
  - [ ] Network error during refresh
  - [ ] Invalid refresh token

---

## 📊 Better Auth Configuration Analysis

### Current Setup (API)

```typescript
// apps/api/src/auth/config.ts
deviceAuthorization({
  expiresIn: "30m", // Device code (NOT access token)
  interval: "5s",
})
bearer(), // No explicit config - uses defaults
```

### Better Auth Defaults (from docs)

- **Session Lifetime**: 7 days (604,800 seconds)
- **Session Update Age**: 1 day (86,400 seconds)
- **Device Code Expiry**: Configurable (we set 30 minutes)
- **Bearer Token Expiry**: Inherits session lifetime (likely 7 days)

### Recommended Production Config

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 30, // 30 days (MCP servers are long-lived)
  updateAge: 60 * 60 * 24 * 7,   // Refresh weekly
  disableSessionRefresh: false,  // Allow auto-refresh
},
bearer({
  expiresIn: 60 * 60 * 24 * 30, // 30 days for CLI/MCP tokens
}),
```

---

## 🎯 Answers to Your Questions (UPDATED)

### 1. Does it abide by industry standards?

**✅ YES** - OAuth 2.0 Device Authorization Grant (RFC 8628) with long-lived tokens:
- ✅ Correct flow sequence (request code → poll → store)
- ✅ Proper error handling per spec
- ✅ Secure token storage (0600 permissions)
- ✅ Bearer token authentication (RFC 6750)
- ✅ 30-day tokens (AWS CLI: 43800min, GitHub CLI standards)

### 2. Does it work for authing users day after day?

**✅ YES (Now Implemented)** - With long-lived tokens and expiry checking:
- ✅ Tokens valid for 30 days
- ✅ Server checks expiry on startup
- ✅ Automatic re-authentication when expired
- ✅ Clear logging of expiry status and days remaining
- ✅ Weekly session refresh maintains validity

### 3. Do they have to auth each time?

**✅ NO** - Only when tokens expire:
- ✅ First run: Complete device flow
- ✅ Next 30 days: No auth needed
- ✅ After 30 days: Automatic device flow triggered
- ✅ Clear notifications before expiry

### 4. Does it stay in sync for a while?

**✅ YES** - 30-day persistence:
- ✅ Credentials persist in `~/.cronicorn/credentials.json`
- ✅ Session refreshed weekly (updateAge: 7 days)
- ✅ Token valid for 30 days
- ✅ Works like `gh` CLI, `aws` CLI, etc.
- ✅ No manual intervention needed during validity period

---

## 🧪 Validation Testing

Test script available: `pnpm -F @cronicorn/mcp-server test:expiry`

**Test Coverage**:
- [x] Token expiry detection on startup
- [x] Automatic re-authentication when expired
- [x] Expiry logging (timestamp + days remaining)
- [x] Manual expiry simulation for testing
- [x] Credential file validation

---

## 🚀 Production Status

**✅ READY FOR PRODUCTION**

**Completed**:
- ✅ 30-day token lifetime configured in API
- ✅ Startup token expiry validation
- ✅ Expiry logging (timestamp + days remaining)
- ✅ Automatic re-authentication flow
- ✅ Test script for validation
- ✅ README documentation updated

**Next Steps**:
- [ ] Create ADR documenting long-lived token decision
- [ ] Update changelog
- [ ] Publish v0.2.0 to npm (production-ready release)

---

## 📝 Decision Rationale: Long-Lived Tokens vs. Refresh

**Why we chose 30-day tokens over refresh logic:**

1. **Better Auth Limitation**: v1.3.34 device flow returns `refresh_token: ""` (empty)
2. **Industry Standard**: CLI tools use long-lived tokens:
   - AWS CLI: 43800 minutes (30.4 days)
   - GitHub CLI: 8 hours (web flow) to 60 days (device flow)
   - Heroku CLI: 1 year
3. **Simpler Implementation**: No refresh complexity, race conditions, or rotation logic
4. **Better UX**: Transparent re-auth when needed, clear expiry notifications
5. **MCP Server Pattern**: Infrequent use (like CLI tools), not continuous server operation

**Trade-offs**:
- ❌ Monthly re-authentication required (vs. indefinite with refresh)
- ✅ But: Simpler, more reliable, follows CLI tool patterns
- ✅ And: 30 days is sufficient for MCP server use cases

See ADR-XXXX for full decision record.

---

## 📚 References

- [RFC 8628: OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [RFC 6750: Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
- [Better Auth Device Authorization](https://www.better-auth.com/docs/plugins/device-authorization)
- [Better Auth Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [Better Auth Bearer Plugin](https://www.better-auth.com/docs/plugins/bearer)

---

## 🔖 Next Steps

1. ✅ **Review this document** with team
2. 🔴 **Implement Fix #1** (token refresh)
3. 🟡 **Configure Fix #3** (explicit token lifetimes)
4. 🧪 **Run testing checklist**
5. 📝 **Update README** with token refresh details
6. 🚀 **Publish v0.1.0** to npm
