---
applyTo: '**'
---
# Running Commands in Local Development

## Quick Reference

**→ For common commands, see `docs/public/developers/quick-start.md`**

## Environment Variables

All environment variables are stored in a **single `.env` file at the repository root**. This file is used by all apps and packages.

## How Commands Work

### Use Root Package.json Scripts (Recommended)

The root `package.json` has scripts that automatically load the `.env` file using `dotenv-cli`:

```bash
# Development
pnpm dev          # Start all services
pnpm dev:api      # API server only
pnpm dev:web      # Web app only
pnpm dev:scheduler # Scheduler only

# Database
pnpm db           # Start PostgreSQL
pnpm db:migrate   # Run migrations

# Build
pnpm build        # Production build
pnpm build:packages # Build packages only

# Testing
pnpm test         # Run tests
```

All these scripts are wrapped with `dotenv -e .env --` so the `.env` file is automatically loaded.

### Running Custom Commands

If you need to run a command not in package.json:

```bash
pnpm exec dotenv -e .env -- <your-command>
```

Example:
```bash
pnpm exec dotenv -e .env -- tsx scripts/my-script.ts
```

## Dev vs Production

- **Dev mode**: Apps use `tsx watch` (no build required for apps, only packages)
- **Production**: Apps are built to `dist/` with `tsc`

The `postinstall` hook automatically builds packages after `pnpm install`. 