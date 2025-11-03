# Centralize Favicon and Logo Assets in Content Package

**Date:** 2025-11-03
**Status:** Accepted

## Context

Following the centralization of marketing content in ADR 0039, we identified that brand assets (logo and favicon) were duplicated across multiple apps:
- Web app had `src/icon.svg` and `public/favicon.ico`
- Docs app had `static/img/logo.svg` and `static/img/favicon.ico`
- API app referenced `/img/favicon.ico` but had no assets

This created maintenance overhead and inconsistency risks when updating brand assets.

## Decision

We extended the `@cronicorn/content` package to be the single source of truth for brand assets by:

1. **Created assets directory** in `packages/content/assets/` containing:
   - `logo.svg` - The canonical brand logo/icon
   - `favicon.ico` - ICO fallback for older browsers

2. **Added asset metadata** in `packages/content/src/assets.ts`:
   ```ts
   export const logo = {
     svg: "/logo.svg",
     alt: "Cronicorn intelligent cron job scheduling platform logo",
     sizes: "32x32",
   } as const;

   export const favicon = {
     svg: "/logo.svg",
     ico: "/favicon.ico",
     sizes: "32x32",
     type: "image/svg+xml",
   } as const;
   ```

3. **Build-time asset copying** - Each app copies assets from content package during build:
   - **Web app**: Copies all assets to `public/` directory
   - **Docs app**: Copies logo.svg and favicon.ico to `static/img/` directory
   - **API app**: Copies favicon.ico to `public/img/` directory

4. **Package.json scripts** added to each app:
   - **Web app**: 
     ```json
     {
       "copy-assets": "copyfiles -f ../../packages/content/assets/* ./public/ && cp ../../packages/content/assets/logo.svg ./src/logo.svg",
       "dev": "pnpm copy-assets && vite",
       "build": "pnpm copy-assets && tsc --noEmit && vite build"
     }
     ```
   - **Docs app**:
     ```json
     {
       "copy-assets": "copyfiles -f ../../packages/content/assets/logo.svg ../../packages/content/assets/favicon.ico ./static/img/",
       "start": "pnpm copy-assets && docusaurus start",
       "build": "pnpm copy-assets && docusaurus build"
     }
     ```
   - **API app**:
     ```json
     {
       "copy-assets": "copyfiles -f ../../packages/content/assets/favicon.ico ./public/img/",
       "dev": "pnpm copy-assets && tsx watch src/index.ts"
     }
     ```

5. **Logo imports** - Web app imports SVG as React component from local src directory (copied during build):
   ```tsx
   import AppLogo from "../logo.svg?react";
   ```
   Note: Direct imports from `@cronicorn/content/assets/` don't work with Vite's `?react` query due to module resolution issues, so we copy to src during build.

6. **Static file serving** - API app configured to serve static files from `public/` directory using `@hono/node-server/serve-static`:
   ```ts
   import { serveStatic } from "@hono/node-server/serve-static";
   app.use("/img/*", serveStatic({ root: "./public" }));
   ```

## Consequences

### Positive

- ✅ **Single source of truth**: All brand assets managed from one location
- ✅ **Consistency**: All apps use identical logo and favicon
- ✅ **Easy updates**: Change asset once, rebuild apps to propagate
- ✅ **Type safety**: Metadata exports provide type-safe paths and properties
- ✅ **Framework compatible**: Works with Vite, Docusaurus, and Hono
- ✅ **Follows established pattern**: Consistent with ADR 0039 content centralization
- ✅ **Supports both use cases**: Inline SVG components + static favicon references

### Neutral

- Build scripts copy files to each app's public/static directory (standard approach)
- Assets duplicated in build outputs (expected, necessary for static serving)
- Requires `copyfiles` dev dependency at workspace root

### Negative

- Asset changes require rebuilding all apps to propagate (acceptable, infrequent)
- Small overhead in build scripts (< 100ms, negligible)

## Implementation Details

### Files Created
- `packages/content/assets/logo.svg` - Canonical brand logo
- `packages/content/assets/favicon.ico` - Browser favicon
- `packages/content/src/assets.ts` - Asset metadata exports

### Files Updated
- `packages/content/package.json` - Added `/assets` export path
- `packages/content/src/index.ts` - Export assets module
- `apps/web/package.json` - Added `copy-assets` script
- `apps/docs/package.json` - Added `copy-assets` script
- `apps/api/package.json` - Added `copy-assets` script
- `apps/api/src/app.ts` - Added static file serving middleware
- `apps/web/src/components/splash-page/components/header-section.tsx` - Updated logo import
- `apps/web/src/routes/index.tsx` - Updated logo import

### Dependencies Added
- `copyfiles` (workspace dev dependency)

### Directory Structure
```
packages/content/
  assets/
    logo.svg          # Canonical brand logo
    favicon.ico       # Browser favicon
  src/
    assets.ts         # Asset metadata exports
```

## Verification

- ✅ Assets copied successfully to all apps
- ✅ Web app imports logo as React component
- ✅ Docs app references logo and favicon via standard paths
- ✅ API app serves favicon via `/img/favicon.ico`
- ✅ No TypeScript errors
- ✅ Build scripts work in all apps

## References

- Related to ADR 0039 (Centralize Marketing Content)
- Establishes pattern for future shared assets (social media images, etc.)
