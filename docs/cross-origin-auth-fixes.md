# Cross-Origin Auth Implementation Summary

## Issues Fixed

### 1. ✅ OAuth Redirects to Port 3000
**Problem**: After GitHub login, users were redirected to `localhost:3000` (API) instead of `localhost:5173` (web UI)

**Solution**: Added `callbackURL` parameter to all social sign-in calls:
```typescript
await signIn.social({ 
  provider: "github",
  callbackURL: "/",  // Redirects to web UI home page
});
```

### 2. ✅ Hardcoded URLs (Not Production-Ready)
**Problem**: URLs hardcoded to `localhost:5173` and `localhost:3000` throughout codebase

**Solution**: Environment variable configuration:

**API Server** (`apps/api/.env`):
```bash
WEB_URL=http://localhost:5173      # Frontend origin for CORS
BETTER_AUTH_URL=http://localhost:3000  # API base URL
API_URL=http://localhost:3000       # OpenAPI docs URL
```

**Web UI** (`apps/web/.env.local`):
```bash
VITE_API_URL=http://localhost:3000  # API server URL
```

### 3. ✅ No Logout Button
**Problem**: Users couldn't log out

**Solution**: Added logout button to home page:
```typescript
const handleLogout = async () => {
  await signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = "/login";
      },
    },
  });
};
```

## Files Changed

### API Server
- ✅ `apps/api/src/lib/config.ts` - Added `WEB_URL` to environment schema
- ✅ `apps/api/src/auth/config.ts` - Use `config.WEB_URL` for trustedOrigins, explicit redirectURI
- ✅ `apps/api/src/app.ts` - Use `config.WEB_URL` for CORS origin
- ✅ `apps/api/.env.example` - Added WEB_URL and API_URL
- ✅ `apps/api/.env.production.example` - Production template

### Web UI
- ✅ `apps/web/src/lib/auth-client.ts` - Use `import.meta.env.VITE_API_URL`
- ✅ `apps/web/src/routes/login.tsx` - Added `callbackURL` to OAuth flows
- ✅ `apps/web/src/routes/index.tsx` - Added logout button
- ✅ `apps/web/.env.example` - Development template
- ✅ `apps/web/.env.local` - Local development config
- ✅ `apps/web/.env.production.example` - Production template

### Documentation
- ✅ `docs/cross-origin-auth-setup.md` - Complete setup guide
- ✅ `docs/_RUNNING_TECH_DEBT.md` - Updated with cross-origin implementation

## Environment Setup

### Development (Current)

**Start API**:
```bash
cd apps/api
# Ensure .env has:
# WEB_URL=http://localhost:5173
# BETTER_AUTH_URL=http://localhost:3000
pnpm dev
```

**Start Web UI**:
```bash
cd apps/web
# Ensure .env.local has:
# VITE_API_URL=http://localhost:3000
pnpm dev
```

**Test**:
1. Navigate to `http://localhost:5173`
2. Click "Login"
3. Click "Login with Github"
4. After GitHub auth, should redirect to `http://localhost:5173/` (not port 3000)
5. Click "Logout" button to test logout flow

### Production Deployment

**API Server Environment Variables**:
```bash
WEB_URL=https://yourdomain.com
BETTER_AUTH_URL=https://api.yourdomain.com
API_URL=https://api.yourdomain.com
GITHUB_CLIENT_ID=prod-client-id
GITHUB_CLIENT_SECRET=prod-client-secret
```

**Web UI Build-Time Variables**:
```bash
VITE_API_URL=https://api.yourdomain.com
```

**GitHub OAuth App**:
- Create separate app for production
- Callback URL: `https://api.yourdomain.com/api/auth/callback/github`
- Homepage URL: `https://yourdomain.com`

## Testing Checklist

- [ ] Email/password registration works
- [ ] GitHub OAuth login redirects back to web UI (not API)
- [ ] Session persists across page refreshes
- [ ] Logout button clears session and redirects to login
- [ ] Protected routes return 401 without auth
- [ ] Public routes accessible without auth
- [ ] Cookies work cross-origin (credentials: "include")

## Next Steps

1. **Test authentication flows** in your running UI
2. **Create production GitHub OAuth app** when ready to deploy
3. **Set production environment variables** in your hosting platform
4. **Verify HTTPS setup** for production (required for secure cookies)

## Troubleshooting

See `docs/cross-origin-auth-setup.md` for detailed troubleshooting guide covering:
- CORS errors
- Redirect mismatches
- Session persistence issues
- Cookie problems
