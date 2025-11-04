import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file at repo root
config({ path: resolve(__dirname, "../../.env") });

// Check if running in CI
// eslint-disable-next-line node/no-process-env
const isCI = !!process.env.CI;

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Look for test files in the "tests" directory
    testDir: "./tests",

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: isCI,

    // Retry on CI only
    retries: isCI ? 2 : 0,
    timeout: 30 * 1000, // 30 seconds per test

    // Opt out of parallel tests on CI
    workers: isCI ? 1 : undefined,

    // Reporter to use
    reporter: "html",

    // Shared settings for all the projects below
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: "http://localhost:5173",

        // Collect trace when retrying the failed test
        trace: "on-first-retry",

        // Screenshot on failure
        screenshot: "only-on-failure",
    },

    // Configure projects for major browsers
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
