# Environment Configuration

This app uses the **root-level `.env` file** shared across the entire monorepo via `dotenv-cli`.

## Setup

1. Copy `.env.example` to `.env` in the repository root
2. Update values as needed
3. Run `pnpm dev` from the root (automatically loads root `.env`)

## Why No Local .env?

All apps in this monorepo share configuration via `dotenv -e .env` pattern (see root `package.json` scripts).

This ensures:
- ✅ Single source of truth
- ✅ Consistent configuration across all apps
- ✅ Simpler development workflow
- ✅ No duplication or drift

See root `.env.example` for all available variables.
