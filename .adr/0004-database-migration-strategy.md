# Database Migration Strategy for PostgreSQL Adapter

**Date:** 2025-10-10  
**Status:** Accepted

## Context

The `@cronicorn/adapter-drizzle` package provides PostgreSQL persistence for the scheduler. We needed a migration strategy that works across different environments (local dev, Docker, CI/CD) while balancing developer ergonomics with production safety.

Key requirements:
1. **Schema evolution**: Track and apply database changes as code evolves
2. **Multi-environment**: Work in local dev, Docker Compose, and CI/CD pipelines
3. **Production-safe**: No accidental auto-migrations; explicit control over when migrations run
4. **Developer-friendly**: Simple workflow for creating and applying migrations
5. **CI/CD-friendly**: Fast, minimal dependencies, good error reporting

## Decision

### Two-Step Migration Workflow

**Step 1: Generate Migrations (Development Only)**
- Uses `drizzle-kit generate` to diff schema and create SQL files
- Run when `src/schema.ts` changes
- Command: `pnpm db:generate`
- Requires `drizzle-kit` dev dependency
- Output: SQL files in `./migrations/` folder

**Step 2: Apply Migrations (All Environments)**
- Uses programmatic `migrate()` function from `drizzle-orm/postgres-js/migrator`
- Runs `src/migrate.ts` script via `tsx`
- Command: `pnpm db:migrate:apply`
- Works in dev, Docker, and CI/CD
- Only requires runtime dependencies (no drizzle-kit)

### Environment Variable Loading Strategy

**Choice: dotenv with graceful fallback**

```typescript
import "dotenv/config"; // Loads .env files if present
// Falls back to actual environment variables if already set
```

**Why this works everywhere:**
- **Local dev**: Reads from `.env` file
- **Docker Compose**: Uses env vars from compose.yml (dotenv doesn't override)
- **CI/CD**: Uses secrets/env vars (dotenv doesn't override)
- **Explicit override**: `DATABASE_URL=... pnpm db:migrate:apply` still works

### Migration Tracking

- Uses Drizzle's built-in tracking table: `__drizzle_migrations`
- Schema: `public` (configurable in `migrate.ts`)
- Tracks which migrations have been applied
- Applies only pending migrations on each run

### No Automatic Migrations on Startup

**Intentional design choice:**
- Migrations are NOT run automatically when app starts
- Must be explicitly triggered via `pnpm db:migrate:apply`
- Prevents accidental migrations in production
- Allows separate migration step in deployment pipelines

Example deployment flow:
```yaml
# CI/CD Pipeline
- name: Run Migrations
  run: pnpm -F @cronicorn/adapter-drizzle db:migrate:apply
  
- name: Deploy Application
  run: docker compose up -d
```

## Consequences

### Positive

✅ **Fast CI/CD**: Programmatic migrations only need runtime deps (no drizzle-kit in prod)  
✅ **Explicit control**: Migrations never run accidentally; must be triggered  
✅ **Environment-agnostic**: Same script works everywhere via dotenv  
✅ **Good DX**: Simple two-command workflow (generate → apply)  
✅ **Tracked state**: `__drizzle_migrations` table prevents duplicate applications  
✅ **Better errors**: Custom logging and error handling in `migrate.ts`  

### Tradeoffs

⚠️ **Manual generation**: Developer must remember to run `db:generate` after schema changes  
⚠️ **Dev dependency**: `drizzle-kit` must be installed (but not in production)  
⚠️ **No auto-rollback**: Drizzle doesn't support "down" migrations natively  
⚠️ **One-way only**: Can't automatically undo migrations (need manual SQL)  

### Tech Debt / Limitations

📋 **Rollback strategy undefined**: 
- Drizzle doesn't generate "down" migrations
- Need manual SQL scripts for rollbacks
- Consider: Maintaining hand-written rollback SQLs alongside migrations
- Consider: Blue-green deployments to avoid rollback need

📋 **No migration dry-run**:
- Can't preview what will be applied without actually applying
- Could add `--dry-run` flag to `migrate.ts` in future

📋 **Schema drift detection**:
- If someone modifies DB directly, no automatic detection
- Could add `drizzle-kit push` validation check in CI

### If Reversed

**To switch to CLI-based migrations:**
1. Replace `pnpm db:migrate:apply` with `drizzle-kit migrate`
2. Add drizzle-kit to production dependencies (larger container)
3. Update CI/CD to use CLI command
4. Remove `src/migrate.ts` script

**To add automatic migrations on startup:**
1. Import `migrate()` in app entry point
2. Run before starting HTTP server / worker
3. Risk: Failed migration = app won't start (good or bad depending on perspective)
4. Risk: Multiple instances might race to apply migrations

**To switch migration tools (e.g., to Knex, TypeORM):**
1. Keep existing migrations applied (they're just SQL)
2. Export to SQL files if needed
3. Switch tooling for future migrations
4. Update generation and application scripts

## References

- **Implementation**: `packages/adapter-drizzle/src/migrate.ts`
- **Configuration**: `packages/adapter-drizzle/drizzle.config.ts`
- **Documentation**: `packages/adapter-drizzle/README.md` (Migrations section)
- **Drizzle Docs**: https://orm.drizzle.team/docs/migrations
- **Related ADRs**: 
  - ADR-0003: PostgreSQL adapter with contract tests
  - ADR-0002: Hexagonal architecture principles

## Examples

### Local Development Workflow

```bash
# 1. Modify schema
vim packages/adapter-drizzle/src/schema.ts

# 2. Generate migration
cd packages/adapter-drizzle
pnpm db:generate
# Creates: migrations/0002_fancy_name.sql

# 3. Review generated SQL
cat migrations/0002_fancy_name.sql

# 4. Apply migration
pnpm db:migrate:apply
# ✅ Migrations completed successfully

# 5. Verify with Drizzle Studio
pnpm db:studio
```

### CI/CD Pipeline (GitHub Actions)

```yaml
jobs:
  deploy:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Install Dependencies
        run: pnpm install
      
      - name: Run Database Migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          pnpm -F @cronicorn/adapter-drizzle db:migrate:apply
      
      - name: Deploy Application
        run: docker compose up -d
```

### Docker Compose

```yaml
services:
  migrate:
    image: node:20
    command: pnpm -F @cronicorn/adapter-drizzle db:migrate:apply
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/mydb
    depends_on:
      - db
  
  api:
    depends_on:
      migrate:
        condition: service_completed_successfully
```

## Decision Criteria Met

✅ Schema evolution tracked via migration files  
✅ Works in local, Docker, and CI/CD (dotenv strategy)  
✅ Explicit control (no auto-migrations)  
✅ Developer-friendly two-step workflow  
✅ CI/CD-friendly programmatic approach  
