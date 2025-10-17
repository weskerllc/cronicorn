# Authentication Guide

Cronicorn supports two authentication methods via Better Auth:
1. **GitHub OAuth** - For interactive users
2. **API Keys** - For programmatic access

Both methods use a **unified middleware** with zero custom dual-auth logic.

## Quick Start

### For UI Users (GitHub OAuth)
1. Navigate to app → Click "Sign in with GitHub"
2. Authorize on GitHub
3. Automatically signed in with session cookie

### For Service Users (API Keys)
1. Sign in via GitHub (one-time setup)
2. Navigate to Settings → API Keys → Create
3. Copy key (shown only once!)
4. Add to service: `x-api-key: cron_abc123...`

## How It Works

### OAuth Flow
```
1. User clicks "Login with GitHub"
   → Redirects to GitHub
2. User authorizes app
   → GitHub redirects back to API server
3. Better Auth creates session
   → Sets HTTP-only cookie
4. Redirects to frontend
   → User authenticated
```

### API Key Flow
```
1. User creates key via authenticated request
   → Better Auth generates and hashes key
2. Service includes key in header
   → Better Auth validates signature
3. Middleware creates session from key
   → Domain receives { userId, tenantId }
```

## Configuration

### Environment Variables

**API Server** (`.env`):
```bash
# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Cross-origin
WEB_URL=http://localhost:5173

# OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

**Web UI** (`.env.local`):
```bash
VITE_API_URL=http://localhost:3000
```

### Production Setup

**API Server**:
```bash
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
GITHUB_CLIENT_ID=prod-client-id
GITHUB_CLIENT_SECRET=prod-client-secret
```

**Web UI**:
```bash
VITE_API_URL=https://api.yourdomain.com
```

**GitHub OAuth App**:
- Homepage URL: `https://yourdomain.com`
- Callback URL: `https://api.yourdomain.com/api/auth/callback/github`

## Cross-Origin Setup

### CORS Configuration

The API allows cross-origin requests from the web UI:

```typescript
app.use("/auth/**", cors({
    origin: config.WEB_URL,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
}));
```

### Client Configuration

Web client sends credentials with every request:

```typescript
export const authClient = createAuthClient({
    baseURL: apiUrl,
    fetchOptions: {
        credentials: "include",  // Send cookies
    },
});
```

### Trusted Origins

Better Auth validates client origin:

```typescript
betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],
    socialProviders: {
        github: {
            redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
        },
    },
});
```

## API Key Management

### Built-in Endpoints

Better Auth provides these automatically:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/api-key/create` | POST | Cookie | Create new key |
| `/api/auth/api-key/list` | GET | Cookie | List user's keys |
| `/api/auth/api-key/get?id=...` | GET | Cookie | Get key details |
| `/api/auth/api-key/update` | POST | Cookie | Update key settings |
| `/api/auth/api-key/delete` | POST | Cookie | Revoke key |

### Creating a Key

```bash
curl -X POST http://localhost:3000/api/auth/api-key/create \
  -H "Cookie: better_auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Service","expiresIn":2592000}'
```

Response (key shown only once!):
```json
{
  "key": "cron_abc123def456...",
  "id": "key_xyz",
  "name": "Production Service",
  "expiresAt": "2024-01-31T12:00:00Z"
}
```

### Using a Key

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: cron_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Scheduled Job",...}'
```

## Security Features

### GitHub OAuth
- ✅ HTTP-only cookies (XSS protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ CSRF protection built-in
- ✅ OAuth state validation
- ✅ Short-lived tokens

### API Keys
- ✅ Keys hashed in database (bcrypt)
- ✅ Shown only once at creation
- ✅ Per-key rate limiting
- ✅ Expiration supported
- ✅ Easy revocation
- ⚠️ **User responsibility**: Store keys securely (env vars, secrets manager)

### Best Practices
1. **GitHub OAuth**: For any interactive UI
2. **API Keys**: For programmatic access only
3. **Never** expose keys in client-side code
4. **Rotate** API keys regularly
5. **Set expiration** for API keys (e.g., 30 days)
6. **Monitor** API key usage via rate limits
7. **Revoke** immediately if compromised

## Implementation Details

### Unified Middleware

```typescript
export async function authMiddleware(c: Context, next: Next) {
  // Better Auth checks BOTH:
  // 1. Session cookies (GitHub OAuth)
  // 2. x-api-key header (API keys)
  const session = await auth.api.getSession({ 
    headers: c.req.raw.headers 
  })
  
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('session', { 
    userId: session.user.id, 
    tenantId: session.user.tenantId 
  })
  
  return next()
}
```

**Why this works**: Better Auth's `apiKey` plugin with `sessionForAPIKeys: true` creates a mock session from API keys, so `getSession()` returns a session for both auth types.

## Troubleshooting

### "CORS policy: No 'Access-Control-Allow-Origin' header"
- Verify `WEB_URL` in API `.env` matches frontend domain exactly
- Check CORS middleware is applied before auth routes

### "Redirect mismatch" from GitHub
- Ensure GitHub OAuth app callback URL matches `BETTER_AUTH_URL/api/auth/callback/github`
- Check `redirectURI` in auth config matches registered callback

### Session not persisting
- Verify `credentials: "include"` in auth client
- Check browser allows cookies
- Ensure HTTPS in production

### Redirects to wrong URL
- Verify `callbackURL` is set in `signIn.social()` calls
- Check Better Auth `baseURL` configuration

## Related Documentation

- [ADR-0011: Dual Auth Implementation](../.adr/0011-dual-auth-implementation.md)
- [Quickstart Guide](./quickstart.md)
- [Architecture Guide](./architecture.md)
