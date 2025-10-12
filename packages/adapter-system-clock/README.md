# @cronicorn/adapter-system-clock

Production system clock adapter for real-world time operations.

## Overview

This package provides a simple wrapper around Node.js system time APIs, implementing the `Clock` port from `@cronicorn/domain`. It's the production counterpart to `FakeClock` used in tests.

## Features

- **Real System Time**: Uses `new Date()` for current time
- **Real Delays**: Uses `setTimeout` for sleep operations
- **Zero Dependencies**: Just wraps Node.js built-ins
- **Trivial Implementation**: ~10 lines of code

## Usage

### Production

```typescript
import { SystemClock } from "@cronicorn/adapter-system-clock";
import { Scheduler } from "@cronicorn/scheduler";

const clock = new SystemClock();

const scheduler = new Scheduler({
  clock, // ← Use SystemClock in production
  cron,
  jobs,
  runs,
  dispatcher,
  quota,
});

await scheduler.tick(batchSize, lockTtlMs);
```

### Development/Testing

Use `FakeClock` from the scheduler package for deterministic testing:

```typescript
import { FakeClock } from "@cronicorn/scheduler/adapters";

const clock = new FakeClock("2025-01-01T00:00:00Z");
console.log(clock.now()); // 2025-01-01T00:00:00.000Z
await clock.sleep(1000); // Advances time by 1 second
console.log(clock.now()); // 2025-01-01T00:00:01.000Z
```

## API

### SystemClock

```typescript
class SystemClock implements Clock {
  now(): Date; // Returns new Date()
  sleep(ms: number): Promise<void>; // Returns setTimeout promise
}
```

### Clock Port

```typescript
type Clock = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
};
```

## Architecture

This adapter follows the **hexagonal architecture** pattern:

- Implements `Clock` port from domain
- No domain logic (pure infrastructure)
- Easily swappable with `FakeClock` for testing

## Why This Exists

While this is a trivial wrapper, having it as a separate adapter:

1. **Makes dependency injection explicit** - Worker composition root wires `SystemClock`
2. **Maintains architectural consistency** - All ports have adapters
3. **Documents the boundary** - Clear separation between domain and system time
4. **Enables testing** - Easy to swap with `FakeClock` in tests

## Implementation Note

This is intentionally minimal. No tests are needed because:

- It's a thin wrapper around Node.js built-ins (already tested by Node.js team)
- The `Clock` port contract is validated by domain tests using `FakeClock`
- Any bugs would be immediately obvious in integration tests

If you need more sophisticated time handling (mocking, time zones, etc.), consider:

- Using `FakeClock` in tests (already available)
- Adding a library wrapper if needed (e.g., for timezone support)
