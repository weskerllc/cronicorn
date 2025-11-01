# MCP Server Bundling Strategy

## Overview

The `@cronicorn/mcp-server` package uses **Option 2: Bundle api-contracts** approach. This means:

- ✅ `@cronicorn/api-contracts` is **bundled** into the dist output
- ✅ Only **one package** to publish (`@cronicorn/mcp-server`)
- ✅ No external dependencies except `@modelcontextprotocol/sdk`
- ✅ Single 470KB executable binary

## Why Bundle Instead of Publish Separately?

**Benefits:**
1. **Simpler distribution**: Users install one package
2. **No version mismatches**: api-contracts is always in sync with mcp-server
3. **Faster installs**: No separate package resolution needed
4. **Smaller attack surface**: Fewer dependencies for security audits

**Tradeoffs:**
- api-contracts isn't reusable by other consumers (acceptable - it's internal)
- Bundle size is larger (~470KB vs separate packages)
- Version updates require rebuilding the entire bundle

## Build Configuration

### tsup.config.ts

```typescript
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  
  // Bundle everything EXCEPT the MCP SDK
  external: ["@modelcontextprotocol/sdk"],
  
  // Bundled dependencies:
  // - @cronicorn/api-contracts (workspace package)
  // - zod (runtime validation)
  // - open (OAuth device flow)
  // - All their transitive dependencies
  
  shims: true,  // Preserve shebang for CLI
  sourcemap: true,
  minify: false,
});
```

### package.json Structure

**Production dependency:**
- `@modelcontextprotocol/sdk` - Provided by Claude Desktop or host environment

**Dev dependencies (bundled at build time):**
- `tsup` - Build tool
- `open` - Bundled into dist
- `zod` - Bundled into dist
- `@cronicorn/api-contracts` - Bundled into dist (workspace dependency)

## Publishing Workflow

```bash
# 1. Build the bundle
cd apps/mcp-server
pnpm build

# 2. Verify the bundle
pnpm pack  # Creates cronicorn-mcp-server-0.1.0.tgz

# 3. Inspect contents
tar -tzf cronicorn-mcp-server-0.1.0.tgz

# 4. Publish to npm
pnpm publish --access public

# Or publish with npm directly
npm publish --access public
```

## What Gets Published

```
@cronicorn/mcp-server@0.1.0
├── dist/
│   ├── index.js       # 470KB bundled executable
│   └── index.js.map   # 923KB source map
├── package.json
└── README.md
```

## Verification

### Bundle includes api-contracts code:
```bash
grep "CreateJobRequestSchema" dist/index.js
# Should find: var CreateJobRequestSchema = z.object({
```

### Bundle has no workspace references:
```bash
grep "@cronicorn/api-contracts" dist/index.js
# Should return 0 matches
```

### Executable permissions preserved:
```bash
ls -l dist/index.js
# Should show: -rwxr-xr-x (executable)
```

## Bundle Size Analysis

- **Total size**: 470KB (unminified)
- **Contains**:
  - Zod runtime (~100KB)
  - API contracts schemas (~50KB)
  - MCP tools logic (~100KB)
  - Open package (~50KB)
  - Auth logic (~20KB)
  - Other utilities (~150KB)

**Note**: Bundle could be minified for production, but we keep it readable for debugging.

## Alternative Considered: Separate Publishing

We evaluated publishing both packages separately but chose bundling because:

1. api-contracts has no standalone use case (it's specific to Cronicorn API)
2. Simpler user experience (one `npm install` vs two)
3. No version coordination needed between packages
4. Faster cold starts (no separate package resolution)

## Future Optimizations

If bundle size becomes a concern:

1. **Enable minification**: Add `minify: true` to tsup.config.ts (~30% reduction)
2. **Tree shaking**: Ensure only used Zod schemas are included
3. **Split vendor chunk**: Extract common deps if creating multiple MCP tools
4. **Compression**: Publish with gzip compression enabled

## Local Development

For local development, the workspace dependency still works normally:

```bash
# Install dependencies (includes workspace link)
pnpm install

# Build in watch mode (hot reload)
pnpm dev

# TypeScript still has access to api-contracts types
import { CreateJobRequestSchema } from "@cronicorn/api-contracts";
```

The bundling only happens during the `pnpm build` step for production distribution.
