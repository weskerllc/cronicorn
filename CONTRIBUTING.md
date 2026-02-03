# Contributing to Cronicorn

Thanks for your interest in contributing to Cronicorn!

## Getting Started

See the [Developer Documentation](./docs/contributors/README.md) for:

- **[Quick Start](./docs/contributors/quick-start.md)** - Set up your development environment
- **[Authentication](./docs/contributors/authentication.md)** - Configure auth for development
- **[Environment Configuration](./docs/contributors/environment-configuration.md)** - Environment variables reference
- **[Quality Checks](./docs/contributors/quality-checks.md)** - Testing and linting requirements
- **[Workspace Structure](./docs/contributors/workspace-structure.md)** - Monorepo organization

## Quick Setup

```bash
git clone https://github.com/weskerllc/cronicorn.git
cd cronicorn
pnpm install
pnpm db
pnpm db:migrate
pnpm dev
```

Login at http://localhost:5173 with `admin@example.com` / `devpassword`.

## Before Submitting a PR

```bash
pnpm test           # Run tests
pnpm lint:fix       # Fix linting issues
pnpm build          # Verify build
```

## Architecture

Cronicorn uses hexagonal architecture. See the `.adr/` folder for 63+ Architecture Decision Records documenting key design decisions.

## Questions?

Open a [Discussion](https://github.com/weskerllc/cronicorn/discussions) or [Issue](https://github.com/weskerllc/cronicorn/issues).
