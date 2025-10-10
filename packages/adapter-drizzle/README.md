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
   # Create test database
   createdb cronicorn_test

   # Run migrations (see Migrations section below)
   DATABASE_URL="postgresql://localhost:5432/cronicorn_test" pnpm db:migrate:apply
   ```

2. **Configure environment:**

   ```bash
   # Copy example config
   cp .env.test.example .env.test

   # Edit .env.test with your DATABASE_URL
   # Vitest automatically loads .env.test files
   ```

3. **Run tests:**
   ```bash
   pnpm test
   # ✓ 26 tests pass for InMemoryJobsRepo/RunsRepo
   # ✓ 26 tests pass for DrizzleJobsRepo/RunsRepo
   ```

**Alternative:** Set DATABASE_URL inline:

```bash
DATABASE_URL="postgresql://localhost:5432/cronicorn_test" pnpm test
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

### Generating Migrations

When you modify `src/schema.ts`, generate a new migration file:

```bash
DATABASE_URL="postgresql://localhost:5432/yourdb" pnpm db:generate
```

This uses `drizzle-kit` to:

1. Read your current schema
2. Compare with previous migrations
3. Generate SQL migration files in `./migrations/`

### Applying Migrations

#### For Development

Use the programmatic migration script (recommended for CI/CD):

```bash
DATABASE_URL="postgresql://localhost:5432/yourdb" pnpm db:migrate:apply
```

This runs `src/migrate.ts` which uses Drizzle's runtime `migrate()` function to:

- Connect to the database
- Track applied migrations in `__drizzle_migrations` table
- Apply only pending migrations
- Handle failures gracefully

#### For CI/CD Environments

The `db:migrate:apply` script is designed for automated deployments:

```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: pnpm -F @cronicorn/adapter-drizzle db:migrate:apply
```

**Benefits of programmatic migrations:**

- No need to install `drizzle-kit` in production
- Faster execution (only runtime dependencies)
- Better error handling and logging
- Works in containerized environments

### Migration Files

Migrations are stored in `./migrations/` and tracked by Drizzle:

```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_ai_hints.sql  (example)
└── meta/
    └── _journal.json
```

**Important:** Never modify or delete migration files after they've been applied in production.
