import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Exclude e2e tests (use pnpm test:e2e for those)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/apps/e2e/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      all: true,
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/index.ts", // Often just re-exports
      ],
    },
  },
});
