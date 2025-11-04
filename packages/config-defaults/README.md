# Configuration Defaults Package

**Single source of truth for all environment variable defaults across the Cronicorn monorepo.**

## Purpose

This package ensures consistency and maintainability by centralizing all default values for:
- Development ports
- Database configuration
- Application URLs
- Authentication defaults
- Payment provider defaults

## Usage

Import shared defaults in your app's config file:

```typescript
import { DEV_DATABASE, DEV_PORTS, DEV_URLS, DEV_AUTH, DEV_STRIPE } from "@cronicorn/config-defaults";
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().url().default(DEV_DATABASE.URL),
  PORT: z.coerce.number().int().positive().default(DEV_PORTS.API),
  WEB_URL: z.string().url().default(DEV_URLS.WEB),
  // ... etc
});
```

## Security

⚠️ **WARNING**: All defaults in this package are for **LOCAL DEVELOPMENT ONLY**.

Production deployments MUST override:
- `DEV_AUTH.SECRET` - Generate with: `openssl rand -base64 32`
- `DEV_AUTH.ADMIN_PASSWORD` - Use strong, unique password
- `DEV_STRIPE.*` - Use real Stripe API keys

Use `validateNotDevDefaultInProduction()` to prevent using dev defaults in production:

```typescript
const warnings = [
  validateNotDevDefaultInProduction(config.NODE_ENV, config.SECRET, "SECRET"),
].filter(Boolean);

if (warnings.length > 0 && config.NODE_ENV === "production") {
  console.error(warnings.join("\n"));
  process.exit(1);
}
```

## Exports

### Constants

- `DEV_PORTS` - Standard development ports (API: 3333, Web: 5173, DB: 6666, Docs: 3000)
- `DEV_DATABASE` - Database configuration matching docker-compose.dev.yml
- `DEV_URLS` - Application URLs derived from ports
- `DEV_AUTH` - Authentication defaults (admin user + secret)
- `DEV_STRIPE` - Dummy Stripe configuration for local dev
- `DEV_ENV` - Environment defaults (NODE_ENV, LOG_LEVEL)

### Functions

- `validateNotDevDefaultInProduction(nodeEnv, secret, secretName)` - Security check

## Consistency Rules

When adding a new default:

1. **Add it here first** - Don't hardcode in individual apps
2. **Document why** - Explain the choice in comments
3. **Mark security concerns** - Use ⚠️ for sensitive values
4. **Keep ports simple** - Hardcode for dev, only customize for production

## Updating Defaults

To change a default value:

1. Update the constant in `src/index.ts`
2. Run `pnpm build:packages` to rebuild
3. Verify all apps still work: `pnpm test`

## Related Files

- `.env.example` - Shows all available overrides
- `.env.minimal` - Demonstrates zero-config setup
- Individual app `config.ts` files - Import and use these defaults
