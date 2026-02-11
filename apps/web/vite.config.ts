import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { visualizer } from "rollup-plugin-visualizer";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Read version from root package.json at build time
const rootPackageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8")
);
const APP_VERSION = rootPackageJson.version;

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Inject version as a constant at build time
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    devtools(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    nitro(),
    viteReact({
      // https://react.dev/learn/react-compiler
      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              target: "19",
            },
          ],
        ],
      },
    }),
    tailwindcss(),
    svgr(),
    // Optimize images during build
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
    }),
    // Generate bundle analysis report (optional, run with ANALYZE=true)
    process.env.ANALYZE === "true" &&
    visualizer({
      open: false,
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Alias API client to source file (no build needed in dev)
      "@cronicorn/api/client": resolve(__dirname, "../api/src/client.ts"),
    },
  },
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    // File watcher optimization
    watch: {
      ignored: ["**/.tanstack/**", "**/node_modules/**", "**/dist/**"],
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  nitro: {
    preset: "node-server",
    runtimeConfig: {
      // Pass API_URL to Nitro runtime for SSR
      apiUrl: process.env.API_URL || process.env.VITE_API_URL || "http://localhost:3333",
    },
    routeRules: {
      // Static assets - immutable with 1 year cache
      "/logos/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      "/**/*.png": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      "/**/*.svg": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      "/**/*.ico": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      "/**/*.webp": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      "/**/*.woff2": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
      // HTML pages - no cache, revalidate
      "/**": { headers: { "cache-control": "public, max-age=0, must-revalidate" } },
    },
  },
  ssr: {
    noExternal: [
      "@tabler/icons-react",
    ],
  },
});
