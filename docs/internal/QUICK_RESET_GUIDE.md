# Quick Reset Guide - AI Token Usage

**Problem:** AI token limit exceeded (1M tokens/month on Pro plan)  
**Goal:** Unblock user to continue debugging

## Fastest Solution (5 minutes) ⚡

### Option A: Delete Session History (Recommended)

**Trade-off:** Loses session debugging data from current month

```bash
# 1. Open database studio
pnpm studio

# 2. Find your user ID
SELECT id FROM "user" WHERE email = 'your-email@example.com';

# 3. Delete sessions (replace USER_ID_HERE)
DELETE FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'USER_ID_HERE'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());

# 4. Verify (should be under 1M)
SELECT SUM(token_usage) FROM ai_analysis_sessions 
WHERE endpoint_id IN (
  SELECT id FROM job_endpoints WHERE tenant_id = 'USER_ID_HERE'
) 
AND analyzed_at >= DATE_TRUNC('month', NOW());
```

### Option B: Temporary Tier Upgrade

**Trade-off:** Keeps all data, but gives higher limits than paid for

```bash
# 1. Open database studio
pnpm studio

# 2. Upgrade to enterprise (10M tokens/month)
UPDATE "user" 
SET tier = 'enterprise' 
WHERE email = 'your-email@example.com';

# 3. Debug as needed
# (You now have 10M token limit instead of 1M)

# 4. Downgrade back when done
UPDATE "user" 
SET tier = 'pro' 
WHERE email = 'your-email@example.com';
```

## Verify Fix

Check usage in web UI:
- Navigate to `/usage` page
- Should show tokens under limit

OR via API:
```bash
curl http://localhost:3333/api/subscriptions/usage \
  -H "Cookie: <your-session-cookie>"
```

## When to Use Which

| Use Option A (Delete) | Use Option B (Upgrade) |
|----------------------|----------------------|
| ✅ Don't need old session data | ✅ Need to preserve debugging history |
| ✅ Want clean slate | ✅ Temporary debugging session |
| ✅ Permanent fix | ✅ Will downgrade later |

## Full Details

See `ACCOUNT_RESET_PLAN.md` for:
- Complete analysis of all options
- Security considerations
- Long-term improvements
- Alternative approaches

## Emergency Contact

If database access isn't working:
1. Check `.env` for `DATABASE_URL`
2. Ensure PostgreSQL is running: `pnpm db`
3. Try direct psql: `psql $DATABASE_URL`
