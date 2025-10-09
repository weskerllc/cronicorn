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
Reference ./.tasks/01-mvp.md task IDs that this decision affects (e.g., TASK-1.2.1)
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
- Focus on "why" and "what" - implementation lives in code</content>