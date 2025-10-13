# Dual Authentication Architecture

## Overview

Our API supports **two authentication methods** using Better Auth:
1. **GitHub OAuth** - For interactive users (future web UI)
2. **API Keys** - For service-to-service authentication

**Key Insight**: Both methods use a **single unified middleware** with zero custom dual-auth logic.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Incoming Requests                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Auth Middleware                         │
│  (Better Auth api.getSession checks BOTH sources)           │
│                                                              │
│  Checks:                                                     │
│  1. Session Cookie (from GitHub OAuth)                      │
│  2. x-api-key Header (from API key)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │  GitHub OAuth     │       │  API Key Auth     │
    │  Session          │       │  (x-api-key)      │
    └───────────────────┘       └───────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Session Created  │
                    │ { userId,        │
                    │   tenantId }     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Route Handler    │
                    │ (Domain Logic)   │
                    └──────────────────┘
```

---

## Authentication Flows

### Flow 1: GitHub OAuth (UI Users)

**Use Case**: Human users signing in via web interface

```typescript
// 1. User clicks "Sign in with GitHub"
//    Frontend redirects to:
GET /api/auth/sign-in/social/github

// 2. Better Auth redirects to GitHub
//    User authorizes app on GitHub

// 3. GitHub redirects back with code
GET /api/auth/callback/github?code=...

// 4. Better Auth exchanges code for token
//    Creates user in database (if new)
//    Sets session cookie

// 5. User now authenticated
//    All requests include session cookie automatically
POST /api/v1/jobs
Cookie: better_auth.session_token=...
```

**Session Storage**: HTTP-only cookie (secure, automatic)

---

### Flow 2: API Key (Services)

**Use Case**: Backend services, CLIs, webhooks, automation

```typescript
// 1. User signs in via GitHub (to create account)
//    See Flow 1 above

// 2. User creates API key
POST /api/auth/api-key/create
Cookie: better_auth.session_token=...
Body: { name: "My Service Key", expiresIn: 86400 }

Response: {
  key: "cron_abc123...", // SAVE THIS - only shown once!
  id: "key_xyz",
  name: "My Service Key",
  expiresAt: "2024-12-31T23:59:59Z"
}

// 3. Service uses API key for all requests
POST /api/v1/jobs
x-api-key: cron_abc123...
```

**Session Storage**: Header-based (stateless, portable)

---

## Implementation Details

### Better Auth Configuration

```typescript
// apps/api/src/auth/config.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  
  // GitHub OAuth for UI users
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
  
  // API Key plugin for service auth
  plugins: [
    apiKey({
      sessionForAPIKeys: true, // 🔑 KEY FEATURE: API keys create sessions
      apiKeyHeaders: 'x-api-key',
      defaultPrefix: 'cron_',
      rateLimit: {
        enabled: true,
        timeWindow: 60 * 1000,
        maxRequests: 100,
      },
    }),
  ],
})
```

### Unified Auth Middleware

```typescript
// apps/api/src/auth/middleware.ts
export async function authMiddleware(c: Context, next: Next) {
  // Better Auth automatically checks BOTH:
  // 1. Session cookies (GitHub OAuth)
  // 2. x-api-key header (API keys)
  const session = await auth.api.getSession({ 
    headers: c.req.raw.headers 
  })
  
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // Extract tenant from user (works for both auth types)
  const tenantId = session.user.tenantId
  
  c.set('session', { 
    userId: session.user.id, 
    tenantId 
  })
  
  return next()
}
```

**Why This Works**:
- Better Auth's `apiKey` plugin with `sessionForAPIKeys: true` creates a **mock session** from API keys
- This means `auth.api.getSession()` returns a session for **both** auth types
- Domain code receives identical `{ userId, tenantId }` - doesn't care about auth method

---

## API Key Management

### Built-in Endpoints (Better Auth)

Better Auth provides these endpoints automatically:

| Endpoint                       | Method | Auth Required  | Purpose                  |
| ------------------------------ | ------ | -------------- | ------------------------ |
| `/api/auth/api-key/create`     | POST   | Session Cookie | Create new API key       |
| `/api/auth/api-key/list`       | GET    | Session Cookie | List user's API keys     |
| `/api/auth/api-key/get?id=...` | GET    | Session Cookie | Get single key details   |
| `/api/auth/api-key/update`     | POST   | Session Cookie | Update key name/settings |
| `/api/auth/api-key/delete`     | POST   | Session Cookie | Revoke API key           |

### Key Features

**Creation**:
```bash
curl -X POST http://localhost:3000/api/auth/api-key/create \
  -H "Cookie: better_auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Service","expiresIn":2592000}'

