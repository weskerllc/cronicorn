# MCP Server Bundling Strategy

**Date:** 2025-11-01  
**Status:** Accepted

## Context

The `@cronicorn/mcp-server` package depends on `@cronicorn/api-contracts` for Zod schemas that define API request/response types. When preparing to publish the MCP server to npm, we needed to decide on a distribution strategy:

**Option 1: Publish Both Packages Separately**
- Publish `@cronicorn/api-contracts` as a standalone npm package
- Publish `@cronicorn/mcp-server` with a dependency on api-contracts
- Standard monorepo publishing pattern (e.g., `workspace:*` → `^1.0.0`)

**Option 2: Bundle api-contracts into mcp-server**
- Keep `@cronicorn/api-contracts` as a private workspace package
- Use a bundler (tsup) to include api-contracts code in mcp-server dist
- Publish only `@cronicorn/mcp-server` to npm

## Decision

We chose **Option 2: Bundle api-contracts** using tsup as the bundler.

### Build Configuration

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  
  // Only external dependency: MCP SDK (provided by host)
  external: ["@modelcontextprotocol/sdk"],
  
  // Everything else bundled:
  // - @cronicorn/api-contracts
  // - zod
  // - open
  // - All transitive dependencies
  
  shims: true,
  sourcemap: true,
  minify: false,
});
```

### Package Structure

**Production dependency:**
- `@modelcontextprotocol/sdk` - Host-provided runtime

**Dev dependencies (bundled at build):**
- `tsup` - Bundler
- `open` - OAuth device flow
- `zod` - Runtime validation
- `@cronicorn/api-contracts` (workspace) - API schemas

**Published artifact:**
- Single 470KB executable (`dist/index.js`)
- Only depends on `@modelcontextprotocol/sdk`

## Consequences

### Positive

1. **Simpler User Experience**
   - Users run `npm install @cronicorn/mcp-server` (one command)
   - No need to coordinate versions between two packages
   - Faster installation (one package resolution)

2. **Zero Version Drift**
   - api-contracts is always in sync with mcp-server
   - No breaking changes from mismatched versions
   - Atomic updates (one version bump)

3. **Reduced Maintenance**
   - Only one package to publish and version
   - No need for separate changelogs/releases
   - Simpler CI/CD pipeline

4. **Security**
   - Smaller attack surface (fewer external dependencies)
   - Easier to audit (single artifact)
   - No supply chain risk from api-contracts

5. **Distribution**
   - Self-contained binary (works offline after install)
   - Consistent behavior across environments
   - No peer dependency issues

### Negative

1. **Bundle Size**
   - 470KB total (vs ~200KB for separate packages)
   - Includes full Zod runtime even though only schemas used
   - Could be mitigated with minification (~30% reduction)

2. **Code Reusability**
   - api-contracts cannot be used by external consumers
   - No standalone TypeScript type library
   - **Mitigation**: This is acceptable - api-contracts is internal and specific to Cronicorn's API

3. **Build Complexity**
   - Added tsup as build dependency
   - More complex build step than plain tsc
   - **Mitigation**: tsup is well-maintained, widely used, and configuration is minimal

4. **Debugging**
   - Stack traces reference bundled code
   - **Mitigation**: We include sourcemaps for debugging

### Code Impact

**Files Modified:**
- `apps/mcp-server/package.json` - Updated scripts, removed workspace dep from production
- `apps/mcp-server/tsup.config.ts` - New bundler configuration
- `apps/mcp-server/.npmignore` - Exclude source files from npm package

**Files Created:**
- `apps/mcp-server/BUNDLING.md` - Technical documentation

**Build Process:**
```bash
# Development (workspace link still works)
pnpm install
pnpm dev  # tsup --watch

# Production bundle
pnpm build  # tsup → dist/index.js (470KB)

# Publishing
pnpm pack    # Verify contents
pnpm publish # Publish to npm
```

### Alternative Approaches Considered

**Dual Publishing (Both Options)**
- Publish both packages but make api-contracts optional
- **Rejected**: Adds complexity without clear benefit

**Minification**
- Bundle but minify output
- **Deferred**: Keep readable for debugging; can enable later if size matters

**Separate Publishing**
- Standard approach for shared libraries
- **Rejected**: api-contracts has no standalone use case

## References

- **Task IDs**: Related to MCP server publishing workflow
- **Documentation**: `apps/mcp-server/BUNDLING.md`
- **Tech Debt**: Tracked in `docs/_RUNNING_TECH_DEBT.md` (resolved)
- **pnpm Docs**: Workspace protocol transformation on publish
- **tsup Docs**: Zero-config TypeScript bundler

## Reversal Strategy

If we need to unbundle in the future:

1. Publish `@cronicorn/api-contracts` to npm as public package
2. Update `apps/mcp-server/package.json`:
   ```json
   {
     "dependencies": {
       "@cronicorn/api-contracts": "^1.0.0",
       "@modelcontextprotocol/sdk": "^1.20.2"
     }
   }
   ```
3. Remove tsup, revert to `tsc` for builds
4. Update import paths (should work without changes)
5. Publish both packages

**Estimated effort**: 1-2 hours

**Likelihood**: Low (unless api-contracts becomes useful for external SDK)
