# @cronicorn/adapter-cron

Cron expression parser adapter implementing the `Cron` port from `@cronicorn/domain`.

## Overview

This package provides production and test implementations of the `Cron` port interface:

- **CronParserAdapter**: Production implementation using the `cron-parser` library
- **FakeCron**: Simple test stub for deterministic testing

## Installation

```bash
pnpm add @cronicorn/adapter-cron
```

## Usage

### Production Usage

```typescript
import { CronParserAdapter } from "@cronicorn/adapter-cron";

const cron = new CronParserAdapter();

// Calculate next run time for a cron expression
const nextRun = cron.next("0 * * * *", new Date("2025-01-01T00:00:00Z"));
// Returns: 2025-01-01T01:00:00.000Z (next hour)
```

### Test Usage

```typescript
import { FakeCron } from "@cronicorn/adapter-cron";

const fakeCron = new FakeCron(60_000); // Add 60 seconds to every call

// In tests, behavior is predictable
const nextRun = fakeCron.next("* * * * *", new Date("2025-01-01T00:00:00Z"));
// Returns: 2025-01-01T00:01:00.000Z (always adds 60 seconds)
```

## Supported Cron Patterns

Standard cron syntax with 5 fields:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of Week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Examples

- `* * * * *` - Every minute
- `0 * * * *` - Every hour at :00
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday at midnight
- `*/15 * * * *` - Every 15 minutes

## Error Handling

Invalid cron expressions throw a `CronError` from the domain package:

```typescript
import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { CronError } from "@cronicorn/domain";

const cron = new CronParserAdapter();

try {
  cron.next("invalid expression", new Date());
}
catch (error) {
  if (error instanceof CronError) {
    console.error("Invalid cron expression:", error.message);
  }
}
```

## Architecture

This adapter follows the hexagonal architecture pattern:

- Implements the `Cron` port interface defined in `@cronicorn/domain`
- No domain logic - pure adapter responsibility
- Wraps external library (`cron-parser`) and handles error translation
- Provides test doubles for deterministic testing

## Development

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```
