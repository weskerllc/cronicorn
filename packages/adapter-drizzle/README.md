# @cronicorn/adapter-drizzle

PostgreSQL adapter implementation for Cronicorn scheduler using Drizzle ORM.

## Purpose

Provides production-ready `JobsRepo` and `RunsRepo` implementations backed by PostgreSQL, implementing the port contracts defined in `@cronicorn/domain`.

## Features

- **DrizzleJobsRepo**: Real database persistence with atomic locking via `FOR UPDATE SKIP LOCKED`
- **DrizzleRunsRepo**: Run history tracking with status and duration
- **Contract Tests**: Shared test suite validates both in-memory and Drizzle implementations
- **Transaction Support**: All operations are transaction-scoped for consistency

## Usage

```typescript
import { DrizzleJobsRepo, DrizzleRunsRepo } from "@cronicorn/adapter-drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// In your composition root (API/worker)
// eslint-disable-next-line node/no-process-env
const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Use in transaction
await db.transaction(async (tx) => {
  const jobsRepo = new DrizzleJobsRepo(tx);
  const runsRepo = new DrizzleRunsRepo(tx);

  // Use repos within transaction scope
});
```

## Running Tests

### Unit Tests (No Database Required)

Contract tests run against the in-memory implementation by default:

```bash
pnpm test
# ✓ 26 tests pass for InMemoryJobsRepo/RunsRepo
# ⏭️  Drizzle tests skipped (no DATABASE_URL)
```

### Integration Tests (PostgreSQL Required)

To run contract tests against the real Drizzle adapter:

1. **Set up test database:**

   ```bash
   # Start dev database
   docker-compose up cronicorn-dev-db -d

   # Run migrations using the migrator app
   cd apps/migrator
   DATABASE_URL="postgresql://user:password@localhost:6666/db" tsx src/index.ts
   ```

2. **Configure environment:**

   ```bash
   # Create .env file with your DATABASE_URL
   # Vitest automatically loads .env files
   DATABASE_URL="postgresql://user:password@localhost:6666/db"
   ```

3. **Run tests:**
   ```bash
   pnpm test
   # ✓ 26 tests pass for InMemoryJobsRepo/RunsRepo
   # ✓ 26 tests pass for DrizzleJobsRepo/RunsRepo
   ```

**Alternative:** Set DATABASE_URL inline:

```bash
DATABASE_URL="postgresql://user:password@localhost:6666/db" pnpm test
```

### Contract Tests

The contract test suite in `tests/contracts/` runs the same tests against both in-memory and Drizzle implementations to ensure behavioral consistency.

**Test Coverage:**

- CRUD operations (add, get)
- Claiming with limit, horizon, and ordering
- Idempotent claiming (prevents double-execution)
- Pause control and expiration
- Locking semantics
- Failure count policies (increment/reset)
- AI hint expiration and clearing
- Nudging with min/max interval clamping
- Run lifecycle (create, finish, error handling)

## Schema

See `src/schema.ts` for table definitions. Key tables:

- `job_endpoints`: Job scheduling state with AI hints and guardrails
- `runs`: Execution history with status and timing

Adapter-specific fields (e.g., `_locked_until`) are prefixed with underscore and not exposed through domain entities.

## Migrations

**Note:** Database migrations are now managed by the `@cronicorn/migrator` composition root. See `apps/migrator/README.md` for usage.

### Generating Migrations

When you modify `src/schema.ts`, generate a new migration file:

```bash
DATABASE_URL="postgresql://localhost:5432/yourdb" pnpm generate
```

This uses `drizzle-kit` to:

1. Read your current schema
2. Compare with previous migrations
3. Generate SQL migration files in `./migrations/`

### Applying Migrations

Use the migrator app to apply migrations:

```bash
# Development
cd apps/migrator
DATABASE_URL="postgresql://user:password@localhost:6666/db" tsx src/index.ts

# Production (via docker-compose)
docker-compose -f docker-compose-prod.yml up
# Migrations run automatically before API/Scheduler start
```

See `apps/migrator/README.md` for complete documentation.

### Special Migration: Headers Encryption (0018)

**⚠️ Important:** Migration 0018 removes the `headers_json` column and replaces it with `headers_encrypted`.

If you have existing data with headers, run the data migration script **BEFORE** applying the schema migration:

```bash
# Step 1: Migrate existing data to encrypted format
cd packages/adapter-drizzle
DATABASE_URL="postgresql://..." BETTER_AUTH_SECRET="your-secret" tsx scripts/migrate-headers.ts

# Step 2: Apply schema migration (removes old column)
cd apps/migrator
DATABASE_URL="postgresql://..." tsx src/index.ts
```

The migration script will:
- Check for endpoints with plaintext headers
- Encrypt them using your `BETTER_AUTH_SECRET`
- Write encrypted data to the new column
- Report success/failure for each endpoint
