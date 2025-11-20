# Audit Logging and Change History Research

**Date:** 2025-11-20  
**Status:** Research Complete

## Context

We need to implement comprehensive audit logging / change history for many database tables to provide a full audit trail of what has been changed. This is a research task to investigate:

1. Open source tools/plugins/libraries that provide this functionality
2. Industry standards and common patterns for audit trails
3. Integration options with our existing PostgreSQL + Drizzle ORM setup

## Research Findings

### 1. Industry Standards and Best Practices (2024)

#### Core Principles
- **Comprehensive Logging**: Capture who did what, when, and with what outcome
- **Log Integrity**: Use immutable storage, encryption, digital signatures to prevent tampering
- **Centralized Management**: Aggregate logs across systems for correlation and analysis
- **Compliance Alignment**: Meet GDPR, PCI DSS, HIPAA, SOC 2, ISO 27001 requirements
- **Privacy First**: Avoid logging sensitive personal data unless necessary; mask/anonymize where possible
- **Retention Policies**: Balance regulatory requirements with privacy obligations
- **Real-time Monitoring**: Automated alerting for suspicious activities and compliance violations
- **Regular Review**: Continuous audit log analysis for threat detection

#### Popular Patterns
- **Immutable Audit Logs**: Prevents alteration/deletion for forensic analysis
- **Change Data Capture (CDC)**: Tracks inserts, updates, deletes efficiently
- **Differential Logging**: Logs only the differences to reduce storage
- **Event Sourcing**: Stores all state changes as events for reconstructing history
- **Temporal Tables**: Query data "as of" any point in time

### 2. PostgreSQL Native Solutions

#### A. pgAudit Extension
**Description**: Official PostgreSQL extension for audit logging

**Pros**:
- Certified and officially supported
- Detailed session and object audit logging
- Works with cloud providers (AWS RDS, Timescale)
- Comprehensive DDL, DML, SELECT statement logging
- Ideal for compliance (GDPR, HIPAA, ISO, finance)

**Cons**:
- Logs to PostgreSQL log files, not database tables
- Requires parsing logs for querying and analysis
- Needs `shared_preload_libraries='pgaudit'` configuration
- Less convenient for application-level queries

**Use Cases**:
- Statement-level auditing
- Compliance requirements
- Security monitoring
- DBA activity tracking

#### B. Database Triggers + Audit Tables
**Description**: Custom trigger-based row-level change tracking

**Pros**:
- Direct SQL querying of audit history
- Full control over what's tracked and how
- Row and field-level granularity
- No external dependencies
- Perfect for application-level audit requirements

**Cons**:
- Must implement per table
- Performance impact on writes
- Manual maintenance and updates
- Schema evolution requires trigger updates

**Use Cases**:
- Application audit trails
- Data change history
- Row-level tracking
- User action attribution

#### C. PGHIST
**Description**: Open-source project for automatic table change tracking

**Features**:
- Automatic history tables and triggers
- Stores who, what, when, SQL query
- "As of timestamp" queries
- Field-level change tracking
- Point-in-time table reconstruction

**Pros**:
- Comprehensive temporal table support
- Advanced querying capabilities
- Automated setup

**Cons**:
- External dependency
- Additional setup complexity
- Less control than custom implementation

**GitHub**: https://pghist.org/

#### D. Logical Replication / WAL Decoding
**Description**: Advanced CDC using Write-Ahead Log

**Tools**: Debezium, wal2json, Airbyte, AWS DMS

**Pros**:
- Real-time change streaming
- No application code changes
- Centralized audit and compliance platforms
- Event-driven architecture support

**Cons**:
- Complex setup and infrastructure
- External tooling required
- Overkill for simple audit needs

### 3. Drizzle ORM Specific Solutions

#### A. Trigger-Based Audit with Drizzle
**Reference Implementation**: https://github.com/grmkris/drizzle-pg-notify-audit-table

**Approach**:
1. Create an `audit.record_version` table in a separate schema
2. Use PostgreSQL triggers to automatically populate audit records
3. Define fully typed audit schemas with Drizzle and Zod
4. Optional: Use NOTIFY/LISTEN for real-time change notifications

