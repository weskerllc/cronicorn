# E2E Testing with Playwright

This workspace contains end-to-end tests for the Cronicorn project using Playwright.

## Quick Start

**Important:** E2E tests require Docker (for PostgreSQL) and all apps to be running.

From the **repository root**:

```bash
# Terminal 1: Start all services (API, Web, Docs, etc.)
pnpm dev

# Terminal 2: Run E2E tests (will auto-setup database)
pnpm test:e2e
```

## How It Works

### Automatic Database Setup

When you run E2E tests, Playwright's `globalSetup` automatically:

1. **Resets the database** - Drops and recreates via Docker
2. **Runs migrations** - Applies all schema migrations
3. **Seeds demo data** - Creates admin user + sample jobs/endpoints/runs

This ensures tests always run against a known, consistent state.

### Skip Setup for Faster Re-runs

During development, skip the database setup for faster iterations:

```bash
# Skip database reset/migrate/seed (uses existing data)
SKIP_E2E_SETUP=1 pnpm test:e2e
```

## Authentication in Tests

The project provides an **authentication helper** that authenticates using the seeded admin credentials.

### Using the Authentication Helper

```typescript
import { test, expect } from "@playwright/test";
import { authenticateAsAdmin } from "../fixtures/auth.js";

test("authenticated test", async ({ page }) => {
  // Authenticate as admin user
  await authenticateAsAdmin(page);
  
  // Now you can navigate to protected pages
  await page.goto("/dashboard");
  
  // Test your authenticated features...
});
```

### Default Credentials

The seeded admin user credentials (from `@cronicorn/config-defaults`):
- Email: `admin@example.com`
- Password: `devpassword`

## Test Files

| File | Description |
|------|-------------|
| `seeded-dashboard.spec.ts` | Tests dashboard with seeded data |
| `authenticated-dashboard.spec.ts` | Basic auth + dashboard access |
| `api-health.spec.ts` | API health check endpoint |
| `web-home.spec.ts` | Public home page |
| `docs-home.spec.ts` | Documentation site |

## Commands

```bash
# Run all tests
pnpm test:e2e

# Run with UI (interactive mode)
pnpm --filter @cronicorn/e2e test:ui

# Run headed (see browser)
pnpm --filter @cronicorn/e2e test:headed

# View test report
pnpm --filter @cronicorn/e2e test:report

# Skip database setup (faster re-runs)
SKIP_E2E_SETUP=1 pnpm test:e2e
```

## CI/CD

In GitHub Actions, the globalSetup runs automatically to prepare the database before tests.
