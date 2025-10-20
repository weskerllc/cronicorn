import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // "@cronicorn/ui-library": resolve(__dirname, "../../packages/ui-library/src/index.ts"),
      // "@cronicorn/api-contracts": resolve(__dirname, "../../packages/api-contracts/src/index.ts"),
      // "@cronicorn/api-contracts/jobs": resolve(__dirname, "../../packages/api-contracts/src/jobs/index.ts"),
      // "@cronicorn/api-contracts/subscriptions": resolve(__dirname, "../../packages/api-contracts/src/subscriptions/index.ts"),
      // "@cronicorn/api/client": resolve(__dirname, "../api/src/client.ts"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3333",
    },
  },
});
