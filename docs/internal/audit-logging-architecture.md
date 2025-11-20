# Audit Logging Architecture (Recommended)

> Visual guide to the recommended trigger-based audit system

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  (TypeScript/Node.js with Drizzle ORM)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Standard CRUD Operations
                 │ (No audit-specific code)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Public Schema (Application Tables)                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │  jobs    │  │endpoints │  │  users   │  ...      │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘           │  │
│  │       │             │             │                   │  │
│  │       │ INSERT      │ UPDATE      │ DELETE           │  │
│  │       ▼             ▼             ▼                   │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │      PostgreSQL Trigger              │            │  │
│  │  │  audit.insert_update_delete_trigger()│            │  │
│  │  └───────────────┬──────────────────────┘            │  │
│  └──────────────────┼───────────────────────────────────┘  │
│                     │ Automatic                             │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Audit Schema (Immutable Audit Trail)                │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │  audit.record_version                │            │  │
│  │  │  ┌────────────────────────────────┐  │            │  │
│  │  │  │ id, record_id, op, ts          │  │            │  │
│  │  │  │ table_name                      │  │            │  │
│  │  │  │ record (JSONB - new state)     │  │            │  │
│  │  │  │ old_record (JSONB - old state) │  │            │  │
│  │  │  └────────────────────────────────┘  │            │  │
│  │  └──────────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ Query Audit History
                     │ (via Drizzle ORM)
┌────────────────────┴─────────────────────────────────────────┐
│         Audit Query Layer (TypeScript)                        │
│  - getEndpointHistory(id)                                    │
│  - getRecentChanges(userId, since)                           │
│  - getStateAtTime(id, timestamp)                             │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Scenario: User Updates Endpoint URL

```
1. Application Code (TypeScript)
   ────────────────────────────────────────
   await db.update(jobEndpoints)
     .set({ url: 'https://new.com/api' })
     .where(eq(jobEndpoints.id, 'ep_123'));
   
   ↓

2. PostgreSQL Processes UPDATE
   ────────────────────────────────────────
   Table: job_endpoints
   Row:   ep_123
   OLD:   { url: 'https://old.com/api', ... }
   NEW:   { url: 'https://new.com/api', ... }
   
   ↓

3. Trigger Fires AUTOMATICALLY
   ────────────────────────────────────────
   Function: audit.insert_update_delete_trigger()
   
   Captures:
   - Operation: "UPDATE"
   - Timestamp: 2024-11-20T10:30:00Z
   - Table: "job_endpoints"
   - Old Record: { url: 'https://old.com/api', ... }
   - New Record: { url: 'https://new.com/api', ... }
   
   ↓

4. Insert into Audit Table
   ────────────────────────────────────────
   audit.record_version:
   {
     id: 42,
     record_id: "uuid-based-on-pk",
     old_record_id: "same-uuid",
     op: "UPDATE",
     ts: "2024-11-20T10:30:00Z",
     table_name: "job_endpoints",
     record: { url: 'https://new.com/api', ... },
     old_record: { url: 'https://old.com/api', ... }
   }
   
   ↓

5. Query History (Later)
   ────────────────────────────────────────
   const history = await db
     .select()
     .from(auditSchema.recordVersion)
     .where(eq(recordVersion.recordId, endpointId));
   
   // Results: Full timeline of all changes
   [
     { op: "UPDATE", ts: "2024-11-20T10:30:00Z", ... },
     { op: "UPDATE", ts: "2024-11-15T09:15:00Z", ... },
     { op: "INSERT", ts: "2024-11-01T08:00:00Z", ... }
   ]
```

## Database Schema Detail

### Audit Table Structure

```sql
CREATE SCHEMA audit;

CREATE TABLE audit.record_version (
  -- Identity
  id SERIAL PRIMARY KEY,
  record_id TEXT,        -- UUID v5 hash of [table_oid, pk1, pk2, ...]
  old_record_id TEXT,    -- Same as record_id for UPDATE/DELETE
  
  -- Metadata
  op TEXT,               -- INSERT | UPDATE | DELETE | TRUNCATE
  ts TIMESTAMP NOT NULL DEFAULT NOW(),
  table_oid INTEGER,     -- PostgreSQL internal table ID
  table_schema TEXT,     -- e.g., "public"
  table_name TEXT,       -- e.g., "job_endpoints"
  
  -- State
  record JSONB,          -- New/current state (for INSERT/UPDATE)
  old_record JSONB       -- Previous state (for UPDATE/DELETE)
);

-- Indexes for fast queries
CREATE INDEX record_version_ts ON audit.record_version USING brin(ts);
CREATE INDEX record_version_table_oid ON audit.record_version USING btree(table_oid);
CREATE INDEX record_version_record_id ON audit.record_version (record_id);
```

