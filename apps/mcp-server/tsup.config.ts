import { defineConfig } from "tsup";

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
  minify: false,
  onSuccess: "echo ✅ MCP Server bundled successfully",
});
