# E2E Testing with Playwright

This workspace contains end-to-end tests for the Cronicorn project using Playwright.

## Quick Start

**Important:** E2E tests require all apps to be running first

From the **repository root**:

```bash
# Terminal 1: Start all services (API, Web, Docs, etc.)
pnpm start 

# Terminal 2: Run E2E tests
pnpm test:e2e

# Or run with UI mode for debugging
pnpm --filter @cronicorn/e2e test:ui
```

## CI/CD

In GitHub Actions, services are started automatically before tests run.