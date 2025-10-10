import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Vitest automatically loads .env.test, .env.local, .env
    // No additional configuration needed
  },
});