### TypeScript Schema (Drizzle)

```typescript
import { pgSchema, serial, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const auditSchema = pgSchema("audit");

export const recordVersion = auditSchema.table("record_version", {
  id: serial("id").primaryKey(),
  recordId: text("record_id"),
  oldRecordId: text("old_record_id"),
  op: text("op", { enum: ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] }),
  ts: timestamp("ts").defaultNow().notNull(),
  tableOid: integer("table_oid").notNull(),
  tableSchema: text("table_schema").notNull(),
  tableName: text("table_name").notNull(),
  record: jsonb("record"),
  oldRecord: jsonb("old_record"),
});

// Zod schemas for type safety
export const RecordVersion = z.object({
  id: z.number(),
  recordId: z.string().nullable(),
  oldRecordId: z.string().nullable(),
  op: z.enum(["INSERT", "UPDATE", "DELETE", "TRUNCATE"]),
  ts: z.date(),
  tableOid: z.number(),
  tableSchema: z.string(),
  tableName: z.string(),
  record: z.record(z.any()).nullable(),
  oldRecord: z.record(z.any()).nullable(),
});

export type RecordVersion = z.infer<typeof RecordVersion>;
```

## Trigger Implementation

### Generic Trigger Function (One Time Setup)

```sql
CREATE OR REPLACE FUNCTION audit.insert_update_delete_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  pkey_cols text[] = audit.primary_key_columns(TG_RELID);
  record_jsonb jsonb = to_jsonb(NEW);
  record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, record_jsonb);
  old_record_jsonb jsonb = to_jsonb(OLD);
  old_record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, old_record_jsonb);
BEGIN
  INSERT INTO audit.record_version(
    record_id, old_record_id, op, table_oid, 
    table_schema, table_name, record, old_record
  )
  VALUES (
    record_id, old_record_id, TG_OP, TG_RELID,
    TG_TABLE_SCHEMA, TG_TABLE_NAME, 
    record_jsonb, old_record_jsonb
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### Enable Tracking Function

```sql
CREATE OR REPLACE FUNCTION audit.enable_tracking(table_name regclass)
RETURNS VOID
VOLATILE
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check table has primary key
  IF audit.primary_key_columns(table_name) = ARRAY[]::text[] THEN
    RAISE EXCEPTION 'Table % cannot be audited (no primary key)', table_name;
  END IF;
  
  -- Create trigger if not exists
  IF NOT EXISTS(
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = table_name AND tgname = 'audit_i_u_d'
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER audit_i_u_d
       BEFORE INSERT OR UPDATE OR DELETE
       ON %I
       FOR EACH ROW
       EXECUTE PROCEDURE audit.insert_update_delete_trigger()',
      table_name
    );
  END IF;
END;
$$;
```

### Per-Table Enablement

```sql
-- Enable audit tracking on critical tables
SELECT audit.enable_tracking('public.jobs'::regclass);
SELECT audit.enable_tracking('public.job_endpoints'::regclass);
SELECT audit.enable_tracking('public.user'::regclass);
SELECT audit.enable_tracking('public.apikey'::regclass);
```

## Application Integration

### Repository Layer

```typescript
// packages/adapter-drizzle/src/audit-repo.ts
import { db } from './db';
import { auditSchema, RecordVersion } from './schema';
import { eq, and, desc, gte } from 'drizzle-orm';

export class AuditRepo {
  /**
   * Get full history of a specific record
   */
  async getRecordHistory(tableName: string, recordId: string): Promise<RecordVersion[]> {
    return db
      .select()
      .from(auditSchema.recordVersion)
      .where(
        and(
          eq(auditSchema.recordVersion.tableName, tableName),
          eq(auditSchema.recordVersion.recordId, recordId)
        )
      )
      .orderBy(desc(auditSchema.recordVersion.ts));
  }
  
