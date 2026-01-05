---
applyTo: '**'
---

# TypeScript + ESM + Project References

## Quick Reference

**→ For build/run commands, see `docs/public/developers/quick-start.md`**
**→ For project structure, see `docs/public/developers/workspace-structure.md`**

This document explains the technical details of package.json structure in this monorepo.

## Summary

All packages follow TypeScript's recommended format for ESM packages with project references. This ensures compatibility with Node.js runtime and proper TypeScript compilation.

## The Standard Format

Every package that exports compiled code should have:

```jsonc
{
  "name": "@cronicorn/package-name",
  "version": "1.0.0",
  "type": "module",                    // ESM by default

  // Legacy fields for older tools
  "main": "./dist/index.js",           // CommonJS/legacy fallback
  "types": "./dist/index.d.ts",        // TypeScript types

  // Modern exports map (preferred)
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",    // Types first for TypeScript
      "default": "./dist/index.js"      // Runtime code
    }
  },

  // What to include when publishing
  "files": ["dist"]
}
```

## Why This Structure?

### 1. `"type": "module"`
- Tells Node.js to treat `.js` files as ESM
- Required for `import`/`export` syntax at runtime
- All our packages use ESM

### 2. `"main"` and `"types"` (Legacy Compatibility)
- `main`: Entry point for older tools that don't understand `exports`
- `types`: TypeScript types for older TypeScript versions
- Still widely used, so we keep them

### 3. `"exports"` (Modern, Recommended)
- Node.js 12+ and TypeScript 4.7+ understand this
- More precise control over what can be imported
- `types` condition should come **first** (TypeScript requires this order)
- `default` is the actual runtime code

**Why this order matters:**
```jsonc
"exports": {
  ".": {
    "types": "./dist/index.d.ts",  // ← MUST be first
    "default": "./dist/index.js"    // ← Then runtime
  }
}
```

TypeScript stops at the first matching condition, so `types` must come before `default`.

### 4. `"files": ["dist"]`
- Controls what gets published to npm
- Only include compiled output, not source
- Keeps published package small

## Critical Rule: Export from dist/, Not src/

### ❌ Problem: Exporting from `src` instead of `dist`

```jsonc
// WRONG - This tries to load .ts files at runtime!
"exports": {
  ".": {
    "types": "./src/index.ts",   // ← TypeScript source
    "default": "./src/index.ts"   // ← TypeScript source
  }
}
```

**Why this fails:**
- Node.js **cannot run TypeScript files** directly
- At runtime, Node.js tries to load `.ts` files → `ERR_UNKNOWN_FILE_EXTENSION`
- Only works in development with `tsx` or `ts-node`

### ✅ Solution: Export from `dist`

```jsonc
// CORRECT - Load compiled .js and .d.ts files
"exports": {
  ".": {
    "types": "./dist/index.d.ts",  // ← Compiled types
    "default": "./dist/index.js"    // ← Compiled JS
  }
}
```

## TypeScript Project References + Package.json

With project references (`composite: true`), TypeScript:
1. **Builds** `.js` and `.d.ts` files to `dist/`
2. **Other packages import** via the package name (e.g., `@cronicorn/domain`)
3. **Node.js resolves** through `node_modules` symlinks (pnpm workspaces)
4. **TypeScript finds types** from the `exports.types` field
5. **Runtime uses** the compiled `.js` from `exports.default`

## Verification Checklist

✅ All packages have `"type": "module"`
✅ All packages have `"main": "./dist/index.js"`
✅ All packages have `"types": "./dist/index.d.ts"`
✅ All packages have proper `"exports"` with `types` first
✅ All packages have `"files": ["dist"]`
✅ All exports point to `dist/`, not `src/`
✅ Running `pnpm build` compiles all packages
✅ Running `node apps/scheduler-app/dist/index.js` works without `.ts` errors

## Common Pitfalls

### 1. Forgetting to build before running
```bash
# ❌ BAD - No build step
pnpm start

# ✅ GOOD - Build first
pnpm build
pnpm start
```

### 2. Importing from source in production
```typescript
// ❌ BAD - Tries to import .ts files
import { foo } from "@cronicorn/domain/src/index.ts"

// ✅ GOOD - Uses package exports
import { foo } from "@cronicorn/domain"
```

### 3. Missing dist folder
If you get module not found errors:
```bash
# Clean and rebuild
rm -rf packages/*/dist apps/*/dist
find . -name "tsconfig.tsbuildinfo" -delete
pnpm build
```

## Package.json Template

Use this template for new packages:

```jsonc
{
  "name": "@cronicorn/your-package",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b",
    "watch": "tsc -b -w",
    "test": "vitest run",
    "clean": "rm -rf node_modules .turbo dist"
  },
  "dependencies": {
    // Your deps here
  }
}
```

## Environment Variables

All environment variables are stored in a **single `.env` file at the repository root**. This file is used by all apps and packages.

The root `package.json` scripts use `dotenv-cli` to automatically load the `.env` file:

```bash
# These automatically load .env
pnpm dev          # Start all services
pnpm dev:api      # API server only
pnpm test         # Run tests
```

### Running Custom Commands

If you need to run a command not in package.json:

```bash
pnpm exec dotenv -e .env -- <your-command>
```

Example:
```bash
pnpm exec dotenv -e .env -- tsx scripts/my-script.ts
```

## Dev vs Production

- **Dev mode**: Apps use `tsx watch` (no build required for apps, only packages)
- **Production**: Apps are built to `dist/` with `tsc`

The `postinstall` hook automatically builds packages after `pnpm install`.

## References

- [Node.js Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
