---
id: developer-authentication
title: Authentication Configuration
description: Configure authentication methods for your Cronicorn deployment
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

Cronicorn supports two authentication methods. At least one must be enabled.

## Quick Reference

```bash
# Admin User (local dev, CI/CD)
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=your-secure-password-min-8-chars

# GitHub OAuth (production)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Choose based on your use case:**
- **Local Dev**: Admin user only (no OAuth setup needed)
- **Production**: GitHub OAuth (for multiple users)
- **Hybrid**: Both (admins use email, users use GitHub)

## Admin User Setup

Perfect for development and self-hosting.

**1. Edit `.env`:**
```bash
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=your-secure-password
ADMIN_USER_NAME=Admin  # Optional
```

**2. Restart the app** - admin user auto-created on startup

**3. Login** at `http://localhost:5173/login` with your email/password

**Benefits**: ✅ No OAuth app needed, ✅ Works offline, ✅ Perfect for CI/CD

## GitHub OAuth Setup

Best for production with multiple users.

**1. [Create GitHub OAuth app](https://github.com/settings/developers)**

**2. Set callback URL:**
```
${BETTER_AUTH_URL}/api/auth/callback/github
```
Example: `http://localhost:3333/api/auth/callback/github`

**3. Add to `.env`:**
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

**4. Login** - click "Sign in with GitHub" button

## Validation Rules

**At least one method required.** App validates on startup:

| Configuration | Status |
|---------------|--------|
| Admin user only | ✅ Works |
| GitHub OAuth only | ✅ Works |
| Both enabled | ✅ Works |
| Neither enabled | ❌ Fails |

## Required Environment Variables

### Base Config (Always Required)

```bash
DATABASE_URL=postgresql://user:password@localhost:6666/db
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3333
WEB_URL=http://localhost:5173
```

### Admin User (Optional*)

| Variable | Description |
|----------|-------------|
| `ADMIN_USER_EMAIL` | Valid email address |
| `ADMIN_USER_PASSWORD` | Minimum 8 characters |
| `ADMIN_USER_NAME` | Display name (optional) |

*Required if GitHub OAuth not configured

### GitHub OAuth (Optional*)

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | From GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth app |

*Required if admin user not configured

## Common Issues

### Admin user not created

1. Check both `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` are in `.env`
2. Restart the application
3. Check logs for "Admin user created successfully"

### Login returns 404

1. Restart API server after changing `.env`
2. Verify: `curl http://localhost:3333/api/auth/config`

### Wrong credentials

1. Check email/password match `.env` exactly (case-sensitive)
2. Password must be at least 8 characters
3. Remove any extra whitespace

## Production Configuration

**Admin for emergency access:**
```bash
ADMIN_USER_EMAIL=admin@yourdomain.com
ADMIN_USER_PASSWORD=${SECRET_FROM_VAULT}
```

**GitHub for regular users:**
```bash
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

**Security**: Use secrets manager, not plain `.env` files

## Programmatic Access

### Bearer Tokens (CLI/AI Agents)

```bash
# 1. Initiate device flow
curl -X POST http://localhost:3333/api/auth/device/code

# 2. User authorizes in browser

# 3. Poll for token
curl -X POST http://localhost:3333/api/auth/device/token \
  -d "device_code=DEVICE_CODE"

# 4. Use in API requests
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3333/api/jobs
```

### API Keys

Generate in web UI at `/settings/api-keys`:

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3333/api/jobs
```
