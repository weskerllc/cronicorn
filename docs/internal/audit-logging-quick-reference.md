# Audit Logging Quick Reference

> **Full Research**: See `.adr/0050-audit-logging-and-change-history-research.md`

## TL;DR - Recommended Solution

**Use trigger-based audit with Drizzle ORM** - automatic, type-safe, battle-tested.

## What We Get

```
User updates job endpoint URL
    ↓
PostgreSQL trigger fires automatically
    ↓
audit.record_version table stores:
  - old_record: { url: "https://old.com/api", ... }
  - record:     { url: "https://new.com/api", ... }
  - op: "UPDATE"
  - ts: 2024-11-20T10:30:00Z
  - who/what/when metadata
    ↓
Query from TypeScript with full type safety
```

## Implementation Pattern

### 1. Database Setup (One Time)

```sql
-- Create audit schema and table
CREATE SCHEMA audit;

CREATE TABLE audit.record_version (
  id SERIAL PRIMARY KEY,
  record_id TEXT,          -- Computed from primary key
  old_record_id TEXT,      -- For updates/deletes
  op TEXT,                 -- INSERT/UPDATE/DELETE
  ts TIMESTAMP NOT NULL,   -- When it happened
  table_name TEXT,         -- Which table
  record JSONB,            -- New state
  old_record JSONB         -- Old state (for UPDATE/DELETE)
);

-- Generic trigger function (reusable)
CREATE FUNCTION audit.insert_update_delete_trigger() ...

-- Helper to enable tracking per table
CREATE FUNCTION audit.enable_tracking(table_name) ...
```

### 2. Enable on Each Table

```sql
SELECT audit.enable_tracking('public.jobs'::regclass);
SELECT audit.enable_tracking('public.job_endpoints'::regclass);
SELECT audit.enable_tracking('public.user'::regclass);
```

### 3. TypeScript Schema (Drizzle)

```typescript
export const auditSchema = pgSchema("audit");

export const recordVersion = auditSchema.table("record_version", {
  id: serial("id").primaryKey(),
  recordId: text("record_id"),
  op: text("op", { enum: ["INSERT", "UPDATE", "DELETE"] }),
  ts: timestamp("ts").defaultNow().notNull(),
  tableName: text("table_name").notNull(),
  record: jsonb("record"),
  oldRecord: jsonb("old_record"),
});
```

### 4. Query from Code

```typescript
// Get all changes to an endpoint
const history = await db
  .select()
  .from(auditSchema.recordVersion)
  .where(
    and(
      eq(auditSchema.recordVersion.tableName, 'job_endpoints'),
      eq(auditSchema.recordVersion.recordId, endpointId)
    )
  )
  .orderBy(desc(auditSchema.recordVersion.ts));

// What changed?
const change = history[0];
console.log(`Old URL: ${change.oldRecord?.url}`);
console.log(`New URL: ${change.record?.url}`);
```

## Comparison with Other Solutions

| Solution | Setup | Pros | Cons | Verdict |
|----------|-------|------|------|---------|
| **Triggers + Audit Table** ⭐ | Medium | Type-safe, automatic, query from app | Trigger maintenance | **RECOMMENDED** |
| pgAudit | Medium | Compliance-ready, official | Logs not in DB, parsing needed | Good for compliance |
| PGHIST | Medium | Temporal queries, "as of" | External dependency | Good but more than needed |
| App-Level Logging | Easy | Full control | Easy to miss, not foolproof | ❌ Not recommended |
| Logical Replication/CDC | Hard | Real-time streaming | Complex, overkill | ❌ Too much |

## Priority Tables

### Phase 1 (Critical) 🔴
- `jobs` - Status changes, lifecycle
- `job_endpoints` - Config changes (URL, schedule, hints)
- `user` - Profile, tier, subscription changes
- `apikey` - Creation, revocation, permissions

### Phase 2 (Important) 🟡
- `ai_analysis_sessions` - Already tracked but audit for changes
- `session` - Security events

### Phase 3 (Optional) 🟢
- `account` - OAuth linkage
- Supporting tables as needed

## Storage Considerations

**JSONB is efficient** due to PostgreSQL compression, but:
- Monitor growth over time
- Implement retention policy (e.g., 1 year)
- Consider partitioning if > millions of audit records
- For our scale: not a concern initially

## Performance Impact

**Write overhead**: ~5-10% (triggers fire on every change)
**Read overhead**: None (separate table)
**Query performance**: Fast with proper indexes

For our current scale, this is negligible.

## What This Enables

✅ **Compliance**: SOC 2, GDPR audit requirements  
✅ **Debugging**: "What changed and when?"  
✅ **Security**: Detect unauthorized changes  
✅ **Support**: Historical context for customer issues  
✅ **Trust**: Show users their data history  

## Example Queries We'll Support

```typescript
// 1. Who changed this endpoint?
getEndpointHistory(endpointId);

// 2. What changed in the last hour?
getRecentChanges(userId, since: Date);

// 3. Find all pause/resume events
getOperationHistory(userId, operation: 'pause');

// 4. Reconstruct state at specific time
getStateAtTime(endpointId, timestamp: Date);
```

## Next Steps

1. ✅ **Research Complete** (this document)
2. ⏳ **Decision**: Team review and approval
3. ⏳ **Implementation ADR**: Detailed design
4. ⏳ **Prototype**: Test on dev database
5. ⏳ **Rollout**: Phase 1 tables first
6. ⏳ **API**: Expose audit trail to users (optional)

## Questions?

See full research in `.adr/0050-audit-logging-and-change-history-research.md`

Key sections:
- PostgreSQL Native Solutions (pgAudit, triggers, PGHIST)
- Drizzle-specific patterns with code examples
- Industry standards and best practices
- Detailed comparison matrix
- Implementation recommendations
- Security and compliance considerations
