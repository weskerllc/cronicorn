---
applyTo: '**'
---

# TypeScript + ESM + Project References

**Complete workspace details:** See `docs/public/developers/workspace-structure.md`

## Critical Rule: Export from dist/, Not src/

```jsonc
// ✅ CORRECT - Load compiled .js and .d.ts files
"exports": {
  ".": {
    "types": "./dist/index.d.ts",  // ← Types first!
    "default": "./dist/index.js"    // ← Compiled JS
  }
}
```

```jsonc
// ❌ WRONG - Tries to load .ts files at runtime!
"exports": {
  ".": {
    "types": "./src/index.ts",   // ← Node.js can't run .ts
    "default": "./src/index.ts"
  }
}
```

**Why**: Node.js cannot run TypeScript files directly → `ERR_UNKNOWN_FILE_EXTENSION`

## Standard Package.json Format

Every package must have:
- `"type": "module"` - ESM by default
- `"main": "./dist/index.js"` - Legacy fallback
- `"types": "./dist/index.d.ts"` - TypeScript types
- `"exports"` with types first, then default
- `"files": ["dist"]` - Only publish compiled output

## Common Pitfalls

### 1. Importing from source
```typescript
// ❌ BAD - Tries to import .ts files
import { foo } from "@cronicorn/domain/src/index.ts"

// ✅ GOOD - Uses package exports
import { foo } from "@cronicorn/domain"
```

### 2. Missing dist folder
```bash
# Clean and rebuild
rm -rf packages/*/dist apps/*/dist
pnpm build
```

### 3. Forgetting to build
```bash
# ❌ BAD - No build step
pnpm start

# ✅ GOOD - Build first
pnpm build
pnpm start
```

## Environment Variables

**All environment variables** are in a single `.env` file at repository root.

Root `package.json` scripts use `dotenv-cli` to automatically load `.env`:

```bash
# These automatically load .env
pnpm dev
pnpm test
```

**For custom commands:**
```bash
pnpm exec dotenv -e .env -- <your-command>
```

## Dev vs Production

- **Dev**: Apps use `tsx watch` (no build required for apps, only packages)
- **Production**: Apps built to `dist/` with `tsc`

The `postinstall` hook builds packages automatically after `pnpm install`.

## References

- **Workspace structure**: `docs/public/developers/workspace-structure.md`
- **Quick start**: `docs/public/developers/quick-start.md`
