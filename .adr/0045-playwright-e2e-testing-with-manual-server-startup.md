# Playwright E2E Testing with Manual Server Startup

**Date:** 2025-11-04  
**Status:** Accepted

## Context

We needed to implement end-to-end testing for the Cronicorn monorepo to validate:
- Web application (React + Vite on port 5173)
- API server (Hono on port 3333)
- Documentation site (Docusaurus on port 3000)
- Background workers (scheduler, ai-planner)

**Initial exploration considered:**
1. Playwright's `webServer` auto-start feature (dev mode)
2. Playwright's `webServer` with production builds
3. Manual server startup before running tests
4. CI-specific vs local-specific strategies

**Challenges encountered:**
- Production builds take ~6 seconds (repeated on every test run)
- Dev servers take ~10-15 seconds to start (HMR, watchers add overhead)
- Interrupted Playwright runs leave zombie processes on ports
- CI environments need clean, repeatable setup
- Local development needs fast iteration

## Decision

**Use Playwright's `webServer` feature with the assumption that dev servers are already running locally.**

### Configuration Approach

1. **Playwright `webServer` config**: Start production servers for tests
   ```typescript
   webServer: [
     {
       command: "pnpm --filter @cronicorn/web run serve", // vite preview
       url: "http://localhost:5173",
       reuseExistingServer: !isCI, // ← Key decision
     },
     {
       command: "pnpm --filter @cronicorn/api start",
       url: "http://localhost:3333/health",
       reuseExistingServer: !isCI,
     },
   ]
   ```

2. **Test scripts**: No automatic build in test scripts
   ```json
   {
     "test:e2e": "pnpm --filter @cronicorn/e2e test",
     "test:e2e:ui": "pnpm --filter @cronicorn/e2e test:ui"
   }
   ```

3. **Developer workflow**:
   - Start dev servers manually: `pnpm dev` (or `pnpm dev:web`, `pnpm dev:api`)
   - Run tests: `pnpm test:e2e`
   - Playwright reuses running servers (`reuseExistingServer: true`)
   - Fast iteration: ~2 seconds per test run (no build/startup delay)

4. **CI workflow** (future):
   - `reuseExistingServer: false` in CI (via `process.env.CI`)
   - CI builds apps, then Playwright starts fresh servers
   - Clean state guaranteed for every CI run

### Rationale

**Why `reuseExistingServer: true` for local development?**
- ✅ **Fast iteration**: Tests run in ~2s instead of ~20s (build + server startup)
- ✅ **No zombie processes**: Dev servers are user-managed, not Playwright-managed
- ✅ **Developer control**: Explicit `pnpm dev` makes server state visible
- ✅ **Debuggability**: Can inspect running servers, logs, network traffic
- ✅ **Consistent with workflow**: Developers already run `pnpm dev` during development

**Why production builds for `webServer` commands?**
- ✅ **CI-ready**: Same commands work in CI (just disable `reuseExistingServer`)
- ✅ **Testing production code**: Catches build issues, minification bugs
- ✅ **Fallback option**: If no server running, Playwright starts production build

## Consequences

### Positive

✅ **Fast local testing**: ~2s per run when dev servers are running  
✅ **No process management issues**: Developers control server lifecycle  
✅ **Clear separation**: Test code vs server management  
✅ **CI-compatible**: Same config works in CI with `reuseExistingServer: false`  
✅ **Flexible**: Developers can test against dev OR production builds  
✅ **Self-documenting**: README clearly explains workflow

### Neutral

⚠️ **Manual setup required**: Developers must start `pnpm dev` before tests  
- Documented in README with clear instructions
- IDE run configurations can automate this

⚠️ **Dev vs production differences**: Local tests run against dev builds by default  
- Intentional tradeoff for speed
- Can switch to production by stopping dev server

### Negative

❌ **Not fully automated**: Requires manual step (`pnpm dev`)  
- Mitigation: Clear documentation, helper scripts, IDE setup
- Alternative considered (auto-start) adds ~20s per run

❌ **Potential state issues**: Dev server state persists across test runs  
- Mitigation: Tests should be stateless, use API cleanup
- Future: Add database transaction rollback for E2E tests

## References

- **Task**: E2E testing setup (conversation context)
- **Docs**: `/apps/e2e/README.md` - Developer guide
- **Pattern**: Playwright webServer feature with `reuseExistingServer`

## Implementation Notes

**Files Created:**
- `apps/e2e/package.json` - Playwright workspace
- `apps/e2e/playwright.config.ts` - Multi-server configuration
- `apps/e2e/tests/web-home.spec.ts` - Web app smoke tests
- `apps/e2e/tests/api-health.spec.ts` - API health checks
- `apps/e2e/tests/docs-home.spec.ts` - Docs site smoke tests
- `apps/e2e/tests/workers-health.spec.ts` - Worker health placeholders
- `apps/e2e/kill-servers.sh` - Helper to clean up stale processes
- `apps/e2e/README.md` - Comprehensive testing guide

**Configuration Updates:**
- `apps/web/vite.config.ts` - Added `preview.port: 5173` for consistency
- `package.json` - Added root-level `test:e2e*` scripts
- `.gitignore` - Added `apps/e2e/test-results/`, `apps/e2e/playwright-report/`

**Key Config Settings:**
```typescript
webServer: [
  {
    command: "pnpm --filter @cronicorn/web run serve",
    url: "http://localhost:5173",
    reuseExistingServer: !isCI, // ← Reuse in local dev
    timeout: 120 * 1000,
    cwd: resolve(__dirname, "../.."), // Repo root for pnpm workspace
  },
  // ... API server similar
]
```

**Developer Workflow:**
```bash
# Terminal 1: Start dev servers
pnpm dev

# Terminal 2: Run tests (fast, reuses servers)
pnpm test:e2e

# View results
pnpm --filter @cronicorn/e2e test:report
```

**CI Workflow (future):**
```bash
# CI environment sets process.env.CI=true
pnpm build              # Build all apps
pnpm test:e2e           # Playwright starts fresh servers (reuseExistingServer=false)
```

**Validation:**
- ✅ Tests pass with dev servers running
- ✅ Tests pass with production builds (when dev servers stopped)
- ✅ Clean exit: Ctrl+C stops tests, servers remain for inspection
- ✅ No zombie processes when dev servers managed by user
