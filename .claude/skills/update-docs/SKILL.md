---
name: update-docs
description: >
  This skill should be used when the user asks to "update documentation for my changes",
  "check docs for this PR", "what docs need updating", "sync docs with code",
  "scaffold docs for this feature", "document this feature", "review docs completeness",
  "add docs for this change", "what documentation is affected", "docs impact",
  or mentions "docs/public", "docs/contributors", "docs/internal", ".adr/",
  "documentation update", "API reference", "MCP docs", "tech debt doc".
  Provides guided workflow for updating Cronicorn documentation based on code changes.
---

# Update Documentation Skill

Guided workflow for keeping Cronicorn documentation in sync with code changes. Covers public user docs, contributor docs, ADRs, and tech debt logging.

## Quick Start

1. **Analyze** — Identify which files changed (`git diff`)
2. **Map** — Use CODE-TO-DOCS-MAPPING to find affected docs
3. **Review** — Read existing docs to understand current state
4. **Update** — Propose changes and wait for user confirmation
5. **Validate** — Run `pnpm lint` and verify frontmatter
6. **Commit** — Use conventional commit format (`docs(scope): ...`)

---

## Workflow A: Analyze Code Changes

### Step 1: Identify Changed Files

```bash
# Compare against main branch
git diff main...HEAD --stat

# Or compare against a specific base
git diff origin/main...HEAD --stat
```

### Step 2: Map Changes to Documentation

Use the **CODE-TO-DOCS-MAPPING** reference (`.claude/skills/update-docs/references/CODE-TO-DOCS-MAPPING.md`) to identify which documentation files are affected.

**Key mapping rules:**
- Domain logic changes (`packages/domain/`) → `docs/public/technical/` + `docs/public/core-concepts.md`
- API route changes (`apps/api/src/routes/`) → `docs/public/api-reference.md`
- Scheduler changes (`packages/worker-scheduler/`) → `docs/public/technical/how-scheduling-works.md`
- AI planner changes (`packages/worker-ai-planner/`) → `docs/public/technical/how-ai-adaptation-works.md`
- MCP server changes (`apps/mcp-server/`) → `docs/public/mcp-server.md`
- Database schema changes (`packages/adapter-drizzle/src/schema/`) → `docs/contributors/workspace-structure.md` + relevant public docs
- New packages or apps → `docs/contributors/workspace-structure.md`

### Step 3: Check for Documentation Gaps

After mapping, ask:
- Are there new features without user-facing documentation?
- Are there new API endpoints missing from the API reference?
- Are there architectural changes that need an ADR?
- Is there tech debt that needs logging in `docs/_RUNNING_TECH_DEBT.md`?

---

## Workflow B: Update Existing Documentation

### Step 1: Read the Target Doc

Read the full file to understand:
- **Frontmatter** — id, title, description, tags, sidebar_position, mcp metadata
- **Structure** — Headings, sections, examples
- **Audience** — User-facing (`docs/public/`), contributor (`docs/contributors/`), or internal (`docs/internal/`)
- **Related docs** — Links to other pages that might also need updating

### Step 2: Identify What Needs Changing

Common change types:
- **New feature** — Add section describing the feature with examples
- **Changed behavior** — Update existing section, mark old behavior if relevant
- **New configuration** — Add to configuration docs and/or API reference
- **Deprecation** — Mark as deprecated with migration guidance
- **New API endpoint** — Add to `docs/public/api-reference.md`
- **Bug fix** — Update troubleshooting if the bug was documented there

### Step 3: Propose Changes

**IMPORTANT:** Show the user what you plan to change and wait for confirmation before editing.

Present:
1. Which files will be modified
2. Summary of changes per file
3. Any new files that need to be created

### Step 4: Apply Changes

Follow the conventions in **DOC-CONVENTIONS** reference (`.claude/skills/update-docs/references/DOC-CONVENTIONS.md`):
- Preserve existing frontmatter structure
- Update `lastModified` date in MCP metadata
- Maintain consistent heading hierarchy
- Include code examples where appropriate
- Keep the TL;DR pattern at the top of technical docs

### Step 5: Validate

```bash
# Check for lint errors
pnpm lint

# Build docs to verify (if docs app is available)
pnpm --filter @cronicorn/docs build
```

---

## Workflow C: Scaffold New Documentation

### Step 1: Determine Doc Type and Location

