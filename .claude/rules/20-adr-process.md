---
applyTo: '**'
---

# ADR Process

## What are ADRs?

Architectural Decision Records (ADRs) capture important architectural decisions and their context. They keep the "why" behind code visible for future maintainers.

## When to Create

- Any significant architectural decision
- Major technical implementation choices
- Changes to core patterns or structure

## File Structure

Store ADRs in `.adr/` folder with numbered prefixes: `0001-meaningful-name.md`

**Current Status:** This project has 63+ ADRs documenting key decisions.

**Notable ADRs:**
- **ADR-0002**: Hexagonal Architecture Principles (critical reference)
- **ADR-0009**: Transaction-per-Test Pattern
- **ADR-0018**: TanStack Start Migration

## ADR Format

```markdown
# [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Draft

## Context
Why did we need to make this decision? What problem were we solving?

## Decision
What did we decide to do? Which option did we pick and why?

## Consequences
What code was affected? What tradeoffs or side-effects should we remember?
If we later reverse this, what will we have to change?

## References
Reference task IDs that this decision affects (e.g., TASK-1.2.1)
```

## Task ID System

Every task has a unique `TASK-X.Y.Z` identifier for traceability:

- **TASK-X.0**: Main section headers
- **TASK-X.Y**: Subsection headers
- **TASK-X.Y.Z**: Individual tasks
- **TASK-X.Y.Z.W**: Sub-tasks

Include relevant task IDs in ADR References sections.

## Tone

- Concise and human-like
- Explain to your future self who forgot the details
- Focus on "why" and "what" - implementation lives in code

## Example ADR

```markdown
# Use Transaction-per-Test Pattern

**Date:** 2024-03-15
**Status:** Accepted

## Context

Integration tests were polluting the database with test data, causing flaky tests when tests ran in parallel. Manual cleanup was error-prone and slow.

## Decision

Use Vitest's `test.extend()` to provide a transactional fixture that automatically rolls back after each test. Every test gets a clean database state.

## Consequences

**Benefits:**
- Zero database pollution
- Perfect test isolation
- Fast execution (rollback is instant)
- No manual cleanup needed

**Tradeoffs:**
- Requires PostgreSQL connection pool setup
- Tests must use the `tx` fixture instead of global DB

**Files Affected:**
- `packages/adapter-drizzle/src/tests/fixtures.ts` - Transaction fixture implementation
- All integration test files - Updated to use `tx` fixture

## References
- TASK-3.2.1 - Implement transaction-per-test pattern
```

## Updating Existing ADRs

If a decision is superseded:

1. Update the original ADR status to **Superseded**
2. Link to the new ADR that replaces it
3. Create a new ADR with the new decision

## Finding ADRs

Browse the `.adr/` folder or search by keyword:

```bash
# Search ADRs by keyword
grep -r "transaction" .adr/

# List all ADRs
ls -1 .adr/
```