**Schema Example**:
```typescript
export const auditSchema = pgSchema("audit");
export const RecordVersionTable = auditSchema.table("record_version", {
  id: serial("id").primaryKey(),
  recordId: text("record_id"),
  oldRecordId: text("old_record_id"),
  op: text("op", { enum: ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] }),
  ts: timestamp("ts").defaultNow().notNull(),
  tableOid: integer("table_oid").notNull(),
  tableSchema: text("table_schema").notNull(),
  tableName: text("table_name").notNull(),
  record: jsonb("record"),       // New/current state
  oldRecord: jsonb("old_record"), // Previous state (for UPDATE/DELETE)
});
```

**Implementation Pattern**:
```sql
-- Create audit schema and table
CREATE SCHEMA IF NOT EXISTS audit;

-- Create generic trigger function
CREATE OR REPLACE FUNCTION audit.insert_update_delete_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit.record_version(
    record_id, old_record_id, op, table_oid, 
    table_schema, table_name, record, old_record
  )
  SELECT
    /* compute record_id from primary key */,
    /* compute old_record_id from old row */,
    TG_OP,
    TG_RELID,
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    to_jsonb(NEW),
    to_jsonb(OLD);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Enable tracking for specific tables
CREATE FUNCTION audit.enable_tracking(regclass)
-- Creates trigger on specified table

-- Usage
SELECT audit.enable_tracking('public.jobs'::regclass);
SELECT audit.enable_tracking('public.job_endpoints'::regclass);
```

**Pros**:
- Fully typed with TypeScript/Zod
- Works seamlessly with Drizzle ORM
- Captures all changes automatically
- Stores full before/after state as JSONB
- Query audit history directly from TypeScript
- Real-time notifications via NOTIFY/LISTEN

**Cons**:
- Requires SQL migration files for triggers
- Some performance overhead on writes
- JSONB storage can grow large
- Manual per-table enablement

#### B. Application-Level Logging
**Description**: Log changes in application code

**Pros**:
- Complete control
- Can capture business context
- No database triggers

**Cons**:
- Easy to miss logging points
- Doesn't capture direct SQL changes
- High maintenance burden
- Not foolproof

### 4. Node.js/TypeScript Audit Libraries

#### A. OpenAudit (@arcari/open-audit)
**Features**:
- General audit logging for Node.js apps
- TypeScript-friendly
- Multiple database adapters (PostgreSQL, MySQL, SQLite, MongoDB)
- Lightweight and minimal overhead

**GitHub**: https://github.com/tomaslachmann/open-audit

#### B. audit-log (npm)
**Features**:
- Express middleware for endpoint access logging
- Mongoose model plugin for CRUD logging
- Extensible transport plugins
- Custom events and messages

**Use Case**: Application-level audit logging separate from database change tracking

### 5. Comparison Matrix

| Approach | Granularity | Setup Complexity | Performance | Maintenance | Best For |
|----------|------------|------------------|-------------|-------------|----------|
| **pgAudit** | Statement/Session | Medium | Good | Low | Compliance, DBA auditing |
| **Triggers + Audit Table** | Row/Field | Medium | Moderate | Medium | Application audits, history |
| **PGHIST** | Row/Field/History | Medium | Moderate | Low | Temporal queries, versioning |
| **Drizzle + Triggers** | Row/Field | Medium | Moderate | Medium | TypeScript apps, type safety |
| **Logical Replication** | All changes | High | Good | High | Event-driven, real-time sync |
| **App-Level Logging** | Business logic | Low | Excellent | High | Contextual business events |

## Recommendations

### For Cronicorn's Use Case

Given our requirements and stack (PostgreSQL + Drizzle ORM + TypeScript + Node.js), we recommend:

#### Option 1: Trigger-Based Audit with Drizzle (RECOMMENDED)
**Why**:
- Seamlessly integrates with our existing Drizzle ORM setup
- Provides full TypeScript type safety
- Automatic and comprehensive (captures ALL changes)
- Query audit history directly from application code
- Battle-tested pattern (used by Supabase and others)
- Minimal performance overhead for our scale

**Implementation Plan**:
1. Create `audit` schema with `record_version` table
2. Implement generic trigger functions (reuse Supabase/PGHIST patterns)
3. Create helper functions: `enable_tracking()`, `disable_tracking()`
4. Enable tracking on critical tables:
   - `jobs` (job lifecycle changes)
   - `job_endpoints` (endpoint configuration changes)
   - `user` (user profile changes)
   - `apikey` (API key lifecycle)
   - Potentially `runs` (though this is already immutable history)
5. Define TypeScript schemas with Drizzle + Zod
6. Create repository methods for querying audit history
7. Optional: Add NOTIFY/LISTEN for real-time change notifications

