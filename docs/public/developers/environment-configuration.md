---
id: environment-configuration
title: Environment Configuration
description: Understanding Cronicorn's zero-config approach and environment variables
tags:
  - developer
  - configuration
  - setup
sidebar_position: 2
---

# Environment Configuration

## Zero-Config Local Development

Cronicorn is designed for **zero-configuration local development**. All environment variables have sensible defaults, so you can run the entire stack without creating a `.env` file.

```bash
# That's it - no .env file needed!
pnpm install
pnpm db
pnpm db:migrate
pnpm dev
```

Login at http://localhost:5173 with:
- Email: `admin@example.com`
- Password: `devpassword`

## How It Works

### Centralized Defaults

All default values are maintained in a single package: `@cronicorn/config-defaults`

This ensures:
- **Consistency** - Same defaults across all apps (API, scheduler, ai-planner, web)
- **Maintainability** - One place to update defaults
- **Type safety** - TypeScript constants prevent typos
- **Security** - Production validation prevents using dev defaults

### Development Defaults

| Category | Variable | Default Value |
|----------|----------|---------------|
| **Ports** | API_PORT | 3333 |
| | WEB_PORT | 5173 |
| | DB_PORT | 6666 |
| **Database** | DATABASE_URL | postgresql://user:password@localhost:6666/db |
| **Auth** | ADMIN_USER_EMAIL | admin@example.com |
| | ADMIN_USER_PASSWORD | devpassword |
| | BETTER_AUTH_SECRET | dev-secret-DO-NOT-USE-IN-PRODUCTION-min32chars |
| **URLs** | BETTER_AUTH_URL | http://localhost:3333 |
| | WEB_URL | http://localhost:5173 |
| | API_URL | http://localhost:3333 |
| **Stripe** | STRIPE_SECRET_KEY | sk_test_dummy_key_for_local_dev_only |
| | STRIPE_WEBHOOK_SECRET | whsec_test_dummy_secret_for_local_dev |

⚠️ **Security Warning**: These are insecure defaults for local development only. Production deployments MUST override these values.

## Customizing Configuration


### Full Configuration (.env.example)

For production or advanced setup:

```bash
# Copy the full example
cp .env.example .env

# Edit with your production values
vim .env
```

See all available variables with descriptions in `.env.example`.

## Production Deployment

### Required Changes

Production deployments MUST set these variables:

```bash
# 1. Secure auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars

# 2. Choose authentication method:
# Option A: Admin User
ADMIN_USER_EMAIL=admin@yourcompany.com
ADMIN_USER_PASSWORD=strong-unique-password

# Option B: GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 3. Real Stripe keys (if using payments)
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
STRIPE_PRICE_PRO=price_live_pro_monthly
STRIPE_PRICE_ENTERPRISE=price_live_enterprise_monthly

# 4. Production URLs
BASE_URL=https://your-production-domain.com
WEB_URL=https://your-production-domain.com
API_URL=https://api.your-production-domain.com
BETTER_AUTH_URL=https://api.your-production-domain.com
```

### Production Validation

The application automatically validates that dev defaults are not used in production:

```typescript
// Automatically runs on startup in production
if (NODE_ENV === "production") {
  // Checks BETTER_AUTH_SECRET, ADMIN_USER_PASSWORD, STRIPE_SECRET_KEY
  // Exits with error if using dev defaults
}
```

## Configuration Architecture

### Per-App Config Files

Each app has its own configuration file that imports shared defaults:

```
apps/
  api/src/lib/config.ts          # API server config
  scheduler/src/index.ts          # Scheduler worker config  
  ai-planner/src/index.ts         # AI planner config
  web/src/config.ts               # Web app config
```

### Shared Defaults Package

```
packages/
  config-defaults/
    src/index.ts                  # Single source of truth
    README.md                     # Usage documentation
```

## Best Practices

### Local Development
- ✅ Use defaults (empty .env or .env.minimal)
- ✅ Override only what you need to test
- ✅ Keep .env out of git (already in .gitignore)

### Production
- ✅ Set all required variables explicitly
- ✅ Use secure secrets (never dev defaults)
- ✅ Validate with `NODE_ENV=production` locally first
- ✅ Use environment-specific .env files (.env.production, .env.staging)

### Team Development
- ✅ Document custom local overrides in team wiki (not in .env)
- ✅ Keep .env.example up to date
- ✅ Use the same default ports to avoid conflicts
- ✅ Update shared defaults in config-defaults package only

## Troubleshooting

### "Cannot find module @cronicorn/config-defaults"

Run `pnpm build:packages` to build the shared config package:

```bash
pnpm build:packages
```

### "Environment variable validation failed"

Check the error message for which variable is invalid:

```bash
# See current environment
pnpm exec dotenv -e .env -- env | grep -E "(DATABASE_URL|STRIPE|ADMIN|GITHUB)"
```

### "Auth not working in production"

Ensure you've overridden the dev defaults:

```bash
# Never use these in production:
ADMIN_USER_PASSWORD=devpassword  # ❌
BETTER_AUTH_SECRET=dev-secret-DO-NOT-USE-IN-PRODUCTION-min32chars  # ❌
```

## Related

- **[Quick Start](./quick-start.md)** - Get started with development
- **[Quality Checks](./quality-checks.md)** - Testing and validation
- **[Workspace Structure](./workspace-structure.md)** - Project organization
