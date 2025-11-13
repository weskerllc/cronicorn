import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    svgr(),
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
    // Enable minification
    minify: "esbuild",
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            if (id.includes("@tanstack/react-router")) {
              return "router-vendor";
            }
            if (id.includes("@tanstack/react-query")) {
              return "query-vendor";
            }
            if (id.includes("better-auth")) {
              return "auth-vendor"; // Separate chunk for auth (only loaded on protected routes)
            }
            if (id.includes("recharts") || id.includes("victory")) {
              return "charts-vendor"; // Charts library
            }
            if (id.includes("lucide-react") || id.includes("@tabler/icons-react")) {
              return "ui-vendor";
            }
            if (id.includes("zod") || id.includes("react-hook-form")) {
              return "forms-vendor";
            }
            // Group other node_modules
            return "vendor";
          }
        },
      },
    },
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3333",
    },
    // File watcher optimization
    watch: {
      ignored: ["**/.tanstack/**", "**/node_modules/**", "**/dist/**"],
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