| Doc type | Location | Template |
|----------|----------|----------|
| User-facing feature | `docs/public/` | Public Doc Template |
| Technical deep-dive | `docs/public/technical/` | Technical Doc Template |
| API reference section | `docs/public/api-reference.md` | (append to existing) |
| Contributor guide | `docs/contributors/` | Contributor Doc Template |
| Architecture decision | `.adr/` | ADR Template |
| Tech debt item | `docs/_RUNNING_TECH_DEBT.md` | (append to existing) |

### Step 2: Use the Appropriate Template

#### Public Doc Template

```markdown
---
id: <kebab-case-id>
title: <Title>
description: <One-line description>
tags:
  - user
  - <topic-tag>
sidebar_position: <number>
mcp:
  uri: file:///docs/<filename>.md
  mimeType: text/markdown
  priority: <0.0-1.0>
  lastModified: <YYYY-MM-DDT00:00:00Z>
---

# <Title>

**TL;DR:** <One-paragraph summary of the feature/concept.>

---

## Overview

<What is this feature and why does it exist?>

## How It Works

<Step-by-step explanation with code examples>

## Configuration

<Available options with defaults>

## Examples

<Real-world usage examples>

## Related

- [Core Concepts](./core-concepts.md)
- [API Reference](./api-reference.md)
```

#### Technical Doc Template

```markdown
---
id: <kebab-case-id>
title: <Title>
description: <Technical description>
tags: [assistant, technical, <topic>]
sidebar_position: <number>
mcp:
  uri: file:///docs/technical/<filename>.md
  mimeType: text/markdown
  priority: <0.0-1.0>
  lastModified: <YYYY-MM-DDT00:00:00Z>
---

# <Title>

**TL;DR:** <Technical summary in 1-2 sentences.>

---

## The Big Picture

<High-level explanation>

## How It Works

<Detailed technical explanation>

## Implementation Details

<Code-level details with examples>

## Trade-offs

<Design decisions and their consequences>
```

#### Contributor Doc Template

```markdown
# <Title>

<Brief description of what this guide covers.>

## Prerequisites

<What the reader needs before following this guide>

## Steps

<Step-by-step instructions with commands>

## Common Issues

<Troubleshooting tips>
```

#### ADR Template

```markdown
# <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Accepted

## Context

<Why did we need to make this decision?>

## Decision

<What did we decide and why?>

## Consequences

<What are the trade-offs?>

## References

<Related task IDs, other ADRs, docs>
```

### Step 3: Set Correct Metadata

- **sidebar_position**: Check existing docs in the same directory for numbering
- **MCP priority**: 0.95 for essential docs, 0.80-0.90 for reference, 0.50-0.70 for niche topics
- **tags**: Always include audience (`user` or `assistant`) plus topic tags
- **id**: Must be unique across all docs, use kebab-case

### Step 4: Cross-Reference

After creating a new doc:
1. Add links from related existing docs
2. Update `docs/public/introduction.md` if it's a major feature
3. Update `docs/contributors/workspace-structure.md` if new packages/apps are involved
4. Consider updating `docs/public/core-concepts.md` if new terminology is introduced

---

## Documentation Conventions (Quick Reference)

Full conventions: `.claude/skills/update-docs/references/DOC-CONVENTIONS.md`

- **File naming**: kebab-case (e.g., `how-scheduling-works.md`)
- **Frontmatter**: Required for all `docs/public/` files
- **TL;DR pattern**: Start technical docs with a bold TL;DR summary
- **Code examples**: Use fenced code blocks with language identifiers
- **Links**: Use relative paths (e.g., `./core-concepts.md`, `./technical/reference.md`)
- **Headings**: H1 for page title, H2 for major sections, H3+ for subsections
- **Tables**: Use for configuration options, API endpoints, comparison matrices

---

## Validation Checklist

Before committing documentation changes:

- [ ] Frontmatter is complete and valid (all `docs/public/` files)
- [ ] `lastModified` date updated in MCP metadata
- [ ] `id` is unique across all docs
- [ ] All internal links are valid relative paths
- [ ] Code examples are accurate and tested
- [ ] TL;DR present for technical docs
- [ ] Tags include audience indicator (`user` or `assistant`)
- [ ] No broken markdown formatting
- [ ] `pnpm lint` passes
- [ ] New terminology added to `docs/public/core-concepts.md` if applicable
- [ ] Tech debt logged in `docs/_RUNNING_TECH_DEBT.md` if shortcuts were taken
- [ ] ADR created if this is an architectural decision
- [ ] Commit uses `docs(scope): description` format
