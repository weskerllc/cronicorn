# Structured Logging with Pino

**Date:** 2025-10-23  
**Status:** Accepted

## Context

The scheduler worker was using `console.log` for all logging, which had several limitations:
- No structured context for filtering/querying logs
- No log levels (debug, info, warn, error)
- No persistent context across related operations
- Difficult to parse and analyze in production
- No environment-specific formatting (dev vs prod)

We needed a logging solution that:
- Provides structured JSON logging for production
- Supports human-readable output for development
- Allows attaching persistent context (e.g., endpointId, runId)
- Follows hexagonal architecture (domain port + adapter)
- Enables filtering by log level
- Works with existing testing patterns (FakeLogger for tests)

## Decision

Implemented structured logging using **Pino v10.1.0** with the following architecture:

### 1. Logger Port (Domain)
Created `Logger` type in `domain/ports/observability.ts`:
- Overloaded methods: `info`, `warn`, `error`, `debug`
- Supports message-only: `logger.info("message")`
- Supports structured: `logger.info({ key: "value" }, "message")`
- Child loggers: `logger.child({ context })` for persistent bindings

### 2. PinoLoggerAdapter (Adapter)
Created `adapter-pino` package with `PinoLoggerAdapter`:
- Wraps pino instance injected from composition root
- Translates `Logger` port to pino's API
- Implements child logger by wrapping `pino.child()`
- Zero configuration logic (handled in composition root)

### 3. Composition Root Configuration
Scheduler worker (`apps/scheduler/src/index.ts`) configures pino:
- **Development**: pino-pretty transport with colorization
- **Production**: JSON output for log aggregation
- Configurable `LOG_LEVEL` (debug, info, warn, error)
- Configurable `NODE_ENV` (development, production, test)

### 4. Structured Logging in Scheduler
Replaced all `console.log` with structured logger calls:
- **Child loggers for context**:
  - `epLogger`: endpoint-scoped (endpointId, jobId, tenantId)
  - `runLogger`: run-scoped (runId, attempt)
- **Log phases**:
  - Tick start (debug level)
  - Endpoints claimed (info)
  - Endpoint execution (info)
  - Execution result (info/warn based on status)
  - NextRunAt adjustment (warn if in past)
  - Scheduling decision (info)
  - Zombie cleanup (info)

### 5. FakeLogger for Testing
Created `FakeLogger` in `domain/fixtures`:
- Captures all log calls in memory
- Supports child loggers with merged bindings
- Enables test assertions on log content

## Consequences

**Positive:**
- ✅ Structured logs are queryable in production (JSON format)
- ✅ Human-readable logs in development (pino-pretty)
- ✅ Persistent context via child loggers (no repetition)
- ✅ Log levels enable filtering by severity
- ✅ Follows hexagonal architecture (port + adapter)
- ✅ Testable with FakeLogger (no mocking required)
- ✅ High performance (pino is fastest Node.js logger)
- ✅ Environment-specific configuration (dev vs prod)

**Neutral:**
- Pino configuration lives in composition root (correct per hexagon)
- Child logger pattern requires explicit creation
- Log messages follow object + message pattern

**Negative:**
- None identified

**Code Affected:**
- `packages/domain/src/ports/observability.ts` (new)
- `packages/domain/src/fixtures/fake-logger.ts` (new)
- `packages/adapter-pino/` (new package)
- `packages/worker-scheduler/src/domain/deps.ts` (added logger)
- `packages/worker-scheduler/src/domain/scheduler.ts` (replaced console.log)
- `apps/scheduler/src/index.ts` (pino configuration)
- All Scheduler instantiations (tests, sim, worker)

**Tradeoffs:**
- Chose Pino over Winston/Bunyan: fastest, smallest, best TypeScript support
- Chose port-based design over direct pino usage: enables testing, follows architecture
- Chose child loggers over manual context: cleaner, automatic propagation

**Observability Gaps:**
This ADR addresses logging only. Still missing:
- Metrics (execution counts, durations, success rates)
- Distributed tracing (request correlation across services)
- Alerting (automated notifications on errors)
- Dashboards (visual monitoring)

These gaps are documented in `docs/_RUNNING_TECH_DEBT.md` for future work.

## References

- Pino documentation: https://getpino.io
- Task: `.tasks/observability-structured-logging.md`
- Related ADRs: None (first observability ADR)
