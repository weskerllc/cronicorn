---
applyTo: '**/apps/e2e/**'
---

# Playwright E2E Testing - Authentication

## Authentication (CRITICAL - Read First)

**IMPORTANT:** Most pages in this application require authentication. You MUST authenticate BEFORE navigating to any page that might be protected (dashboard, jobs, endpoints, settings, etc.).

### How to Authenticate

**Always run this code snippet FIRST, before any navigation or screenshots:**

```typescript
await page.request.post('http://localhost:3333/api/auth/sign-in/email', {
  data: {
    email: 'admin@example.com',
    password: 'devpassword'
  }
});
```

This will set the authentication cookies automatically. After this, you can navigate to any protected route.

### Authentication Workflow

1. **First:** Run the authentication code above
2. **Then:** Navigate to the desired page
3. **Finally:** Take screenshots or interact with the page

### Common Mistake

❌ **Wrong:** Navigate → Get redirected to login → Screenshot login page → Think you're done

✅ **Correct:** Authenticate first → Navigate → Screenshot actual dashboard/page

### Protected Routes

These routes require authentication:
- `/dashboard` - Main dashboard
- `/jobs` - Jobs list and management
- `/endpoints` - Endpoints management
- `/settings` - User settings
- Any route starting with `/dashboard/`

### Public Routes (No Auth Needed)

- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/docs` - Documentation

### Checking Authentication Status

After authenticating, you can verify by checking the URL after navigation:
- If you end up on `/login`, authentication failed
- If you stay on the intended route, authentication succeeded

### Troubleshooting Authentication Failures

If authentication fails (401 error or redirects to login):

**Default credentials:**
- Email: `admin@example.com`
- Password: `devpassword`

These defaults can be overridden via environment variables in the developer's `.env` file:
- `ADMIN_USER_EMAIL` - Custom admin email
- `ADMIN_USER_PASSWORD` - Custom admin password

If the default credentials don't work, check the `.env` file for custom values.

## E2E Test Best Practices

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await page.request.post('http://localhost:3333/api/auth/sign-in/email', {
      data: {
        email: 'admin@example.com',
        password: 'devpassword'
      }
    });
  });

  test('creates a new job', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveURL('/jobs');

    await page.click('button:has-text("Create Job")');
    // ... rest of test
  });
});
```

### Database State

E2E tests run against a real database. Use scenarios to seed test data:

```bash
# Seed test data before E2E tests
pnpm scenarios:clean  # Clean baseline
pnpm scenarios:test   # Test data for E2E
```

### Test Isolation

Each test should be independent:
- Don't rely on previous test state
- Clean up created resources (or use transaction-per-test for unit/integration tests)
- Use unique identifiers for test data

### Waiting for Elements

Always wait for elements to be ready:

```typescript
// ✅ Good: Wait for element
await page.waitForSelector('button:has-text("Create Job")');
await page.click('button:has-text("Create Job")');

// ❌ Bad: No wait (can cause flaky tests)
await page.click('button:has-text("Create Job")');
```

## Running E2E Tests

```bash
# Start services first
pnpm dev

# In another terminal, run E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/jobs.spec.ts

# Run with UI mode (interactive)
pnpm test:e2e --ui
```
