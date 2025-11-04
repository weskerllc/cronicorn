# ADR-0044: Vite Source Aliasing for API Client

**Date:** 2025-11-04  
**Status:** Accepted

## Context

Previously, the web app imported RPC client types from the API's built output:

```typescript
// Web app imports
import apiClient from "@cronicorn/api/client";
// Resolved to: apps/api/dist/client.d.ts (requires tsc build)
```

This created a messy development workflow:
- API had to be built before web could start in dev mode
- `postinstall` hook had to run `build:packages && build:api`
- Fresh clones required building both packages AND the API
- Developer experience was poor (extra build step, slower installs)

## Decision

Configure Vite to alias the API client import directly to the source file in development:

**apps/web/vite.config.ts:**
```typescript
resolve: {
  alias: {
    "@": resolve(__dirname, "./src"),
    "@cronicorn/api/client": resolve(__dirname, "../api/src/client.ts"),
  },
}
```

**apps/web/tsconfig.json:**
```jsonc
"paths": {
  "@/*": ["./src/*"],
  "@cronicorn/ui-library/*": ["../../packages/ui-library/src/*"],
  "@cronicorn/api/client": ["../api/src/client.ts"]
}
```

**Why this works:**
- `apps/api/src/client.ts` is a **pure type export** - no runtime dependencies
- It only re-exports TypeScript types from Hono RPC client
- Vite can handle TypeScript source files natively
- Production builds still use the built output (correct package.json exports)

## Consequences

### Positive

✅ **Cleaner dev workflow:**
```bash
pnpm install  # Only builds packages (faster)
pnpm dev      # Works immediately
```

✅ **Simpler build scripts:**
- `postinstall: "pnpm build:packages"` (was `build:packages && build:api`)
- `build:deps` removed from dev workflow
- API build only happens in production builds

✅ **Better developer experience:**
- Faster first install (no API build)
- One less step to remember
- More intuitive ("just run dev")

✅ **HMR works correctly:**
- Changes to API routes/types instantly reflected in web app
- No rebuild needed during development

### Neutral

⚙️ **Dual-mode resolution:**
- Dev: Uses source file via Vite alias
- Prod: Uses built output via package.json exports
- Both work correctly, no conflicts

⚙️ **IDE autocomplete works:**
- TypeScript paths ensure VS Code can resolve types
- Jump-to-definition works in both dev and prod modes

### Code Changes

**Modified files:**
- `apps/web/vite.config.ts` - Added alias for `@cronicorn/api/client`
- `apps/web/tsconfig.json` - Added TypeScript path mapping
- `package.json` - Simplified `postinstall` and `build:deps`
- `docs/BUILD_SYSTEM.md` - Updated documentation
- `QUICK_START.md` - Simplified setup steps

**Build order (production):**
```
1. pnpm build:packages  (all workspace packages)
2. pnpm build:apps
   - pnpm build:api      (API server + client types)
   - pnpm build:web      (uses built API client)
   - pnpm build:scheduler
   - pnpm build:ai-planner
```

## Validation

Tested scenarios:
- ✅ Fresh clone without API dist folder → web dev works
- ✅ Full dev environment (`pnpm dev`) → all services start
- ✅ Production build → API built before web
- ✅ HMR in dev mode → type changes instantly visible
- ✅ IDE autocomplete → resolves correctly

## References

- Vite alias documentation: https://vitejs.dev/config/shared-options.html#resolve-alias
- Hono RPC client pattern: https://hono.dev/docs/guides/rpc
- TypeScript path mapping: https://www.typescriptlang.org/tsconfig#paths

## Future Considerations

If `apps/api/src/client.ts` ever gains runtime dependencies (currently pure types), we would need to:
1. Extract client types to separate package (`@cronicorn/api-client`)
2. Or ensure Vite can bundle those dependencies correctly
3. Or revert to build-time type generation

Currently not an issue - the file is intentionally type-only for this reason.
