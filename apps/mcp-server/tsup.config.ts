import { cpSync, readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Bundle everything except MCP SDK (provided by host environment)
  // This includes api-contracts, zod, and all other dependencies
  external: ["@modelcontextprotocol/sdk"],
  // Preserve shebang for CLI
  shims: true,
  splitting: false,
  dts: false, // We don't need type declarations for a CLI binary
  define: {
    "process.env.PKG_VERSION": JSON.stringify(pkg.version),
  },
  minify: false,
  onSuccess: async () => {
    // Copy documentation to dist
    cpSync("../../docs/public", "dist/docs", { recursive: true });
  },
});
