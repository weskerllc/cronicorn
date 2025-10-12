# Contract Tests in Domain Package

**Date:** 2025-10-10  
**Status:** Accepted

## Context

The initial implementation of the Drizzle PostgreSQL adapter (`@cronicorn/adapter-drizzle`) created contract tests to validate that adapter implementations correctly implement the port interfaces. However, the test structure violated architectural boundaries:

**Problems identified:**
1. **Cross-adapter dependency**: `adapter-drizzle` imported `InMemoryJobsRepo` from `scheduler` package
2. **Wrong test ownership**: Memory store tests lived in `adapter-drizzle` instead of `scheduler`
3. **Contract test duplication risk**: Contract tests were specific to one adapter, not reusable
4. **Unclear boundaries**: Test utilities scattered across adapter packages

**Initial structure (WRONG):**
```
adapter-drizzle/
  tests/contracts/
    ├── repos.contract.ts        (contract test suite)
    ├── memory-store.test.ts     (tests scheduler's adapter!)
    └── drizzle.test.ts          (tests own adapter)
```

This created dependency: `adapter-drizzle → scheduler → domain` ❌

## Decision

**Move contract tests to domain package as test utilities.**

Contract tests define the behavioral specification of port interfaces. They are part of the domain specification, not adapter implementation details. The domain package should export test utilities that adapters use to validate they correctly implement the ports.

### New Structure

```
domain/
  src/
    ├── ports/              (interface definitions)
    ├── entities/           (domain types)
    └── testing/            ← NEW
        ├── contracts.ts    (testJobsRepoContract, testRunsRepoContract)
        └── index.ts

scheduler/
  src/adapters/memory-store.ts
  tests/
    └── memory-store.test.ts   ← Moved from adapter-drizzle

adapter-drizzle/
  tests/contracts/
    └── drizzle.test.ts        ← Only tests Drizzle adapter
```

### Package Exports

Added subpath export to domain:

```json
// domain/package.json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./testing": {
      "types": "./dist/testing/index.d.ts",
      "default": "./dist/testing/index.js"
    }
  }
}
```

### Import Pattern

```typescript
// scheduler/tests/memory-store.test.ts
import { testJobsRepoContract, testRunsRepoContract } from "@cronicorn/domain/testing";
import { InMemoryJobsRepo, InMemoryRunsRepo } from "../src/adapters/memory-store.js";

// adapter-drizzle/tests/contracts/drizzle.test.ts
import { testJobsRepoContract, testRunsRepoContract } from "@cronicorn/domain/testing";
import { DrizzleJobsRepo, DrizzleRunsRepo } from "../../src/index.js";
```

### Dependency Flow (CORRECT)

```
domain → nothing (pure, exports test utilities)
scheduler → domain (imports contracts to test memory-store)
adapter-drizzle → domain (imports contracts to test Drizzle)
```

✅ No cross-adapter dependencies  
✅ Clean architectural boundaries  

## Consequences

### Positive

✅ **Architectural purity**: No adapter-to-adapter dependencies  
✅ **Single source of truth**: Contract tests defined once in domain  
✅ **Reusability**: Any future adapter can import and use the same contract tests  
✅ **Clear ownership**: Each package tests its own adapters  
✅ **Standard pattern**: Following common library practice (React, Vue, Pact)  
✅ **Behavioral specification**: Contract tests are part of port definition  

### Implementation Benefits

- **26 passing tests** for `InMemoryJobsRepo` in scheduler package
- **26 skipped tests** for `DrizzleJobsRepo` (awaiting DATABASE_URL)
- Both use identical contract test suite from domain
- Future adapters (Redis, DynamoDB) can use same tests

### Design Rationale

**Why domain exports test utilities:**
- Contract tests define what it means to correctly implement a port
- They're part of the behavioral specification, not just test code
- Common pattern in many libraries (React exports `react-test-utils`, Vue has `@vue/test-utils`)
- Contract testing frameworks (Pact, Spring Cloud Contract) work this way

**Why subpath export (`/testing`):**
- Clearly separates production code from test utilities
- Allows tree-shaking (production bundles won't include test code)
- Makes test utilities explicitly opt-in
- Standard pattern in JavaScript ecosystem

**Why not separate packages:**
- Considered `@cronicorn/contract-tests` package: Unnecessary indirection
- Considered `@cronicorn/adapter-memory` package: Memory store is primarily for testing, not production
- Contract tests are conceptually part of the port specification

### Neutral

⚠️ **Domain has test dependencies**: Domain now has vitest types as devDependency  
- This is acceptable because tests are in a separate export path
- Production code doesn't depend on test utilities
- Common pattern in libraries that export test helpers

⚠️ **Memory store remains in scheduler**: Could be extracted later  
- Currently scheduler owns memory-store as its test adapter
- If other packages need it, can create `adapter-memory` package later
- For now, simpler to keep in scheduler

### If Reversed

**To move contract tests elsewhere:**
1. Create separate `@cronicorn/contract-tests` package
2. Export test suites from there
3. Update all adapter imports
4. Remove `./testing` export from domain

**To duplicate contract tests per adapter:**
- Don't do this - violates DRY principle
- Would cause test drift and inconsistency
- Major maintenance burden

**To extract memory-store to separate package:**
1. Create `@cronicorn/adapter-memory` package
2. Move `InMemoryJobsRepo` and `InMemoryRunsRepo` there
3. Update scheduler to import from new package
4. Useful if multiple packages need the memory adapter

## References

- **Related ADRs**:
  - ADR-0002: Hexagonal architecture principles
  - ADR-0003: PostgreSQL adapter with contract tests
- **Port contracts**: `packages/domain/src/ports/repos.ts`
- **Contract tests**: `packages/domain/src/testing/contracts.ts`
- **Memory store**: `packages/scheduler/src/adapters/memory-store.ts`
- **Drizzle adapter**: `packages/adapter-drizzle/src/`

## Test Results

```bash
# Before refactoring: FAILED (cross-adapter dependency)
adapter-drizzle → scheduler ❌

# After refactoring: SUCCESS
✓ domain/tests/governor.spec.ts (10 tests)
✓ scheduler/tests/memory-store.test.ts (26 tests)
✓ adapter-drizzle/tests/drizzle.test.ts (26 skipped - no DATABASE_URL)
✓ adapter-ai/tests/client.test.ts (5 tests)

Total: 41 passing, 26 skipped
```

## Files Changed

**Created:**
- `packages/domain/src/testing/contracts.ts` (moved from adapter-drizzle)
- `packages/domain/src/testing/index.ts` (export barrel)
- `packages/scheduler/tests/memory-store.test.ts` (moved from adapter-drizzle)
- `packages/adapter-drizzle/eslint.config.js` (ignore migrations)
- `packages/adapter-drizzle/.eslintignore` (migration artifacts)

**Modified:**
- `packages/domain/package.json` (added `./testing` subpath export)
- `packages/scheduler/package.json` (added vitest, changed test script)
- `packages/adapter-drizzle/tests/contracts/drizzle.test.ts` (updated imports)

**Deleted:**
- `packages/adapter-drizzle/tests/contracts/repos.contract.ts` (moved to domain)
- `packages/adapter-drizzle/tests/contracts/memory-store.test.ts` (moved to scheduler)

## Decision Criteria Met

✅ Clear architectural boundaries (no cross-adapter deps)  
✅ Reusable contract tests (DRY principle)  
✅ Each package tests its own implementations  
✅ Standard industry pattern (React, Vue, etc.)  
✅ All tests passing after refactoring  
