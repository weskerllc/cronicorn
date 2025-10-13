# Cross-Origin Authentication Setup

This document explains how the authentication system is configured for cross-origin requests between the web UI and API server.

## Architecture

- **Web UI**: React app running on its own domain (e.g., `https://yourdomain.com` or `http://localhost:5173`)
- **API Server**: Hono app running on separate domain (e.g., `https://api.yourdomain.com` or `http://localhost:3000`)
- **Authentication**: Better Auth handling OAuth (GitHub) and email/password

## Environment Configuration

### Development Setup

**API Server** (`apps/api/.env`):
```bash
BETTER_AUTH_URL=http://localhost:3000
WEB_URL=http://localhost:5173
API_URL=http://localhost:3000
GITHUB_CLIENT_ID=your-dev-github-client-id
GITHUB_CLIENT_SECRET=your-dev-github-client-secret
```

Register GitHub OAuth callback URL: `http://localhost:3000/api/auth/callback/github`

**Web UI** (`apps/web/.env.local`):
```bash
VITE_API_URL=http://localhost:3000
```

### Production Setup

**API Server** (`apps/api/.env`):
```bash
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
GITHUB_CLIENT_ID=your-prod-github-client-id
GITHUB_CLIENT_SECRET=your-prod-github-client-secret
```

Register GitHub OAuth callback URL: `https://api.yourdomain.com/api/auth/callback/github`

**Web UI** (set via deployment platform environment variables):
```bash
VITE_API_URL=https://api.yourdomain.com
```

## How It Works

### 1. OAuth Redirect Flow

When a user clicks "Login with GitHub":

1. **Client initiates**: `signIn.social({ provider: "github", callbackURL: "/" })`
2. **Redirects to GitHub**: User authenticates with GitHub
3. **GitHub redirects back**: To `BETTER_AUTH_URL/api/auth/callback/github` (API server)
4. **Better Auth processes**: Creates session, sets cookies
5. **Redirects to frontend**: Uses `callbackURL` parameter to redirect to `WEB_URL + "/"` (home page)

### 2. CORS Configuration

The API server allows cross-origin requests from the web UI:

```typescript
// apps/api/src/app.ts
app.use("/auth/**", cors({
    origin: config.WEB_URL,        // From environment variable
    credentials: true,              // Allow cookies
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
}));
```

### 3. Client Configuration

The web client sends credentials (cookies) with every request:

```typescript
// apps/web/src/lib/auth-client.ts
const apiUrl = import.meta.env.VITE_API_URL;

export const authClient = createAuthClient({
    baseURL: apiUrl,               // API server URL
    fetchOptions: {
        credentials: "include",     // Send cookies cross-origin
    },
});
```

### 4. Trusted Origins

Better Auth validates the client origin:

```typescript
// apps/api/src/auth/config.ts
export function createAuth(config: Env, db: Database) {
  return betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: [config.WEB_URL],  // From environment variable
    socialProviders: {
      github: {
        redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/github`,
      },
    },
  });
}
```

## Deployment Checklist

### API Server

- [ ] Set `BETTER_AUTH_URL` to your API domain
- [ ] Set `WEB_URL` to your frontend domain
- [ ] Set `API_URL` to your API domain (for OpenAPI docs)
- [ ] Generate strong `BETTER_AUTH_SECRET` (min 32 chars)
- [ ] Register GitHub OAuth app with production callback URL
- [ ] Set production `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- [ ] Enable HTTPS/SSL certificates

### Web UI

- [ ] Set `VITE_API_URL` to your API domain
- [ ] Ensure HTTPS/SSL certificates are configured
- [ ] Test OAuth flow end-to-end

### GitHub OAuth App

- [ ] Create separate OAuth apps for dev and production
- [ ] Development callback: `http://localhost:3000/api/auth/callback/github`
- [ ] Production callback: `https://api.yourdomain.com/api/auth/callback/github`
- [ ] Set Homepage URL to your web UI domain

## Testing

### Local Development

1. Start API server: `cd apps/api && pnpm dev`
2. Start web UI: `cd apps/web && pnpm dev`
3. Navigate to `http://localhost:5173`
4. Test login flows:
   - Email/password registration
   - GitHub OAuth login
   - Session persistence
   - Logout functionality

### Production

1. Deploy API server with production environment variables
2. Deploy web UI with production environment variables
3. Test the same flows as local development
4. Verify cookies are set with `Secure` and `SameSite` attributes
5. Check browser console for CORS errors

## Troubleshooting

### "CORS policy: No 'Access-Control-Allow-Origin' header"

- Verify `WEB_URL` in API `.env` matches your frontend domain exactly
- Check that CORS middleware is applied before auth routes

### "Redirect mismatch" from GitHub

- Ensure GitHub OAuth app callback URL matches `BETTER_AUTH_URL/api/auth/callback/github`
- Check that `redirectURI` in auth config matches registered callback

### Session not persisting

- Verify `credentials: "include"` is set in auth client
- Check browser allows third-party cookies (or use same domain with subdomains)
- Ensure API and web UI use HTTPS in production

### Redirects to port 3000 instead of web UI

- Verify `callbackURL` is set in `signIn.social()` calls
- Check that Better Auth is configured with correct `baseURL`
