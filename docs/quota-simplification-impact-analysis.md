# QuotaGuard Simplification - Impact Analysis

## Proposed Change

**Current**: Reserve-commit pattern with three methods (`reserveAI()`, `commit()`, `release()`)
**Proposed**: Simple check-before-run with single method (e.g., `checkQuota()`)

User wants to:
- Remove pre-run estimates and reservations
- Just check if quota is available before running
- Accept that the "last run" might go slightly over quota
- Simplify implementation and usage

---

## Current State Assessment

### 1. **Current Implementation Status**

**Good news**: QuotaGuard is currently **not used anywhere** in production code!

**Evidence**:
- ✅ Port interface defined in `packages/domain/src/ports/services.ts`
- ✅ Fake adapter exists in `packages/scheduler/src/adapters/fake-quota.ts`
- ✅ Documentation in `docs/domain-architecture-explained.md`
- ❌ **No actual usage** in:
  - `scheduler.ts` (doesn't use quota)
  - `scenarios.ts` (doesn't instantiate or use FakeQuota)
  - `adapter-ai` (doesn't check quota)
  - `apps/test-ai` (no quota checks)

**Conclusion**: This is the **perfect time** to simplify - no breaking changes to real code!

---

## Impact Assessment by Component

### 2. **Domain Package** (`@cronicorn/domain`)

**File**: `packages/domain/src/ports/services.ts`

**Current Interface** (lines 39-52):
```typescript
export type QuotaGuard = {
    reserveAI: (
        tenantId: string,
        model: string,
        estPrompt: number,
        maxCompletion: number
    ) => Promise<
        | { kind: "ok"; reservationId: string }
        | { kind: "retry"; retryInMs: number }
        | { kind: "deny"; reason: string }
    >;
    commit: (resId: string, usedPrompt: number, usedCompletion: number) => Promise<void>;
    release: (resId: string) => Promise<void>;
};
```

**Proposed Interface**:
```typescript
export type QuotaGuard = {
    /**
     * Check if tenant has available quota for this operation.
     * 
     * Simple check before execution - may allow slight quota overrun
     * if multiple operations check simultaneously (soft limit).
     * 
     * @returns true if quota available, false if exceeded
     */
    checkAvailable: (tenantId: string) => Promise<boolean>;
    
    /**
     * Record actual usage after operation completes.
     * 
     * Call this AFTER the AI call succeeds to track consumption.
     * Implementation can use this for billing, metrics, and future quota checks.
     */
    recordUsage: (tenantId: string, model: string, promptTokens: number, completionTokens: number) => Promise<void>;
};
```

**Alternative (Even Simpler)**:
```typescript
export type QuotaGuard = {
    /** Check if tenant can proceed. Soft limit - may allow burst overrun. */
    canProceed: (tenantId: string) => Promise<boolean>;
    
    /** Record usage for billing/tracking. Fire-and-forget pattern acceptable. */
    recordUsage: (tenantId: string, tokens: number) => Promise<void>;
};
```

**Changes Required**:
- ✏️ Update type definition (20 lines → ~10 lines)
- ✏️ Update JSDoc to explain soft limit behavior
- ✏️ Remove reservation/commit/release concepts

**Impact**: ✅ **LOW** - No code currently consumes this port

---

### 3. **Scheduler Package** (`@cronicorn/scheduler`)

#### 3.1 Fake Adapter

**File**: `packages/scheduler/src/adapters/fake-quota.ts`

**Current Implementation**:
```typescript
export class FakeQuota implements QuotaGuard {
  mode: "ok" | "retry" | "deny" = "ok";
  retryInMs = 10_000;
  async reserveAI(_tenantId: string, _model: string, _estPrompt: number, _maxCompletion: number) {
    return this.mode === "ok"
      ? { kind: "ok" as const, reservationId: "r1" }
      : this.mode === "retry"
        ? { kind: "retry" as const, retryInMs: this.retryInMs }
        : { kind: "deny" as const, reason: "cap" };
  }
  async commit() { /* no-op */ }
  async release() { /* no-op */ }
}
```

**Proposed Implementation**:
```typescript
export class FakeQuota implements QuotaGuard {
  mode: "allow" | "deny" = "allow";
  
  async canProceed(_tenantId: string): Promise<boolean> {
    return this.mode === "allow";
  }
  
  async recordUsage(_tenantId: string, _tokens: number): Promise<void> {
    // no-op in test fake
  }
}
```

**Changes Required**:
- ✏️ Simplify to just `canProceed()` and `recordUsage()`
- ✏️ Remove `retry` mode (caller handles retry logic)
- ✏️ Update to 10-15 lines (from 17)

**Impact**: ✅ **LOW** - Not currently instantiated anywhere

#### 3.2 Re-exports

**File**: `packages/scheduler/src/domain/ports.ts` (line 15)
- Re-exports `QuotaGuard` from domain
- No code changes needed, just inherits new type

**File**: `packages/scheduler/src/index.ts` (line 36)
- Re-exports `QuotaGuard` publicly
- No code changes needed

**Impact**: ✅ **NONE** - Automatic via re-export

---

### 4. **AI Feature Package** (`@cronicorn/adapter-ai`)

**Current State**: No quota checks implemented

**File**: `packages/adapter-ai/src/client.ts`
- `planWithTools()` method has no quota logic
- Could add quota check in future:

```typescript
// Future usage (not implemented yet):
export function createVercelAiClient(config: VercelAiClientConfig & { quota?: QuotaGuard }): AIClient {
  return {
    async planWithTools({ input, tools, maxTokens, tenantId }) {
      // Check quota before expensive AI call
      if (config.quota && tenantId) {
        const allowed = await config.quota.canProceed(tenantId);
        if (!allowed) {
          throw new AIClientFatalError("Tenant quota exceeded");
        }
      }
      
      const result = await generateText({...});
      
      // Record actual usage after success
      if (config.quota && tenantId && result.usage) {
        await config.quota.recordUsage(
          tenantId,
          result.usage.promptTokens + result.usage.completionTokens
        );
      }
      
      return result;
    }
  };
}
```

**Changes Required**: None (not yet implemented)

**Impact**: ✅ **NONE** - Feature ready for simpler interface when added

---

### 5. **Documentation**

#### 5.1 Architecture Explanation

**File**: `docs/domain-architecture-explained.md` (lines 112-270)

**Current Content**:
- 158 lines explaining reserve-commit pattern
- Example implementation with `TokenQuotaGuard` class
- Code examples showing reservation workflow
- Comparison table

**Changes Required**:
- ✏️ Replace section with simplified explanation (~50 lines)
- ✏️ Update example to show check-record pattern
- ✏️ Document "soft limit" behavior and race condition acceptance
- ✏️ Show simpler implementation example

**Impact**: 🟡 **MEDIUM** - Documentation only, no code impact

#### 5.2 Port Documentation

**File**: `packages/domain/src/ports/services.ts` (lines 12-37)

**Current JSDoc**: 26 lines explaining reserve-commit workflow

**Changes Required**:
- ✏️ Update to ~10 lines explaining check-record pattern
- ✏️ Document soft limit and potential burst overrun

**Impact**: ✅ **LOW** - Documentation only

#### 5.3 Planning Documents

**Files**:
- `docs/domain-package-plan.md`
- `docs/domain-package-task-list.md`

**Changes Required**: ✅ **NONE** - Historical planning docs

---

## Race Condition & Burst Overrun Analysis

### Problem Scenario

With check-only pattern, **concurrent workers** could all check simultaneously:

```typescript
// Worker 1 at 10:00:00.000
const ok1 = await quota.canProceed("tenant-123"); // true, 950/1000 tokens used

// Worker 2 at 10:00:00.001 (before Worker 1 records usage)
const ok2 = await quota.canProceed("tenant-123"); // true, still 950/1000 tokens used

// Worker 1 uses 100 tokens → total = 1050/1000 (10% over)
// Worker 2 uses 100 tokens → total = 1150/1000 (15% over)
```

### Mitigation Options

**Option A: Accept It (Recommended)**
- User explicitly accepts "last run might go over a bit"
- Document as "soft limit" behavior
- Reasonable for:
  - Small burst overruns (10-20%)
  - Low-frequency operations
  - Cost-aware but not hard-capped scenarios

**Option B: Add Advisory Locking (If Needed Later)**
```typescript
export type QuotaGuard = {
    canProceed: (tenantId: string) => Promise<boolean>;
    recordUsage: (tenantId: string, tokens: number) => Promise<void>;
    
    // Optional: acquire brief lock for atomic check-and-increment
    withLock?: <T>(tenantId: string, fn: () => Promise<T>) => Promise<T>;
};
```

**Option C: Hybrid Approach**
```typescript
// Check returns remaining quota for caller to decide
export type QuotaGuard = {
    checkRemaining: (tenantId: string) => Promise<{ remaining: number; limit: number }>;
    recordUsage: (tenantId: string, tokens: number) => Promise<void>;
};

// Caller decides:
const { remaining } = await quota.checkRemaining(tenantId);
if (remaining < 100) {
  // Skip this run
}
```

### Recommendation

**Start with Option A** (accept soft limit):
- Matches user's stated requirement ("allow last run to go over a bit")
- Simplest implementation
- Easy to add locking later if needed
- Document clearly in JSDoc and architecture guide

---

## Implementation Checklist

### Phase 1: Update Port Interface
- [ ] `packages/domain/src/ports/services.ts`
  - Replace `reserveAI()`, `commit()`, `release()`
  - Add `canProceed(tenantId)` or `checkAvailable(tenantId)`
  - Add `recordUsage(tenantId, tokens)` (optional model param)
  - Update JSDoc with soft limit explanation

### Phase 2: Update Fake Adapter
- [ ] `packages/scheduler/src/adapters/fake-quota.ts`
  - Simplify to implement new interface
  - Remove retry/deny modes (just allow/deny boolean)
  - Keep configurable for testing

### Phase 3: Update Documentation
- [ ] `packages/domain/src/ports/services.ts`
  - Update JSDoc example
- [ ] `docs/domain-architecture-explained.md`
  - Replace Section 3 (QuotaGuard)
  - Add soft limit race condition explanation
  - Simplify code examples

### Phase 4: Validation
- [ ] Run `pnpm -r typecheck` (ensure no type errors)
- [ ] Run `pnpm test` (domain tests should still pass)
- [ ] Run `pnpm -F @cronicorn/scheduler sim` (unchanged behavior)
- [ ] Update any tests that mock QuotaGuard (currently none)

---

## Estimated Effort

- **Code Changes**: ~30 minutes (3 files, <50 lines total)
- **Documentation**: ~45 minutes (2 files, rewrite examples)
- **Testing/Validation**: ~15 minutes (no new tests needed)
- **Total**: ~90 minutes

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Burst overrun exceeds budget | Low | Document clearly, add monitoring |
| Breaking changes for future code | Low | No existing usage to break |
| Need to add locking later | Low | Interface allows future extension |
| User expectations misalignment | Low | Explicitly confirm "soft limit" acceptable |

---

## Recommendation

✅ **PROCEED WITH SIMPLIFICATION**

**Why:**
1. **Zero production usage** - perfect timing for breaking change
2. **User explicitly accepts soft limit** - matches stated requirement
3. **Cleaner interface** - easier to understand and implement
4. **Easier to extend later** - can add locking/advisory features if needed

**Suggested Interface** (final):
```typescript
export type QuotaGuard = {
    /**
     * Check if tenant can proceed with operation.
     * 
     * Soft limit: May allow burst overrun if multiple operations
     * check simultaneously before recording usage. Acceptable for
     * cost-aware scenarios where occasional 10-20% overrun is tolerable.
     * 
     * @returns true if quota available, false if exceeded
     */
    canProceed: (tenantId: string) => Promise<boolean>;
    
    /**
     * Record actual usage after operation completes.
     * 
     * Call after AI call succeeds to track consumption for
     * billing, metrics, and future quota checks.
     * 
     * Fire-and-forget pattern acceptable - implementation
     * may handle async without blocking caller.
     */
    recordUsage: (tenantId: string, tokens: number) => Promise<void>;
};
```

---

## Next Steps

If approved, I can:
1. Implement all code changes (~3 files)
2. Update documentation (~2 files)
3. Validate with full test suite
4. Create ADR documenting this decision

Ready to proceed? 🚀
