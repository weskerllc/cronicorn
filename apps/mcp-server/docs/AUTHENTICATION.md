# MCP Server Authentication

This document explains how the Cronicorn MCP Server authenticates with the Cronicorn API using OAuth 2.0 Device Authorization Grant (RFC 8628).

## Overview

The MCP server uses **Bearer token authentication** after completing the OAuth device flow. This enables secure, user-approved access without requiring the user to enter credentials directly in the terminal.

## Authentication Flow

### 1. Device Authorization Request
When the MCP server starts without stored credentials, it initiates the device flow:

```typescript
// Request device code from API
POST /api/auth/device/code
{
  "client_id": "cronicorn-mcp-server",
  "scope": "openid profile email"
}

// Response includes:
{
  "device_code": "...",
  "user_code": "ABCD-EFGH",
  "verification_uri": "https://cronicorn.com/device/approve",
  "expires_in": 1800,
  "interval": 5
}
```

### 2. User Approval
- Browser automatically opens to: `https://cronicorn.com/device/approve?user_code=ABCD-EFGH`
- User must be logged in to GitHub (or signs in)
- User approves or denies the device authorization request

### 3. Token Polling
The MCP server polls the token endpoint every 5 seconds:

```typescript
POST /api/auth/device/token
{
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
  "device_code": "...",
  "client_id": "cronicorn-mcp-server"
}

// On success:
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 4. Credential Storage
Access token is stored in `~/.cronicorn-mcp-credentials.json`:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890
}
```

### 5. API Requests
All API requests include the Bearer token:

```typescript
Authorization: Bearer <access_token>
```

## Server-Side Authentication

The Cronicorn API uses Better Auth with three authentication methods (in order of precedence):

### 1. Session Cookie (Web UI)
- GitHub OAuth login creates session cookie
- Automatic for browser-based requests

### 2. Bearer Token (MCP/CLI)
- Enabled via Better Auth's `bearer()` plugin
- Validates device flow access tokens
- Used by MCP servers and CLI tools

### 3. API Key (Service-to-Service)
- Header: `x-api-key: <key>`
- For server-to-server communication

## Implementation Details

### Better Auth Configuration
```typescript
// apps/api/src/auth/config.ts
import { bearer, deviceAuthorization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    bearer(), // Enables Bearer token validation
    deviceAuthorization({
      expiresIn: "30m",
      interval: "5s",
    }),
    apiKey({ /* ... */ }),
  ],
});
```

### Middleware
```typescript
// apps/api/src/auth/middleware.ts
export function requireAuth(auth: Auth) {
  return async (c: Context, next: Next) => {
    // 1. Try session cookie
    const sessionResult = await auth.api.getSession({ 
      headers: c.req.raw.headers 
    });
    if (sessionResult?.user) { /* ... */ }

    // 2. Try Bearer token (device flow)
    if (authHeader?.startsWith("Bearer ")) {
      const bearerSessionResult = await auth.api.getSession({
        headers: c.req.raw.headers,
      });
      if (bearerSessionResult?.user) { /* ... */ }
    }

    // 3. Try API key
    if (apiKeyHeader) { /* ... */ }

    // 4. Reject if none valid
    throw new HTTPException(401);
  };
}
```

### HTTP Client
```typescript
// apps/mcp-server/src/adapters/http-api-client.ts
export function createHttpApiClient(config: HttpApiClientConfig): ApiClient {
  return {
    async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
      const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };
      // ... fetch logic
    },
  };
}
```

## Security Considerations

1. **Token Storage**: Credentials stored in user's home directory with restricted file permissions
2. **Token Expiry**: Access tokens expire after 1 hour (configurable)
3. **Refresh Tokens**: Supported but not yet implemented for automatic renewal
4. **Scope Limitation**: Tokens only granted scopes: `openid profile email`
5. **User Approval**: Every device must be explicitly approved by the user

## Testing Locally

1. **Start API server** (must include Bearer plugin):
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Start MCP Inspector**:
   ```bash
   cd apps/mcp-server
   pnpm inspect
   ```

3. **Complete device flow**:
   - Browser opens automatically
   - Sign in with GitHub
   - Approve device authorization

4. **Test API call**:
   - Use MCP Inspector Tools tab
   - Call `POST_jobs` with test data
   - Should succeed with 200 response

## Environment Configuration

The MCP server uses environment-based URLs:

```typescript
// Development (NODE_ENV=development)
CRONICORN_API_URL=http://localhost:3333/api
CRONICORN_WEB_URL=http://localhost:5173

// Production (NODE_ENV=production)
CRONICORN_API_URL=https://cronicorn.com/api
CRONICORN_WEB_URL=https://cronicorn.com
```

## Troubleshooting

### 401 Unauthorized
- Check that API server has `bearer()` plugin enabled
- Verify credentials file exists: `~/.cronicorn-mcp-credentials.json`
- Check token hasn't expired (compare `expires_at` to current timestamp)

### Device Code Expired
- Complete approval within 30 minutes
- Delete credentials file and restart to retry

### Browser Doesn't Open
- Manually navigate to verification URL shown in terminal
- Enter user code displayed in terminal

## References

- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628)
- [Better Auth Device Authorization](https://www.better-auth.com/docs/plugins/device-authorization)
- [Better Auth Bearer Token](https://www.better-auth.com/docs/plugins/bearer)