# Response includes actual key (only time you'll see it!)
{
  "key": "cron_abc123def456...",
  "id": "key_xyz",
  "name": "Production Service",
  "expiresAt": "2024-01-31T12:00:00Z"
}
```

**Usage**:
```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: cron_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Scheduled Job","url":"https://api.example.com/webhook",...}'
```

**Security**:
- ✅ Keys are hashed in database (bcrypt)
- ✅ Actual key value only returned once at creation
- ✅ List/get endpoints never show key values
- ✅ Rate limiting per key (configurable)
- ✅ Expiration dates supported
- ✅ Revocation via delete endpoint

---

## Security Considerations

### GitHub OAuth
- ✅ HTTP-only cookies (XSS protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ CSRF protection built-in
- ✅ OAuth state validation
- ✅ Short-lived tokens

### API Keys
- ✅ Keys hashed in database (not plaintext)
- ✅ Header-based (no cookie/CORS issues)
- ✅ Per-key rate limiting
- ✅ Expiration supported
- ✅ Easy revocation
- ⚠️ **User responsibility**: Store keys securely (env vars, secrets manager)

### Best Practices
1. **GitHub OAuth**: For any interactive user interface
2. **API Keys**: For programmatic access only
3. **Never** expose API keys in client-side code
4. **Rotate** API keys regularly
5. **Set expiration** for API keys (e.g., 30 days)
6. **Monitor** API key usage via rate limit metrics
7. **Revoke** immediately if compromised

---

## User Experience

### For UI Users (GitHub OAuth)
1. Navigate to application
2. Click "Sign in with GitHub"
3. Authorize on GitHub
4. Redirected back, automatically signed in
5. Create jobs via UI (session cookie sent automatically)

### For Service Users (API Keys)
1. Sign in via GitHub (one-time setup)
2. Navigate to Settings → API Keys
3. Click "Create New Key"
4. Set name and expiration
5. **Copy key immediately** (only shown once!)
6. Add key to service environment: `X_API_KEY=cron_abc123...`
7. Service makes authenticated requests with header

---

## Testing Both Auth Methods

### Test GitHub OAuth
```bash
# 1. Open browser, navigate to:
http://localhost:3000/api/auth/sign-in/social/github

# 2. Authorize on GitHub

# 3. Use session cookie in subsequent requests
curl http://localhost:3000/api/v1/jobs \
  -H "Cookie: better_auth.session_token=..." \
  --cookie-jar cookies.txt
```

### Test API Key
```bash
# 1. Create key (requires session from above)
curl -X POST http://localhost:3000/api/auth/api-key/create \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'

# Save the returned key value

# 2. Use key for requests
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: cron_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Job","url":"https://example.com",...}'
```

---

## Future Enhancements

### Permissions System (Optional)
Better Auth's API key plugin supports permissions:

```typescript
apiKey({
  permissions: {
    defaultPermissions: {
      jobs: ['read', 'write'],
      runs: ['read'],
    }
  }
})

// When creating key:
const key = await auth.api.createApiKey({
  body: {
    name: "Read-only Key",
    permissions: {
      jobs: ['read'],
      runs: ['read']
    }
  }
})

// When verifying:
const result = await auth.api.verifyApiKey({
  body: {
    key: "cron_abc...",
    permissions: { jobs: ['write'] } // Check if key has write access
  }
})
```

**Use Cases**:
- Read-only keys for monitoring
- Write-only keys for ingestion
- Admin keys for management

### Metadata (Optional)
Store additional info with keys:

```typescript
const key = await auth.api.createApiKey({
  body: {
    name: "Service X Key",
    metadata: {
      serviceName: "webhook-processor",
      environment: "production",
      owner: "platform-team"
    }
  }
})
```

**Use Cases**:
- Track which service owns key
- Store environment info
- Add team/project metadata
- Audit trail

---

## ADR Reference

See `.adr/XXXX-dual-auth-strategy.md` for architectural decision rationale.

## Summary

✅ **Zero custom dual-auth logic** - Better Auth handles everything  
✅ **One middleware** - Works for both OAuth and API keys  
✅ **Built-in management** - API key CRUD endpoints provided  
✅ **Security** - Keys hashed, rate limited, expirable  
✅ **User-friendly** - Simple flow for both UI and service users  
✅ **Future-proof** - Easy to add permissions, metadata later  
