---
id: developer-authentication
title: Authentication Configuration
description: Configure GitHub OAuth, API keys, and programmatic access
tags:
  - developer
  - configuration
sidebar_position: 2
mcp:
  uri: file:///docs/developers/authentication.md
  mimeType: text/markdown
  priority: 0.8
---

# Authentication Configuration

> **Getting started?** See [Quick Start](./quick-start.md) - no configuration required for local development.

This guide covers advanced authentication setup: GitHub OAuth for production, API keys, and programmatic access.

## Authentication Methods

| Method | Use Case | Setup Required |
|--------|----------|----------------|
| Admin User | Local dev, self-hosting | None (works by default) |
| GitHub OAuth | Production with multiple users | GitHub OAuth app |
| API Keys | Service-to-service | Generate in web UI |
| Bearer Tokens | CLI/AI agents | Device authorization flow |

## GitHub OAuth Setup

Best for production deployments with multiple users.

**1. [Create GitHub OAuth app](https://github.com/settings/developers)**

**2. Set callback URL:**
```
${BETTER_AUTH_URL}/api/auth/callback/github
```
Example: `https://api.yourdomain.com/api/auth/callback/github`

**3. Add to `.env`:**
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

**4. Restart the app** - "Sign in with GitHub" button will appear

## Programmatic Access

### API Keys

Generate in web UI at `/settings/api-keys`:

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3333/api/jobs
```

### Bearer Tokens (CLI/AI Agents)

Use the OAuth device authorization flow:

```bash
# 1. Initiate device flow
curl -X POST http://localhost:3333/api/auth/device/code

# 2. User authorizes in browser at the provided URL

# 3. Poll for token
curl -X POST http://localhost:3333/api/auth/device/token \
  -d "device_code=DEVICE_CODE"

# 4. Use in API requests
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3333/api/jobs
```

## Production Configuration

```bash
# Required: Secure secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars

# Required: Production URLs
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com

# Option A: Admin user for emergency access
ADMIN_USER_EMAIL=admin@yourdomain.com
ADMIN_USER_PASSWORD=${SECRET_FROM_VAULT}

# Option B: GitHub OAuth for regular users
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
```

> ⚠️ **Security**: Use a secrets manager in production, not plain `.env` files.

## Validation Rules

At least one authentication method must be configured:

| Configuration | Status |
|---------------|--------|
| Admin user only | ✅ Works |
| GitHub OAuth only | ✅ Works |
| Both enabled | ✅ Works |
| Neither enabled | ❌ App won't start |

## Troubleshooting

**Login returns 404?**  
→ Restart API server after changing `.env`

**Admin user not created?**  
→ Run `pnpm db:seed` or check logs for "Admin user created"

**GitHub OAuth not working?**  
→ Verify callback URL matches `${BETTER_AUTH_URL}/api/auth/callback/github`
