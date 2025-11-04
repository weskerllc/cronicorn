# TypeScript Project References Setup

## Quick Reference

**→ For common build/dev commands, see `docs/public/developers/quick-start.md`**

This document explains the technical details of our TypeScript project references setup.

## Dev vs Production Modes

- **Dev mode** (`pnpm dev`): Apps use `tsx watch` - no build required, packages are auto-built on install
- **Production** (`pnpm build`): Full compilation with `tsc -b` - builds all packages and apps to `dist/`

## Overview

This monorepo now uses **TypeScript Project References** for faster, incremental builds. This eliminates the need to manually build dependent packages before importing them.

## What Changed

### 1. All Library Packages Now Have `composite: true`

Every package that other packages depend on has `composite: true` in its `tsconfig.json`:
- `packages/domain`
- `packages/scheduler`
- `packages/adapter-ai`
- `packages/adapter-cron`
- `packages/adapter-drizzle`
- `packages/adapter-http`
- `packages/adapter-system-clock`

**What `composite: true` does:**
- Generates `.d.ts` declaration files automatically
- Enables incremental compilation
- Allows other projects to reference this project's outputs
- TypeScript uses the built `.d.ts` files instead of source files

### 2. All Packages Use `tsc -b` Instead of `tsc`

All `build` scripts now use `tsc -b` (build mode):
```json
{
  "scripts": {
    "build": "tsc -b",
    "watch": "tsc -b -w"
  }
}
```

**What `tsc -b` does:**
- Automatically builds dependencies in the correct order
- Only rebuilds changed packages (incremental)
- Faster builds overall

### 3. Dependency References Added

Each package's `tsconfig.json` now has a `references` array pointing to its dependencies:

```jsonc
// packages/adapter-http/tsconfig.json
{
  "references": [
    { "path": "../domain" }
  ]
}
```

```jsonc
// apps/scheduler/tsconfig.json
{
  "references": [
    { "path": "../../packages/domain" },
    { "path": "../../packages/scheduler" },
    { "path": "../../packages/adapter-cron" },
    // ... all dependencies
  ]
}
```

### 4. Root `tsconfig.json` Created

A new root `tsconfig.json` references all packages for easy solution-wide builds:

```bash
# Build everything at once from the root
npx tsc -b

# Or clean and rebuild
npx tsc -b --clean && npx tsc -b
```

### 5. `tsconfig.base.json` Simplified

Removed `paths` and `baseUrl` because:
- With project references, TypeScript follows the `references` chains
- Packages resolve through pnpm workspace symlinks in `node_modules`
- Cleaner and more maintainable

Added `incremental: true` for faster rebuilds.

## Dependency Graph

```
domain (no deps)
  ├→ adapter-cron
  ├→ adapter-drizzle  
  ├→ adapter-http
  ├→ adapter-system-clock
  └→ scheduler
       └→ adapter-ai

apps/scheduler depends on:
  - domain, scheduler, adapter-cron, adapter-drizzle, adapter-http, adapter-system-clock

apps/test-ai depends on:
  - domain, scheduler, adapter-ai
```

## How to Use

### Building

```bash
# Build everything from root (recommended)
pnpm build

# Build a specific package (automatically builds dependencies)
cd packages/scheduler
pnpm build

# Clean build everything
npx tsc -b --clean
pnpm build

# Build in watch mode
pnpm watch
```

### Development Workflow

1. **Make changes** to any package
2. **Run `pnpm build`** - only changed packages rebuild
3. **Run your app** - it will use the latest built `.d.ts` files

### Editor Experience

Your editor (VS Code) will:
- ✅ Show correct types from referenced packages
- ✅ "Go to Definition" works across package boundaries
- ✅ Autocomplete works with all dependencies
- ✅ Type errors show immediately

## ESM Compatibility

All configurations maintain ESM compatibility:
- `"type": "module"` in all `package.json` files
- `module: "NodeNext"` and `moduleResolution: "NodeNext"` in tsconfigs
- `verbatimModuleSyntax: true` preserves exact import/export syntax
- Runtime behavior matches TypeScript behavior

## Benefits

### Before (Without Project References)
```bash
# Had to manually build in order
cd packages/domain && pnpm build
cd ../scheduler && pnpm build  
cd ../adapter-ai && pnpm build
cd ../../apps/test-ai && pnpm dev
```

### After (With Project References)
```bash
# Just build once - dependencies auto-build
pnpm build

# Or let turbo handle it
pnpm dev
```

### Performance Improvements
- ⚡ **Incremental builds**: Only rebuilds changed packages
- ⚡ **Parallel builds**: Turbo builds independent packages in parallel
- ⚡ **Dependency ordering**: TypeScript figures out the build order
- ⚡ **Editor performance**: TypeScript uses pre-built `.d.ts` files

## Troubleshooting

### "Cannot find module '@cronicorn/domain'"

**Solution**: Build the dependencies first
```bash
pnpm build
```

### Stale build artifacts

**Solution**: Clean and rebuild
```bash
find . -name "tsconfig.tsbuildinfo" -delete
find packages apps -name "dist" -type d -exec rm -rf {} +
pnpm build
```

### Types not updating in editor

**Solution**: Rebuild the changed package
```bash
cd packages/domain
pnpm build
```

Then restart your TypeScript server in VS Code:
- Cmd+Shift+P → "TypeScript: Restart TS Server"

## References

- [TypeScript Project References Handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Build Mode (`tsc -b`)](https://www.typescriptlang.org/docs/handbook/project-references.html#build-mode-for-typescript)