  /**
   * Get recent changes across all tables
   */
  async getRecentChanges(since: Date, tableName?: string): Promise<RecordVersion[]> {
    const conditions = [gte(auditSchema.recordVersion.ts, since)];
    if (tableName) {
      conditions.push(eq(auditSchema.recordVersion.tableName, tableName));
    }
    
    return db
      .select()
      .from(auditSchema.recordVersion)
      .where(and(...conditions))
      .orderBy(desc(auditSchema.recordVersion.ts))
      .limit(100);
  }
  
  /**
   * Get what changed between two versions
   */
  async getChangedFields(changeId: number): Promise<Record<string, { old: any; new: any }>> {
    const change = await db
      .select()
      .from(auditSchema.recordVersion)
      .where(eq(auditSchema.recordVersion.id, changeId))
      .limit(1);
    
    if (!change[0] || change[0].op !== 'UPDATE') {
      return {};
    }
    
    const oldRecord = change[0].oldRecord as Record<string, any>;
    const newRecord = change[0].record as Record<string, any>;
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Find changed fields
    for (const key in newRecord) {
      if (oldRecord[key] !== newRecord[key]) {
        changes[key] = {
          old: oldRecord[key],
          new: newRecord[key],
        };
      }
    }
    
    return changes;
  }
}
```

### API Endpoint Example

```typescript
// apps/api/src/routes/audit.ts
import { Hono } from 'hono';
import { AuditRepo } from '@cronicorn/adapter-drizzle';

const app = new Hono();

app.get('/endpoints/:id/history', async (c) => {
  const endpointId = c.req.param('id');
  const auditRepo = new AuditRepo(c.get('db'));
  
  const history = await auditRepo.getRecordHistory('job_endpoints', endpointId);
  
  return c.json({
    endpointId,
    history: history.map(h => ({
      timestamp: h.ts,
      operation: h.op,
      changes: h.op === 'UPDATE' 
        ? computeChanges(h.oldRecord, h.record)
        : undefined,
      snapshot: h.record,
    })),
  });
});
```

## Security & Compliance

### Access Control

```sql
-- App user: Read-only access to audit logs
GRANT SELECT ON audit.record_version TO app_user;
REVOKE INSERT, UPDATE, DELETE ON audit.record_version FROM app_user;

-- Admin user: Can manage audit schema
GRANT ALL ON SCHEMA audit TO audit_admin;
```

### Data Retention

```sql
-- Archive old audit records (e.g., > 1 year)
CREATE TABLE audit.record_version_archive (LIKE audit.record_version);

-- Move to archive
INSERT INTO audit.record_version_archive
SELECT * FROM audit.record_version
WHERE ts < NOW() - INTERVAL '1 year';

DELETE FROM audit.record_version
WHERE ts < NOW() - INTERVAL '1 year';
```

### Privacy Considerations

- Mask sensitive fields before storing (e.g., passwords, tokens)
- Consider encrypting JSONB columns
- Implement field-level access control for sensitive data
- Document what data is logged and retention policies

## Performance Considerations

### Write Performance
- Trigger overhead: ~5-10% per write operation
- Mitigated by: Async replication, connection pooling
- Not significant for our current scale

### Storage Growth
- JSONB compressed by PostgreSQL
- Estimate: ~2-5x row size for audit records
- Mitigation: Retention policies, archiving, partitioning

### Query Performance
- Indexed on: timestamp (BRIN), record_id (btree), table_oid (btree)
- Fast lookups by ID or recent time ranges
- BRIN index very efficient for time-series data

## Monitoring & Observability

### Key Metrics to Track
- Audit table size growth rate
- Write latency impact
- Query performance on audit history
- Trigger error rate (should be 0)

### Alerts
- Unexpected audit table growth
- Missing audit records (data integrity)
- Trigger failures

## References

- Full Research: `.adr/0050-audit-logging-and-change-history-research.md`
- Quick Reference: `docs/internal/audit-logging-quick-reference.md`
- Supabase Audit Pattern: https://supabase.com/blog/postgres-audit
- PGHIST: https://pghist.org/
- Example Implementation: https://github.com/grmkris/drizzle-pg-notify-audit-table