**Storage Considerations**:
- JSONB storage efficient due to PostgreSQL compression
- Add retention policies if needed (e.g., archive after 1 year)
- Consider partitioning by timestamp for large datasets

#### Option 2: pgAudit (For Compliance Requirements)
**Why**:
- If we need detailed compliance auditing (SOC 2, etc.)
- DBA activity monitoring
- Security compliance requirements

**Implementation Plan**:
1. Install pgAudit extension
2. Configure logging policies
3. Set up log aggregation and parsing
4. Can be used alongside Option 1

#### Option 3: Hybrid Approach (PRAGMATIC)
**Why**:
- Use triggers for user-facing audit trail (jobs, endpoints, users)
- Use pgAudit for compliance and security monitoring
- Best of both worlds

### Tables Requiring Audit

Priority ranking:

**High Priority** (Phase 1):
- `jobs` - Track status changes, archive/unarchive
- `job_endpoints` - Track all configuration changes (URL, schedule, hints, pause)
- `user` - Track profile changes, tier changes, subscription status
- `apikey` - Track creation, revocation, permission changes

**Medium Priority** (Phase 2):
- `ai_analysis_sessions` - Already logged but might want change tracking
- `session` - Security auditing (login/logout events)

**Low Priority** (Phase 3):
- `account` - OAuth account linkage changes
- Other supporting tables

### Query Patterns

Example queries we'll need to support:

```typescript
// Get all changes to a specific endpoint
const endpointHistory = await db
  .select()
  .from(auditSchema.recordVersion)
  .where(
    and(
      eq(auditSchema.recordVersion.tableName, 'job_endpoints'),
      eq(auditSchema.recordVersion.recordId, endpointId)
    )
  )
  .orderBy(desc(auditSchema.recordVersion.ts));

// Get recent changes across all jobs for a user
// (requires joining with original tables or storing user context)

// Get what changed in a specific update
const change = auditHistory[0];
const oldValue = change.oldRecord?.url;
const newValue = change.record?.url;
```

### Integration with Existing Code

The audit system should be:
- **Transparent**: No changes to existing business logic
- **Automatic**: Triggers handle all tracking
- **Queryable**: Repository methods for common audit queries
- **Observable**: Optional real-time notifications for critical changes

### Security Considerations

- Audit logs should be **immutable** (triggers prevent updates/deletes)
- Role-based access to audit tables (read-only for app, admin for maintenance)
- Consider encrypting sensitive data in JSONB columns
- Regular backup of audit data
- Clear retention and deletion policies

## Next Steps

1. **Decision**: Confirm approach (recommend Option 1 or 3)
2. **Design**: Create detailed ADR for implementation
3. **Prototype**: Test trigger performance on dev database
4. **Implement**: 
   - Create audit schema and triggers
   - Add Drizzle schemas
   - Create audit repository
   - Enable on priority tables
5. **Document**: User-facing docs for accessing audit history
6. **Monitor**: Track storage growth and query performance

## References

### PostgreSQL Audit Solutions
- pgAudit: https://www.pgaudit.org/
- PostgreSQL Audit Triggers: https://wiki.postgresql.org/wiki/Audit_trigger
- PGHIST: https://pghist.org/
- Supabase Audit: https://supabase.com/blog/postgres-audit

### Drizzle Examples
- Drizzle + Audit Table: https://github.com/grmkris/drizzle-pg-notify-audit-table

### Best Practices
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Audit Logging Best Practices: https://logit.io/blog/post/audit-logging-best-practices/
- PostgreSQL CDC Guide: https://estuary.dev/blog/the-complete-change-data-capture-guide-for-postgresql/

### Node.js Libraries
- OpenAudit: https://github.com/tomaslachmann/open-audit
- audit-log: https://www.npmjs.com/package/audit-log

## Consequences

### Benefits
- **Compliance**: Meet audit requirements for SOC 2, GDPR, etc.
- **Debugging**: Understand when and why data changed
- **Security**: Detect unauthorized changes
- **Customer Trust**: Provide audit trail visibility
- **Support**: Debug customer issues with historical context

### Tradeoffs
- **Storage**: Additional database storage for audit records
- **Performance**: Slight write overhead from triggers
- **Complexity**: Additional schema and query patterns to maintain
- **Cost**: Storage and compute costs scale with data changes

### Risk Mitigation
- Start with critical tables only
- Monitor storage growth
- Implement retention policies early
- Use partitioning if needed
- Regular performance testing
