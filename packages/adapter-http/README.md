# @cronicorn/adapter-http

HTTP dispatcher adapter for executing job endpoints via HTTP requests.

## Overview

This package implements the `Dispatcher` port from `@cronicorn/domain`, providing production HTTP execution capabilities using Node.js native `fetch` API.

## Features

- **Native Fetch**: Uses Node.js 18+ built-in fetch (no external HTTP client)
- **Timeout Support**: Configurable timeouts with `AbortController` (default 30s, min 1s)
- **Duration Tracking**: Precise millisecond timing with `performance.now()`
- **Smart Defaults**: Auto-adds `Content-Type: application/json` when bodyJson present
- **No Over-Engineering**: No retry logic (scheduler handles it), no response body storage

## Usage

### Production

```typescript
import { HttpDispatcher } from "@cronicorn/adapter-http";
import { Scheduler } from "@cronicorn/worker-scheduler";

const dispatcher = new HttpDispatcher();

const scheduler = new Scheduler({
  clock,
  cron,
  jobs,
  runs,
  dispatcher, // ← Use HttpDispatcher
  quota,
});

await scheduler.tick(batchSize, lockTtlMs);
```

### Testing

```typescript
import { FakeHttpDispatcher } from "@cronicorn/adapter-http";

// Default: always succeeds with 100ms duration
const dispatcher = new FakeHttpDispatcher();

// Custom behavior
const dispatcher = new FakeHttpDispatcher((ep) => {
  if (ep.url?.includes("fail")) {
    return { status: "failed", durationMs: 50, errorMessage: "Simulated failure" };
  }
  return { status: "success", durationMs: 100 };
});
```

## Behavior

### Success Criteria

- HTTP status 2xx (200-299) → `{ status: 'success', durationMs }`

### Failure Criteria

- HTTP status 4xx, 5xx → `{ status: 'failed', durationMs, errorMessage: 'HTTP 404' }`
- Network errors → `{ status: 'failed', durationMs, errorMessage: 'Connection refused' }`
- Timeout → `{ status: 'failed', durationMs, errorMessage: 'Request timed out after 30000ms' }`
- Missing URL → `{ status: 'failed', durationMs: 0, errorMessage: 'No URL configured for endpoint' }`

### Request Building

- **URL**: `ep.url` (required)
- **Method**: `ep.method ?? 'GET'`
- **Headers**: `ep.headersJson ?? {}`
- **Content-Type**: Auto-added as `application/json` if `bodyJson` present (unless user already set it)
- **Body**: `JSON.stringify(ep.bodyJson)` (excluded for GET/HEAD requests)
- **Timeout**: `ep.timeoutMs ?? 30000` (clamped to minimum 1000ms)

### Duration Measurement

Duration is measured from request start to response headers received (does NOT include response body read time, as we don't read the body).

## Architecture

This adapter follows the **hexagonal architecture** pattern:

- Implements `Dispatcher` port from domain
- No domain logic (pure infrastructure concern)
- Easily swappable with `FakeHttpDispatcher` for testing

## Design Decisions

### No Retry Logic

The scheduler handles retries via `failureCount` and backoff policies. Adding retry logic in the dispatcher would create double-retry complexity.

### No Response Body Storage

We only need the HTTP status code to determine success/failure. Storing response bodies would:

- Increase memory usage
- Require database storage (potentially megabytes per response)
- Not improve scheduling decisions

If you need response logging, implement it in your endpoint (log before responding).

### AbortController for Timeout

We use `AbortController` to properly cancel fetch requests on timeout. This is better than `Promise.race` because:

- Properly cancels the underlying HTTP request
- Releases resources immediately
- Standard pattern for fetch cancellation

## Testing

Tests use `msw` (Mock Service Worker) to mock HTTP responses:

```bash
pnpm test
```

See `src/__tests__/http-dispatcher.test.ts` for test coverage.
