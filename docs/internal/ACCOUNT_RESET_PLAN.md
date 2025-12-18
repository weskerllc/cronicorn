# Account Reset Plan: Unblocking AI Token Usage

**Date:** 2025-12-18  
**Status:** Proposed  
**Context:** User on Pro plan has exceeded monthly AI token limit (1M tokens) and needs to continue debugging AI sessions.

## Problem Analysis

### Current System Architecture

The AI token quota system works as follows:

1. **Token Tracking**: Every AI analysis creates a record in `ai_analysis_sessions` table with:
   - `endpoint_id`: Which endpoint was analyzed
   - `analyzed_at`: When the analysis occurred
   - `token_usage`: Number of tokens consumed
   - Other metadata (reasoning, tool_calls, etc.)

2. **Quota Enforcement**: `DrizzleQuotaGuard` (in `packages/adapter-drizzle/src/quota-guard.ts`) enforces limits by:
   - Looking up user's tier from `user.tier` column
   - Calculating current month token usage by summing `token_usage` from all `ai_analysis_sessions` for the user's endpoints
   - Comparing against tier limits:
     - Free: 100k tokens/month
     - **Pro: 1M tokens/month** (user's current tier)
     - Enterprise: 10M tokens/month
   - Returning `false` from `canProceed()` if limit exceeded

3. **Monthly Reset**: Quota resets automatically at start of each calendar month (UTC) because the query filters by `analyzed_at >= startOfMonth`

### Why User is Blocked

- User has consumed > 1M tokens in current calendar month
- `DrizzleQuotaGuard.canProceed()` returns `false`
- AI planner cannot run analysis sessions
- User cannot debug AI behavior

## Proposed Solutions (Ranked by Simplicity & Safety)

### Option 1: Direct SQL Deletion (Recommended) ⭐

**What:** Delete AI session records for the user from the current month using SQL.

**How:**
```sql
-- Option 1a: Delete ALL sessions for user this month (clean slate)
DELETE FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = '<user_id>'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());

-- Option 1b: Delete RECENT sessions to bring under limit (partial)
DELETE FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = '<user_id>'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW())
ORDER BY analyzed_at DESC
LIMIT 500;  -- Adjust to reduce usage enough
```

**Pros:**
- ✅ Immediate effect (no code changes)
- ✅ No security vulnerabilities
- ✅ No deployment required
- ✅ Clean and surgical
- ✅ Uses existing database access (Drizzle Studio: `pnpm studio`)

**Cons:**
- ⚠️ Permanently deletes session history (debugging data lost)
- ⚠️ Requires database access
- ⚠️ Manual operation (not self-service)

**Implementation Steps:**
1. Connect to database using Drizzle Studio: `pnpm studio`
2. Navigate to `ai_analysis_sessions` table
3. Apply filter: `endpoint_id IN (SELECT id FROM job_endpoints WHERE tenant_id = 'user_id')`
4. Delete records OR use SQL query above in database client
5. Verify user can proceed: Check `/subscriptions/usage` endpoint

**Risk Level:** 🟢 Low  
**Effort:** 5 minutes  
**Reversible:** ❌ No (data permanently deleted)

---

### Option 2: Temporary Tier Upgrade

**What:** Temporarily upgrade user's tier to Enterprise (10M tokens/month) in the database.

**How:**
```sql
UPDATE "user" 
SET tier = 'enterprise' 
WHERE id = '<user_id>';
```

**Pros:**
- ✅ Immediate effect
- ✅ No code changes
- ✅ Preserves all session data
- ✅ User can continue debugging
- ✅ Reversible (downgrade back to 'pro' later)

**Cons:**
- ⚠️ User gets higher limits than they paid for (ethical concern)
- ⚠️ Could set precedent for free upgrades
- ⚠️ Need to remember to downgrade later
- ⚠️ May confuse subscription state if Stripe disagrees

**Implementation Steps:**
1. Connect to database using Drizzle Studio
2. Update user record: `tier = 'enterprise'`
3. User immediately has 10M token limit
4. Set reminder to revert after debugging session

**Revert Later:**
```sql
UPDATE "user" 
SET tier = 'pro' 
WHERE id = '<user_id>';
```

**Risk Level:** 🟡 Medium (ethical + state management concerns)  
**Effort:** 2 minutes  
**Reversible:** ✅ Yes

---

### Option 3: Manual Reset Timestamp

**What:** Update `analyzed_at` timestamps on sessions to move them to previous month, effectively "backdating" the usage.

**How:**
```sql
UPDATE ai_analysis_sessions 
SET analyzed_at = analyzed_at - INTERVAL '1 month'
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = '<user_id>'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());
```

**Pros:**
- ✅ Preserves session data
- ✅ Immediate effect
- ✅ No code changes

**Cons:**
- ❌ Corrupts historical data (sessions appear to have happened in wrong month)
- ❌ Breaks analytics and time-series charts
- ❌ Violates data integrity
- ❌ Confusing for future debugging

**Risk Level:** 🔴 High (data integrity violation)  
**Effort:** 2 minutes  
**Reversible:** ⚠️ Difficult (hard to know original timestamps)

**Recommendation:** ❌ Do NOT use this approach

---

### Option 4: Add Admin API Endpoint (Future-Proof)

**What:** Build an authenticated admin-only API endpoint to reset usage for a user.

**Example Implementation:**
```typescript
// apps/api/src/routes/admin/admin.routes.ts
POST /admin/reset-usage/:userId

// Handler logic:
async handleResetUsage(userId: string): Promise<void> {
  await this.sessionsRepo.deleteSessionsSince(userId, startOfMonth);
}
```

**Pros:**
- ✅ Self-service for admins
- ✅ Auditable (can log reset operations)
- ✅ Reusable for future cases
- ✅ Controlled access via authentication
- ✅ Clean abstraction

**Cons:**
- ⚠️ Requires code changes
- ⚠️ Needs deployment
- ⚠️ Takes time to implement (1-2 hours)
- ⚠️ Overkill for one-time fix
- ⚠️ Needs authorization logic (admin-only)

**Scope for MVP:**
1. Add `SessionsRepo.deleteSessionsSince(userId, since)` method
2. Add admin route handler
3. Add authentication check for admin user (e.g., hardcoded email or role field)
4. Add audit logging
5. Add tests
6. Deploy

**Risk Level:** 🟢 Low  
**Effort:** 2-4 hours  
**Reversible:** N/A (builds new capability)

---

### Option 5: Environment Variable Override (Development Only)

**What:** Add an environment variable to disable quota checks entirely.

**Example:**
```typescript
// In DrizzleQuotaGuard
async canProceed(tenantId: string): Promise<boolean> {
  if (process.env.DISABLE_QUOTA_CHECK === 'true') {
    return true;
  }
  // ... existing logic
}
```

**Pros:**
- ✅ Quick toggle for debugging
- ✅ No data changes

**Cons:**
- ❌ Global setting (affects ALL users)
- ❌ Security risk if left enabled
- ❌ Not tenant-specific
- ❌ Requires code change + deployment
- ❌ Easy to forget to disable

**Risk Level:** 🔴 High (security vulnerability if misused)  
**Effort:** 30 minutes  
**Reversible:** ✅ Yes (toggle back)

**Recommendation:** ❌ Do NOT use for production

---

## Recommended Approach

**Primary Recommendation: Option 1 (Direct SQL Deletion)** ⭐

**Why:**
- Zero code changes
- No security vulnerabilities
- Immediate effect
- Uses existing tooling (Drizzle Studio)
- Surgical and clean

**Trade-off:** Loses session history for the deleted period. If debugging data is critical, use Option 2 instead.

**Backup Recommendation: Option 2 (Temporary Tier Upgrade)**

If preserving session data is essential for ongoing debugging:
1. Upgrade to enterprise tier temporarily
2. Complete debugging work
3. Downgrade back to pro
4. Wait for natural monthly reset

---

## Implementation Guide (Option 1)

### Step 1: Connect to Database

```bash
cd /path/to/cronicorn
pnpm studio
```

This opens Drizzle Studio at `https://local.drizzle.studio`

### Step 2: Get User ID

Find the user's ID from the `user` table by email address.

```sql
SELECT id, email, tier FROM "user" WHERE email = 'your-email@example.com';
```

Copy the `id` value (e.g., `user_abc123`)

### Step 3: Check Current Usage

```sql
SELECT COUNT(*) as session_count, SUM(token_usage) as total_tokens
FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'user_abc123'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());
```

This shows how many sessions and tokens were used this month.

### Step 4: Delete Sessions (Option 1a - Full Reset)

```sql
DELETE FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'user_abc123'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());
```

### Step 4 Alternative: Partial Delete (Option 1b)

If you want to keep some history but just reduce below the limit:

```sql
-- Calculate how much to delete
-- Pro limit: 1M tokens
-- If current usage is 1.5M, need to delete ~500k tokens worth

-- Find recent sessions to delete
SELECT id, analyzed_at, token_usage 
FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'user_abc123'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW())
ORDER BY analyzed_at DESC
LIMIT 100;  -- Preview first

-- Then delete enough to bring under limit
DELETE FROM ai_analysis_sessions 
WHERE id IN (
  SELECT id FROM ai_analysis_sessions 
  WHERE endpoint_id IN (
    SELECT id FROM job_endpoints WHERE tenant_id = 'user_abc123'
  ) 
  AND analyzed_at >= DATE_TRUNC('month', NOW())
  ORDER BY analyzed_at DESC
  LIMIT 500  -- Adjust based on preview
);
```

### Step 5: Verify

Check usage via API or database:

```bash
curl http://localhost:3333/api/subscriptions/usage \
  -H "Cookie: <session_cookie>"
```

Or in database:
```sql
SELECT SUM(token_usage) as total_tokens
FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'user_abc123'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());
```

Should now be under 1M tokens.

---

## Alternative Implementation Guide (Option 2)

### Step 1: Connect to Database

```bash
pnpm studio
```

### Step 2: Find User

```sql
SELECT id, email, tier FROM "user" WHERE email = 'your-email@example.com';
```

### Step 3: Upgrade Tier

```sql
UPDATE "user" 
SET tier = 'enterprise' 
WHERE id = 'user_abc123';
```

### Step 4: Verify

User now has 10M token limit. Check:

```bash
curl http://localhost:3333/api/subscriptions/usage \
  -H "Cookie: <session_cookie>"
```

Should show `aiCallsLimit: 10000000`

### Step 5: Set Reminder

Add calendar reminder to downgrade back to `pro` tier after debugging is complete:

```sql
-- Run this later
UPDATE "user" 
SET tier = 'pro' 
WHERE id = 'user_abc123';
```

---

## Long-Term Recommendations

While the immediate fix is straightforward, consider these improvements for the future:

### 1. Admin Dashboard Feature

Add a `/admin/users` page with:
- User list with current usage vs limits
- "Reset Usage" button (implements Option 4)
- Audit log of reset operations

**Effort:** 4-8 hours  
**Value:** Self-service capability for future cases

### 2. Usage Alerts

Add email alerts when user reaches:
- 80% of quota (warning)
- 90% of quota (urgent)
- 100% of quota (blocked)

This prevents surprise blocks and gives time to upgrade or optimize.

**Effort:** 2-4 hours  
**Value:** Better UX, reduces support requests

### 3. Quota Bypass for Specific Users

Add a `user.bypass_quota` boolean flag:

```typescript
async canProceed(tenantId: string): Promise<boolean> {
  const user = await this.getUserById(tenantId);
  if (user.bypass_quota) {
    return true;
  }
  // ... existing quota logic
}
```

**Use case:** Internal testing accounts, VIP customers, emergency debugging

**Effort:** 1 hour  
**Value:** Flexible override without touching quotas

### 4. Session Archival

Instead of deleting sessions, archive old ones to cold storage:
- Keep recent 30 days in hot storage (fast queries)
- Move older sessions to S3/archive table
- Reduces query costs while preserving history

**Effort:** 1-2 days  
**Value:** Preserves data, improves query performance

---

## Security Considerations

### Option 1 (SQL Deletion)
- ✅ No code changes = no new vulnerabilities
- ✅ Direct database access is already secured
- ✅ Drizzle Studio requires local access or credentials

### Option 2 (Tier Upgrade)
- ✅ No code changes
- ⚠️ Could be exploited if database is compromised (but same risk exists for billing anyway)

### Option 4 (Admin API)
- ⚠️ Requires authentication/authorization
- ⚠️ Must prevent CSRF
- ⚠️ Must log all operations
- ✅ Can implement rate limiting

### Option 5 (Env Variable)
- ❌ Global bypass is dangerous
- ❌ Easy to forget to disable
- ❌ Not recommended for production

---

## Summary & Action Items

**Immediate Action (Next 10 Minutes):**
1. Run `pnpm studio` to open Drizzle Studio
2. Find user ID by email
3. Execute SQL deletion query (Option 1) OR tier upgrade (Option 2)
4. Verify via `/subscriptions/usage` endpoint
5. User is unblocked ✅

**Follow-up (Optional, Next Sprint):**
- [ ] Document this process in runbook
- [ ] Consider adding admin reset endpoint (Option 4)
- [ ] Implement usage alerts (80%/90%/100%)
- [ ] Add session archival for cost optimization

**Decision Required:**
- Choose Option 1 (delete history) vs Option 2 (preserve history)
- Both are safe, immediate, and require no code changes

---

## References

- `packages/adapter-drizzle/src/quota-guard.ts` - Quota enforcement logic
- `packages/adapter-drizzle/src/sessions-repo.ts` - Session data access
- `packages/domain/src/quota/tier-limits.ts` - Tier limits definition
- `apps/api/src/routes/subscriptions/subscriptions.handlers.ts` - Usage endpoint
