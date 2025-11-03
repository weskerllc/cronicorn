# Package.json Best Practices for TypeScript + ESM + Project References

## Summary of Changes

All packages have been standardized to follow TypeScript's recommended package.json format for ESM packages with project references.

## The Standard Format

According to TypeScript documentation, every package that exports compiled code should have:

```jsonc
{
  "name": "@your-org/package-name",
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

### 1. **`"type": "module"`**
- Tells Node.js to treat `.js` files as ESM
- Required for `import`/`export` syntax at runtime
- All our packages use ESM

### 2. **`"main"` and `"types"`** (Legacy Compatibility)
- `main`: Entry point for older tools that don't understand `exports`
- `types`: TypeScript types for older TypeScript versions
- Still widely used, so we keep them

### 3. **`"exports"`** (Modern, Recommended)
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

### 4. **`"files": ["dist"]`**
- Controls what gets published to npm
- Only include compiled output, not source
- Keeps published package small

## What Was Wrong Before

### ❌ Problem 1: Exporting from `src` instead of `dist`

```jsonc
// WRONG - This tries to load .ts files at runtime!
"exports": {
  ".": {
    "types": "./src/index.ts",   // ← TypeScript source
    "default": "./src/index.ts"   // ← TypeScript source
  }
}
```

**Why this failed:**
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

### ❌ Problem 2: Inconsistent package.json formats

Before:
- `adapter-cron`, `adapter-drizzle`: exported from `src` ❌
- `adapter-http`, `adapter-system-clock`: exported from `dist` but missing `main`/`files` ✅⚠️
- `adapter-ai`: had `files` but wrong `exports` format ⚠️
- `domain`, `scheduler`: correct format ✅

Now: **All packages use the same standard format** ✅

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
✅ Running `node apps/scheduler/dist/index.js` works without `.ts` errors  

## Common Pitfalls

### 1. **Forgetting to build before running**
```bash
# ❌ BAD - No build step
pnpm start

# ✅ GOOD - Build first
pnpm build
pnpm start
```

### 2. **Importing from source in production**
```typescript
// ❌ BAD - Tries to import .ts files
import { foo } from "@cronicorn/domain/src/index.ts"

// ✅ GOOD - Uses package exports
import { foo } from "@cronicorn/domain"
```

### 3. **Missing dist folder**
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
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf node_modules .turbo dist"
  },
  "dependencies": {
    // Your deps here
  }
}
```

## References

- [Node.js Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
