import type { Page } from "@playwright/test";
import { DEV_AUTH } from "@cronicorn/config-defaults";

/**
 * Authentication helper for Playwright E2E tests
 *
 * Provides a simple way to authenticate tests by calling the Better Auth
 * sign-in endpoint directly. This bypasses the login form and creates
 * a real authenticated session using the default admin credentials.
 *
 * Usage:
 * ```typescript
 * import { test } from "@playwright/test";
 * import { authenticateAsAdmin } from "../fixtures/auth.js";
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
 * Authenticate as the default admin user by calling Better Auth directly
 *
 * This function:
 * 1. Calls Better Auth's `/api/auth/sign-in/email` endpoint with default credentials
 * 2. Automatically receives and stores session cookies
 * 3. Makes subsequent requests authenticated
 *
 * Note: Uses default dev credentials from @cronicorn/config-defaults (DEV_AUTH)
 * which are only configured in non-production environments
 *
 * @param page - Playwright Page object
 * @throws Error if authentication fails
 */
export async function authenticateAsAdmin(page: Page): Promise<void> {
  const apiUrl = getApiUrl();

  // Call Better Auth's sign-in endpoint directly with default credentials
  // Playwright automatically handles cookies - they'll be stored in the page's browser context
  const response = await page.request.post(`${apiUrl}/api/auth/sign-in/email`, {
    data: {
      email: DEV_AUTH.ADMIN_EMAIL,
      password: DEV_AUTH.ADMIN_PASSWORD,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to authenticate: ${response.status()} ${response.statusText()}\n${body}`,
    );
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
