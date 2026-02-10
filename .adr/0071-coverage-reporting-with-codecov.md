# Coverage Reporting with Codecov

**Date:** 2026-02-10
**Status:** Accepted

## Context

The monorepo already has full coverage infrastructure — `@vitest/coverage-v8` installed, `vitest.config.ts` with v8 provider producing lcov/html reports, and a `pnpm test:coverage` script. However coverage was not collected in CI, no reporting service was integrated, no README badge existed, and `coverage.enabled: true` meant every local `pnpm test` run paid coverage overhead unnecessarily.

We needed a coverage reporting service that:
- Supports lcov (already generated)
- Provides PR comments with diff coverage
- Offers a dynamic badge
- Requires zero npm dependencies
- Works well with monorepos

## Decision

Use **Codecov** as the coverage reporting service, integrated via the `codecov/codecov-action@v5` GitHub Action.

**Key configuration choices:**
- `coverage.enabled: false` in `vitest.config.ts` so local `pnpm test` is fast; `pnpm test:coverage` still works via `--coverage` CLI flag
- CI runs `pnpm test:coverage` instead of `pnpm test`
- Upload step uses `fail_ci_if_error: false` so coverage upload failures never block CI
- Upload step uses `if: always()` so partial data is captured even when some tests fail
- Project and patch coverage status checks are **off** — reporting is informational only, no thresholds enforced (coverage is currently ~16% and not yet a priority)

**Why Codecov over alternatives:**
- Free for public repos, generous free tier for private
- Native lcov support
- PR comments with diff coverage out of the box
- Dynamic badge auto-updates
- Zero npm dependencies (GitHub Action only)
- Industry standard for OSS monorepos

**Why not Coveralls:** Less monorepo tooling and weaker PR integration.
**Why not custom badge (shields.io + JSON endpoint):** Requires hosting/storing coverage data — more maintenance for no benefit.

## Consequences

**Benefits:**
- Coverage is tracked over time and visible on every PR
- Developers get immediate feedback on whether new code is tested
- No local test performance regression (coverage disabled by default)
- README badge provides at-a-glance project health

**Tradeoffs:**
- CI test step is slightly slower (coverage instrumentation overhead)
- Requires Codecov account setup and (for private repos) a `CODECOV_TOKEN` secret

**Files affected:**
- `vitest.config.ts` — `enabled: false`
- `.github/workflows/ci.yml` — `pnpm test:coverage` + Codecov upload step
- `codecov.yml` — new file, project/patch coverage configuration
- `README.md` — Codecov badge
- `docs/contributors/quality-checks.md` — coverage documentation

## References

- ADR-0009: Transaction-per-test pattern (related testing infrastructure)
