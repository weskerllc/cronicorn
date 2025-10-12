# Scheduler Worker

**Composition Root for Production Deployment**

This is the main entry point for the Cronicorn scheduling worker. It wires together all Phase 1 adapters (Cron, HTTP Dispatcher, System Clock, Drizzle repositories) with the domain scheduler logic to create a production-ready worker process.

## Architecture

This worker follows the **hexagonal architecture** pattern where the composition root:
- Owns infrastructure setup (database connection pooling, lifecycle management)
- Wires concrete adapter implementations to domain ports
- Manages graceful shutdown and error handling

```
Worker (this package)
  ├── Database: PostgreSQL connection pool + Drizzle ORM
  ├── Adapters: Cron, HTTP, Clock, Repos
  └── Domain: Scheduler with tick loop
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/db`) |
| `BATCH_SIZE` | No | `10` | Number of endpoints to claim per tick |
| `POLL_INTERVAL_MS` | No | `5000` | Milliseconds between ticks (5 seconds) |
| `LOCK_TTL_MS` | No | `60000` | Lock duration for claimed endpoints (60 seconds) |

## Development

### Prerequisites

1. **PostgreSQL database** - Running and accessible
2. **Migrations applied** - Schema must be up to date

```bash
# Start database (if using Docker Compose)
docker compose up -d

# Apply migrations
cd packages/adapter-drizzle
pnpm db:migrate:apply
```

### Run in Development Mode

Uses `tsx` for hot-reload TypeScript execution:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cronicorn" pnpm dev
```

**Example with custom config:**

```bash
DATABASE_URL="postgresql://..." \
BATCH_SIZE=5 \
POLL_INTERVAL_MS=2000 \
pnpm dev
```

## Production

### Build

Compile TypeScript to JavaScript:

```bash
pnpm build
```

Output: `dist/index.js`

### Run

Execute the compiled worker:

```bash
DATABASE_URL="postgresql://..." node dist/index.js
```

### Docker

Build and run using the provided Dockerfile:

```bash
# Build image
docker build -f Dockerfile.scheduler -t cronicorn-scheduler .

# Run container
docker run -e DATABASE_URL="postgresql://..." cronicorn-scheduler
```

## Manual E2E Acceptance Test

This procedure validates the worker end-to-end.

### Step 1: Ensure Database is Migrated

```bash
cd packages/adapter-drizzle
pnpm db:migrate:apply
```

### Step 2: Insert a Test Job

Create a job that will execute shortly after worker starts:

```sql
INSERT INTO job_endpoints (
  id, 
  job_id, 
  tenant_id, 
  name, 
  url, 
  next_run_at
) VALUES (
  'ep-test-001', 
  'job-001', 
  'tenant-001', 
  'Test Job',
  'https://httpbin.org/post',
  NOW() + INTERVAL '5 seconds'
);
```

**Note:** Uses httpbin.org which echoes back POST requests (always succeeds).

### Step 3: Start Worker

Use short poll interval for faster testing:

```bash
cd apps/scheduler
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cronicorn" \
POLL_INTERVAL_MS=2000 \
pnpm dev
```

### Step 4: Watch Logs

Expected log sequence:

```text
{"timestamp":"2025-10-12T...", "level":"info", "message":"Worker started", "batchSize":10, "pollIntervalMs":2000, "lockTtlMs":60000}
```

Within ~7 seconds, you should see the scheduler claim and execute the job.

### Step 5: Verify Runs Table

Check that execution was recorded:

```sql
SELECT 
  id, 
  endpoint_id, 
  status, 
  started_at, 
  finished_at, 
  duration_ms 
FROM runs 
WHERE endpoint_id = 'ep-test-001';
```

**Expected:**
- `status` = `'success'`
- `duration_ms` > 0
- `finished_at` IS NOT NULL

### Step 6: Test Graceful Shutdown

Press `Ctrl+C` in the terminal running the worker.

**Expected logs:**

```text
{"timestamp":"...", "level":"info", "message":"Shutdown signal received", "signal":"SIGINT"}
{"timestamp":"...", "level":"info", "message":"Worker shutdown complete"}
```

**Success Criteria:**
- Worker waits for current tick to complete before exiting
- No abrupt termination or errors
- Pool closes cleanly

### Step 7: Cleanup

Remove test data:

```sql
DELETE FROM runs WHERE endpoint_id = 'ep-test-001';
DELETE FROM job_endpoints WHERE id = 'ep-test-001';
```

## Success Criteria Summary

✅ **Job executes** within ~7 seconds of worker start  
✅ **Run record created** with `status='success'` and `duration_ms` populated  
✅ **No errors** in logs during normal operation  
✅ **Graceful shutdown** waits for current tick completion  

## Troubleshooting

### Worker Fails to Start

**Error:** `Worker failed to start`

- Check `DATABASE_URL` is valid and database is accessible
- Verify migrations are applied: `cd packages/adapter-drizzle && pnpm db:migrate:apply`
- Check PostgreSQL is running: `docker compose ps` or `pg_isready`

### Jobs Not Executing

- Verify `next_run_at` is in the past or near future
- Check `pausedUntil` is NULL or in the past
- Increase `POLL_INTERVAL_MS` to see tick logs more frequently (e.g., `2000` for 2 seconds)

### Tick Errors

**Error:** `Tick failed`

- Check network connectivity to job URLs
- Verify HTTP dispatcher can reach endpoints
- Review error details in structured logs

## Architecture Decisions

### Why Composition Root Creates Drizzle Instance?

The worker composition root (not the adapter) creates the database connection pool and drizzle instance because:

1. **Lifecycle Management** - The composition root owns startup/shutdown, including `pool.end()`
2. **Infrastructure Concerns** - Connection pooling, read replicas, connection limits are deployment-specific
3. **Adapter Purity** - Repositories (`DrizzleJobsRepo`, `DrizzleRunsRepo`) stay pure—they just accept any drizzle instance

This follows hexagonal architecture: infrastructure setup happens in composition roots, not in adapters.

### Why No Initial DB Ping?

We let the first `claimDueEndpoints()` query validate the connection. This:
- Simplifies startup logic
- Follows "don't validate what the system validates" principle
- Allows errors to bubble up naturally with proper logging

## Related Documentation

- [Architecture Guide](../../docs/ai-scheduler-architecture.md)
- [ADR Process](../../.github/instructions/adr-process.instructions.md)
- [Core Principles](../../.github/instructions/core-principles.instructions.md)
