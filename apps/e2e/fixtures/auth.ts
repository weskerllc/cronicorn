import type { Page } from "@playwright/test";

/**
 * Authentication helper for Playwright E2E tests
 *
 * Provides a simple way to authenticate tests using the test-only
 * authentication endpoint. This bypasses the login form and creates
 * a real authenticated session.
 *
 * Usage:
 * ```typescript
 * import { test } from "@playwright/test";
 * import { authenticateAsAdmin } from "../fixtures/auth";
 *
 * test("my authenticated test", async ({ page }) => {
 *   await authenticateAsAdmin(page);
 *   // Now you can navigate to protected pages
 *   await page.goto("/dashboard");
 * });
 * ```
 */

/**
 * Get the API URL from environment or use default
 */
function getApiUrl(): string {
  // eslint-disable-next-line node/no-process-env
  return process.env.API_URL || "http://localhost:3333";
}

/**
 * Authenticate as the default admin user using the test-only endpoint
 *
 * This function:
 * 1. Calls the `/api/test/auth/login` endpoint
 * 2. Automatically receives and stores session cookies
 * 3. Makes subsequent requests authenticated
 *
 * Note: This only works when NODE_ENV !== 'production'
 *
 * @param page - Playwright Page object
 * @throws Error if authentication fails
 */
export async function authenticateAsAdmin(page: Page): Promise<void> {
  const apiUrl = getApiUrl();

  // Call the test auth endpoint
  // Playwright automatically handles cookies - they'll be stored in the page's browser context
  const response = await page.request.post(`${apiUrl}/api/test/auth/login`);

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to authenticate: ${response.status()} ${response.statusText()}\n${body}`,
    );
  }

  const json = await response.json();

  if (!json.success) {
    throw new Error(`Authentication failed: ${json.message || "Unknown error"}`);
  }

  // Cookies are automatically stored by Playwright in the page's context
  // All subsequent requests from this page will include the auth cookies
}

/**
 * Check if a page is currently authenticated
 *
 * This is a helper to verify that authentication is working.
 * It tries to access a protected endpoint and checks the response.
 *
 * @param page - Playwright Page object
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const apiUrl = getApiUrl();

  try {
    const response = await page.request.get(`${apiUrl}/api/dashboard`);
    return response.status() !== 401;
  }
  catch {
    return false;
  }
}
