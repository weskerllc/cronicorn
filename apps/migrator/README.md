# @cronicorn/migrator

Database migration composition root for Cronicorn.

## Purpose

Runs database migrations by wiring together the schema and migration logic from `@cronicorn/adapter-drizzle` with environment-specific configuration. This is a composition root that reads `DATABASE_URL` from the environment and executes migrations.

## Usage

### Development

```bash
# With docker-compose (recommended)
docker-compose up cronicorn-dev-db
DATABASE_URL="postgresql://user:password@localhost:6666/db" pnpm -F @cronicorn/migrator start

# Or run directly with tsx
cd apps/migrator
DATABASE_URL="postgresql://user:password@localhost:6666/db" tsx src/index.ts
```

### Production

Runs automatically as part of `docker-compose up`:

```bash
docker-compose -f docker-compose-prod.yml up
```

The migrator service:
- Waits for DB to be healthy
- Runs all pending migrations
- Exits with success/failure status
- Blocks API/Scheduler from starting until migrations complete

### CI/CD

```yaml
- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: pnpm -F @cronicorn/migrator start
```

## Architecture

This follows the composition root pattern:

- **adapter-drizzle**: Pure migration logic (no env vars)
- **apps/migrator**: Wires env config into migration logic
- **docker-compose**: Orchestrates migration timing

## How It Works

1. Reads `DATABASE_URL` from environment
2. Calls `runMigrations()` from adapter-drizzle
3. Applies pending migrations from `packages/adapter-drizzle/migrations/`
4. Exits with status code 0 (success) or 1 (failure)

## Error Handling

- Missing `DATABASE_URL`: Exits with error
- Connection failure: Exits with error
- Migration failure: Exits with error (services won't start)
- Success: Exits cleanly, services proceed to start
