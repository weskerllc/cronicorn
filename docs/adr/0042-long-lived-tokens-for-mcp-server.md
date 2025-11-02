# ADR-0042: Long-Lived Tokens for MCP Server Authentication

**Date:** 2025-01-31  
**Status:** Accepted

## Context

The MCP server uses OAuth 2.0 Device Authorization Grant (RFC 8628) for authentication. We needed to decide between two approaches for token lifecycle management:

**Option A: Short-Lived Tokens + Refresh Logic**
- Access tokens expire quickly (1-7 days)
- Refresh tokens enable automatic renewal
- Requires complex refresh implementation:
  - Refresh endpoint calls
  - Token rotation handling
  - Race condition management
  - 401 retry logic

**Option B: Long-Lived Tokens (30 Days)**
- Access tokens valid for 30 days
- Simple expiry detection and re-authentication
- No refresh logic needed
- Follows CLI tool patterns

### Investigation Findings

**Better Auth v1.3.34 Limitations:**
1. Device Authorization flow returns `refresh_token: ""` (empty string)
2. No refresh endpoint support for device flow tokens
3. Bearer plugin v1.3.34 doesn't support `expiresIn` parameter (TypeScript type lacks it)
4. Session `expiresIn` controls bearer token lifetime

**Industry Precedent (CLI Tools):**
- AWS CLI: 43800 minutes (30.4 days)
- GitHub CLI: 8 hours (web) to 60 days (device flow)
- Heroku CLI: 1 year
- Most CLI tools use long-lived tokens, not refresh

**MCP Server Use Pattern:**
- Infrequent use (like CLI tools), not continuous operation
- User launches Claude Desktop → MCP server starts → handles requests → terminates
- Not a long-running background service

## Decision

**We will use 30-day long-lived tokens (Option B) with automatic expiry detection and re-authentication.**

**API Configuration:**
```typescript
// apps/api/src/auth/config.ts
session: {
  expiresIn: 60 * 60 * 24 * 30, // 30 days
  updateAge: 60 * 60 * 24 * 7,  // Refresh session weekly
},
plugins: [
  bearer({
    // Tokens inherit session expiresIn (30 days)
    // Note: v1.3.34 doesn't support expiresIn parameter on bearer()
  }),
  deviceAuthorization({
    expiresIn: "30m", // Device code expiration
    interval: "5s",
  }),
]
```

**MCP Server Implementation:**
1. Check token expiry on startup using `isTokenExpired()`
2. If expired: trigger automatic device flow
3. Log expiry information (timestamp + days remaining)
4. Store credentials with `expires_at` timestamp

## Consequences

### Positive

✅ **Simpler Implementation**
- No refresh logic complexity
- No token rotation handling
- No 401 retry mechanisms
- No race condition management

✅ **Better UX for MCP Use Case**
- Transparent re-authentication when needed
- Clear expiry notifications
- No silent failures
- Follows familiar CLI tool patterns

✅ **Follows Industry Standards**
- AWS CLI, GitHub CLI, Heroku CLI all use similar approaches
- 30 days is sufficient for MCP server use patterns
- Aligns with CLI tool expectations

✅ **Reduced Attack Surface**
- No refresh token handling to compromise
- Simpler code = fewer security vulnerabilities
- Clear token lifecycle

### Negative

❌ **Monthly Re-Authentication Required**
- Users must complete device flow every 30 days
- Cannot extend indefinitely (vs. refresh which could)
- Slight UX friction compared to refresh

❌ **Better Auth Limitation Workaround**
- Not using refresh_token feature (though it's not provided anyway)
- If Better Auth adds device flow refresh support later, we'll need to revisit

### Mitigations

1. **Clear Expiry Notifications**
   - Log: `📅 Token expires: 2025-02-28T12:00:00Z (in ~28 days)`
   - Users know when re-auth is coming

2. **Automatic Re-Authentication**
   - Server detects expiry on startup
   - Triggers device flow automatically
   - No manual credential deletion needed

3. **Test Script**
   - `pnpm test:expiry` validates behavior
   - Simulates expired tokens
   - Documents expected flow

4. **README Documentation**
   - Token lifetime clearly documented
   - Troubleshooting section for expired tokens
   - Industry precedent explained

## Code Affected

**Modified Files:**
- `apps/api/src/auth/config.ts` - Added session.expiresIn (30 days)
- `apps/mcp-server/src/index.ts` - Added isTokenExpired() check on startup
- `apps/mcp-server/src/auth/device-flow.ts` - Added expiry logging
- `apps/mcp-server/scripts/test-token-expiry.ts` - Validation test script
- `apps/mcp-server/README.md` - Token lifetime documentation
- `docs/mcp-server-production-readiness.md` - Updated status to PRODUCTION READY

**Related Files (No Changes Needed):**
- `apps/mcp-server/src/auth/token-store.ts` - isTokenExpired() already existed
- `apps/mcp-server/src/adapters/http-api-client.ts` - No refresh logic needed

## Alternatives Considered

### Alternative A: Implement Custom Refresh Endpoint
**Rejected:** Requires custom API endpoint, doesn't align with Better Auth patterns, adds complexity.

### Alternative B: Upgrade Better Auth to Newer Version
**Rejected:** Canary/newer versions may have different APIs, not yet stable, high risk for production.

### Alternative C: Extremely Long Tokens (90-365 days)
**Rejected:** Security risk of long-lived credentials, violates principle of least privilege duration.

## Reversibility

This decision is **easily reversible** if Better Auth adds device flow refresh support:

1. Update to newer Better Auth version
2. Verify `refresh_token` is provided in device flow response
3. Implement refresh logic in `http-api-client.ts`
4. Update `index.ts` to try refresh before re-auth
5. Adjust token lifetime back to shorter duration (7 days)

Migration path is straightforward since we already store `refresh_token` field (currently empty).

## References

- **Investigation:** `apps/mcp-server/docs/TOKEN_REFRESH_INVESTIGATION.md`
- **RFC 8628:** OAuth 2.0 Device Authorization Grant
- **Better Auth Docs:** https://www.better-auth.com/docs/plugins/bearer
- **AWS CLI Token Lifetime:** https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- **GitHub CLI:** https://cli.github.com/manual/gh_auth_login
- **Production Readiness:** `docs/mcp-server-production-readiness.md`

## Related Tasks

- Implements solution for production readiness assessment
- Resolves token refresh investigation findings
- Enables v0.2.0 production-ready release
