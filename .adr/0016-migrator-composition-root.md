# Migrator Composition Root

**Date:** 2025-10-15  
**Status:** Accepted

## Context

Database migrations were initially managed by a script in `packages/adapter-drizzle/src/migrate.ts` that directly read `process.env.DATABASE_URL`. This violated our architectural principle that adapters should be pure implementations of ports without environment dependencies.

The adapter package was mixing concerns:
- Runtime repository implementations (DrizzleJobsRepo, DrizzleRunsRepo)
- Build-time migration tooling (migrate.ts script)
- Environment configuration (reading DATABASE_URL)

This made the adapter feel like a composition root (apps/api, apps/scheduler) rather than a pure dependency, which was architecturally incorrect.

## Decision

Created `apps/migrator` as a dedicated composition root for database migrations:

**Adapter responsibilities** (`packages/adapter-drizzle`):
- Export pure `runMigrations(config)` function
- Define schema and generate migration files
- Provide repository implementations

**Migrator app responsibilities** (`apps/migrator`):
- Read `DATABASE_URL` from environment
- Wire configuration into `runMigrations()`
- Handle process exit codes
- Run as Docker container in deployment pipeline

**Docker deployment strategy**:
- Migrator service runs with `restart: "no"` (one-shot execution)
- API and Scheduler depend on `migrator: condition: service_completed_successfully`
- If migrations fail, services never start (fail-fast safety)
- Migrations run exactly once per deployment

**Docker Compose profiles** (unified single file):
- No profile: Database only (local dev)
- `dev` profile: Database + Migrator
- `prod` profile: Full stack (Database + Migrator + API + Scheduler)
- Environment variables parameterized via `.env.docker.dev` / `.env.docker.prod`
- Single `docker-compose.yml` replaced separate dev/prod files

**TypeScript build fix**:
- Added `**/*.tsbuildinfo` to `.dockerignore`
- Without this, `tsc -b` saw cached build metadata and skipped compilation
- Now full rebuild happens in Docker, generating dist folders correctly

## Consequences

**Benefits**:
- Clean separation: adapters = pure implementations, apps = composition roots
- Follows existing pattern (api, scheduler, migrator all wire dependencies)
- Better CI/CD: `docker-compose up` runs migrations atomically before services start
- Easier testing: migration logic can be unit tested separately from env wiring
- No race conditions: migrations run once, not in each service instance

**Code changes**:
- `packages/adapter-drizzle`: Removed `pnpm migrate` script, env var usage
- `apps/migrator`: New composition root with Dockerfile.migrator
- `docker-compose.yml`: Unified file with profiles (replaced docker-compose-prod.yml)
- `.dockerignore`: Added `**/*.tsbuildinfo` to fix TypeScript incremental builds
- `package.json`: Added db/docker scripts (db, db:migrate, docker:dev, docker:prod)

**Tradeoffs**:
- One more Docker service to maintain (but follows existing pattern)
- Migration logic split across two packages (adapter exports function, app calls it)
- Unified docker-compose requires profile awareness (`--profile dev|prod`)

## References

Related to architectural principles in:
- ADR-0002: Hexagonal Architecture Principles
- ADR-0014: API Composition Root Refactoring
