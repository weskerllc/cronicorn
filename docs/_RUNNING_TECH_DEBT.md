# Running Tech Debt Log

This document tracks technical debt, TODOs, and uncertainties about code paths as they are discovered during development.

## Purpose
Per repository instructions: In any situation where we identify technical debt, or a TODO, or any uncertainty about the path forward, or where/how code will be used, we MUST log it here.

## Current Items

### 2025-11-20: Audit Logging Implementation Pending
**Status**: Research Complete - Implementation Needed  
**Related**: `.adr/0050-audit-logging-and-change-history-research.md`

**What**: Need to implement comprehensive audit logging / change history for database tables.

**Research Complete**:
- ✅ Investigated PostgreSQL native solutions (pgAudit, triggers, PGHIST)
- ✅ Investigated Drizzle ORM specific patterns
- ✅ Reviewed industry standards and best practices
- ✅ Analyzed open source tools and libraries
- ✅ Created comprehensive ADR with recommendations

**Recommended Approach**: 
Trigger-based audit with Drizzle ORM integration (see ADR 0050 for full details)

**Next Steps**:
1. Decision: Confirm implementation approach with team
2. Create implementation ADR once approach is approved
3. Design audit schema and trigger functions
4. Implement on priority tables: `jobs`, `job_endpoints`, `user`, `apikey`
5. Create TypeScript repository layer for querying audit history
6. Add to API endpoints (optional: expose audit trail to users)

**Priority Tables**:
- High: `jobs`, `job_endpoints`, `user`, `apikey`
- Medium: `ai_analysis_sessions`, `session`
- Low: `account`, other supporting tables

**Storage/Performance Considerations**:
- Monitor JSONB storage growth
- Implement retention policies (e.g., 1 year)
- Consider partitioning for large datasets
- Performance testing on trigger overhead

**Uncertainty**:
- Should audit history be exposed to end users via UI/API?
- What retention policy aligns with compliance requirements?
- Do we need real-time notifications (NOTIFY/LISTEN)?
- Which specific fields should be masked/anonymized?

---

## Template for New Entries

```markdown
### YYYY-MM-DD: [Brief Description]
**Status**: [Open/In Progress/Blocked/Research Needed]  
**Related**: [File paths, ADR numbers, issue links]

**What**: [Description of the tech debt or uncertainty]

**Why It Matters**: [Impact if not addressed]

**Options Considered**: [If any]

**Recommended Action**: [If clear]

**Uncertainty**: [Specific questions that need answers]

**Next Steps**: [What needs to happen next]

---
```
