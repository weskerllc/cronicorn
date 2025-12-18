# Account Reset - Decision Summary

**Date:** 2025-12-18  
**Deliverable:** Research & Plan (No Code Changes)

## Executive Summary

User on Pro plan (1M tokens/month) has exceeded AI token quota and is blocked from debugging. Two simple, safe solutions available requiring **zero code changes** and taking **less than 5 minutes** to implement.

## Recommended Solutions

### 🥇 Primary: SQL Deletion (Recommended)

**What:** Delete AI session records from current month using database studio

**Why Best:**
- ✅ No code changes or deployment
- ✅ Immediate effect (< 5 minutes)
- ✅ No security vulnerabilities
- ✅ Clean and surgical
- ✅ Uses existing tooling

**Trade-off:** Loses session history for current month

**Steps:**
1. `pnpm studio` 
2. Find user ID by email
3. Execute DELETE query on `ai_analysis_sessions` table
4. Verify usage is below limit

### 🥈 Alternative: Temporary Tier Upgrade

**What:** Change `user.tier` to `'enterprise'` temporarily

**Why Good:**
- ✅ Preserves all debugging data
- ✅ Immediate effect
- ✅ Reversible (downgrade later)

**Trade-off:** User gets higher limits than paid for (ethical consideration)

**Steps:**
1. `pnpm studio`
2. `UPDATE "user" SET tier = 'enterprise' WHERE email = '...'`
3. Debug as needed (10M token limit)
4. Downgrade back: `UPDATE "user" SET tier = 'pro' WHERE email = '...'`

## Other Options Evaluated (Not Recommended)

| Option | Risk | Why Not Recommended |
|--------|------|---------------------|
| Backdate timestamps | 🔴 High | Corrupts historical data |
| Environment override | 🔴 High | Global bypass, security risk |
| Admin API endpoint | 🟡 Medium | Overkill for one-time fix (2-4 hrs) |

## How System Works

### Token Tracking
- All AI analyses stored in `ai_analysis_sessions` table
- Each session has `token_usage` count
- Linked to endpoints via `endpoint_id`

### Quota Enforcement
- `DrizzleQuotaGuard` sums token usage per user per month
- Compares against tier limits (Free: 100k, Pro: 1M, Enterprise: 10M)
- Blocks AI operations when limit exceeded
- Auto-resets at start of each calendar month (UTC)

### Data Model
```
user (id, email, tier)
  ↓
job_endpoints (id, tenant_id)
  ↓
ai_analysis_sessions (endpoint_id, token_usage, analyzed_at)
```

## Implementation Files Referenced

- `packages/adapter-drizzle/src/quota-guard.ts` - Quota enforcement
- `packages/adapter-drizzle/src/sessions-repo.ts` - Session storage
- `packages/domain/src/quota/tier-limits.ts` - Tier limits config
- `packages/adapter-drizzle/src/schema.ts` - Database schema

## Long-Term Improvements (Future Consideration)

If this becomes a recurring need:

1. **Admin Dashboard** (4-8 hrs)
   - Self-service reset button
   - Usage monitoring per user
   - Audit logging

2. **Usage Alerts** (2-4 hrs)
   - Email at 80%, 90%, 100% of quota
   - Prevents surprise blocks

3. **Bypass Flag** (1 hr)
   - `user.bypass_quota` boolean field
   - For internal testing/VIP accounts

4. **Session Archival** (1-2 days)
   - Move old sessions to cold storage
   - Reduces query costs

## Security Analysis

### SQL Deletion (Option 1)
- ✅ No new attack surface
- ✅ Database access already secured
- ✅ Drizzle Studio requires auth

### Tier Upgrade (Option 2)
- ✅ No code changes
- ⚠️ Manual process = human error risk
- ✅ Easily reversible

### Rejected Options
- ❌ Env variable: Global bypass is dangerous
- ❌ Timestamp manipulation: Data integrity violation

## Decision Required

**Choose one:**
- [ ] **Option 1**: Delete session history (faster, cleaner)
- [ ] **Option 2**: Temporary upgrade (preserves data)

Both are:
- ✅ Safe (no security vulnerabilities)
- ✅ Fast (< 5 minutes)
- ✅ Zero code changes
- ✅ Zero deployment required

## Documentation Artifacts

1. **`ACCOUNT_RESET_PLAN.md`** - Full analysis (all options, detailed rationale)
2. **`QUICK_RESET_GUIDE.md`** - Step-by-step instructions (copy-paste ready)
3. **`RESET_DECISION_SUMMARY.md`** - This document (executive overview)

## Next Steps

**Immediate (Now):**
1. Review this summary
2. Choose Option 1 or Option 2
3. Follow `QUICK_RESET_GUIDE.md` instructions
4. Verify user is unblocked

**Follow-up (Optional):**
1. Document in team runbook
2. Consider admin dashboard feature
3. Implement usage alerts

---

**Time Investment:**
- Research & Planning: ~1 hour ✅
- Implementation: 5 minutes (using recommended solution)
- Code Changes: 0 ✅
- Security Risk: None ✅

**Ready to execute:** Yes - user can be unblocked in < 5 minutes using Drizzle Studio
