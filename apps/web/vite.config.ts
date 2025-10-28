import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    svgr(),

  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:3333",
    },
    // File watcher optimization
    watch: {
      ignored: ["**/.tanstack/**", "**/node_modules/**", "**/dist/**"],
    },
  },
});
