# Environment Configuration

> **Getting started?** See [Quick Start](./quick-start.md) - no configuration required for local development.

This is the complete reference for all environment variables. Local development works out of the box with sensible defaults.

## Default Values

All defaults are maintained in `@cronicorn/config-defaults` for consistency across apps.

### Development Defaults (No .env Required)

| Category | Variable | Default |
|----------|----------|---------|
| **Auth** | `ADMIN_USER_EMAIL` | `admin@example.com` |
| | `ADMIN_USER_PASSWORD` | `devpassword` |
| | `BETTER_AUTH_SECRET` | `dev-secret-DO-NOT-USE...` |
| **Database** | `DATABASE_URL` | `postgresql://user:password@localhost:6666/db` |
| **URLs** | `BETTER_AUTH_URL` | `http://localhost:3333` |
| | `WEB_URL` | `http://localhost:5173` |
| | `API_URL` | `http://localhost:3333` |
| **Ports** | `API_PORT` | `3333` |
| | `WEB_PORT` | `5173` |
| | `DB_PORT` | `6666` |
| **Stripe** | `STRIPE_SECRET_KEY` | `sk_test_dummy_key...` |
| | `STRIPE_WEBHOOK_SECRET` | `whsec_test_dummy...` |

⚠️ **Security**: These defaults are for local development only. Production must override them.

## Customizing for Local Development

To override defaults locally, create a `.env` file:

```bash
cp .env.example .env
# Edit only the variables you need to change
```

## Production Deployment

Production deployments MUST override these variables:

```bash
# 1. Secure auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars

# 2. Production URLs
WEB_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
BETTER_AUTH_URL=https://api.yourdomain.com

# 3. Authentication (at least one required)
ADMIN_USER_EMAIL=admin@yourcompany.com
ADMIN_USER_PASSWORD=strong-unique-password
# OR
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 4. Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

The app validates on startup and exits if dev defaults are used in production.

## Architecture

Defaults are centralized in `@cronicorn/config-defaults` and imported by each app:

```
packages/config-defaults/src/index.ts  # Single source of truth
apps/api/src/lib/config.ts             # API imports defaults
apps/scheduler/src/index.ts            # Scheduler imports defaults
apps/web/src/config.ts                 # Web imports defaults
```

## Troubleshooting

**"Cannot find module @cronicorn/config-defaults"**  
→ Run `pnpm build:packages`

**"Environment variable validation failed"**  
→ Check the error message for which variable is invalid

**"Auth not working in production"**  
→ Ensure you've overridden `BETTER_AUTH_SECRET` and `ADMIN_USER_PASSWORD`

## Related

- **[Quick Start](./quick-start.md)** - Get running with zero config
- **[Authentication](./authentication.md)** - GitHub OAuth, API keys, programmatic access
- **[Workspace Structure](./workspace-structure.md)** - Project organization
