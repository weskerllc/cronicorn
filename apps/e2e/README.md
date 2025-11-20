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

## Authentication in Tests

The project provides a **test-only auto-login helper** that bypasses the login form. This makes authenticated tests faster and more reliable.

### Using Auto-Login

```typescript
import { test, expect } from "@playwright/test";
import { authenticateAsAdmin } from "../fixtures/auth";

test("authenticated test", async ({ page }) => {
  // Authenticate as admin user
  await authenticateAsAdmin(page);
  
  // Now you can navigate to protected pages
  await page.goto("/dashboard");
  
  // Test your authenticated features...
});
```

### How It Works

1. The `authenticateAsAdmin()` helper calls `/api/test/auth/login`
2. The endpoint creates a real authenticated session
3. Session cookies are automatically stored by Playwright
4. All subsequent requests in that test use those cookies

### Security Note

The auto-login endpoint **only works in non-production environments**. It's automatically disabled when `NODE_ENV=production` for security.

### Example

See `tests/authenticated-dashboard.spec.ts` for a complete example.

## CI/CD

In GitHub Actions, services are started automatically before tests run.