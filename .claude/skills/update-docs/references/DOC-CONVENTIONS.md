# Documentation Conventions

Formatting and structural rules for all Cronicorn documentation.

---

## File Organization

### Directory Structure

```
docs/
├── _RUNNING_TECH_DEBT.md          # Mandatory tech debt log
├── public/                         # User-facing documentation (Docusaurus)
│   ├── introduction.md
│   ├── quick-start.md
│   ├── core-concepts.md
│   ├── use-cases.md
│   ├── recipes.md
│   ├── code-examples.md
│   ├── api-reference.md
│   ├── mcp-server.md
│   ├── self-hosting.md
│   ├── automated-error-recovery.md
│   ├── troubleshooting.md
│   └── technical/                  # Deep-dive technical docs
│       ├── system-architecture.md
│       ├── how-scheduling-works.md
│       ├── how-ai-adaptation-works.md
│       ├── coordinating-multiple-endpoints.md
│       ├── configuration-and-constraints.md
│       └── reference.md
├── contributors/                   # Developer/contributor docs
│   ├── README.md
│   ├── quick-start.md
│   ├── workspace-structure.md
│   ├── quality-checks.md
│   ├── authentication.md
│   └── environment-configuration.md
└── internal/                       # Internal strategy, marketing, archive
    ├── marketing/
    ├── tasks/
    └── archive/
```

### File Naming

- **Always kebab-case**: `how-scheduling-works.md`, not `HowSchedulingWorks.md`
- **Descriptive names**: Prefer `coordinating-multiple-endpoints.md` over `coordination.md`
- **No numeric prefixes in filenames**: Use `sidebar_position` in frontmatter for ordering
- **Extension**: Always `.md` (plain Markdown, not MDX)

---

## Frontmatter

### Required for `docs/public/` Files

Every public doc must have complete frontmatter:

```yaml
---
id: core-concepts                          # Unique kebab-case identifier
title: Core Concepts                       # Display title
description: Key terminology for Cronicorn # One-line description (used in SEO/meta)
tags:                                      # Categorization tags
  - user                                   # Audience: user or assistant
  - essential                              # Importance marker
  - surge-detection                        # Topic tags
sidebar_position: 2                        # Sort order in Docusaurus sidebar
mcp:                                       # MCP Server metadata (for AI assistants)
  uri: file:///docs/core-concepts.md       # File path for MCP resource
  mimeType: text/markdown
  priority: 0.95                           # AI importance: 0.0 (low) to 1.0 (high)
  lastModified: 2026-02-06T00:00:00Z      # Last content update date
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier, kebab-case. Used as URL slug. |
| `title` | Yes | Page title displayed in sidebar and heading |
| `description` | Yes | One-line summary for SEO meta tags and MCP |
| `tags` | Yes | Array of categorization tags |
| `sidebar_position` | Yes | Numeric sort order in sidebar |
| `mcp.uri` | Yes | File path for MCP resource serving |
| `mcp.mimeType` | Yes | Always `text/markdown` |
| `mcp.priority` | Yes | AI importance weight (0.0-1.0) |
| `mcp.lastModified` | Yes | ISO 8601 date of last content update |
| `slug` | No | Custom URL path (only used on introduction.md) |
| `sidebar_label` | No | Alternate sidebar display name |
| `displayed_sidebar` | No | Which sidebar to show |

### MCP Priority Guidelines

| Priority | When to use |
|----------|-------------|
| 0.95 | Essential docs: introduction, core-concepts, quick-start |
| 0.90 | Key references: api-reference, mcp-server |
| 0.80 | Technical deep-dives: system-architecture, scheduling |
| 0.70 | Supplementary: recipes, use-cases, code-examples |
| 0.50 | Niche or rarely-needed content |

### Tag Conventions

**Audience tags** (include at least one):
- `user` — Written for end-users of Cronicorn
- `assistant` — Written for AI assistants consuming via MCP

**Importance tags:**
- `essential` — Must-read for understanding Cronicorn

**Topic tags** (include relevant ones):
- `api`, `reference`, `technical`, `architecture`
- `surge-detection`, `baseline-schedule`, `adaptive-scheduling`
- `cross-job-coordination`, `response-body-parsing`
- `degraded-state`, `monitoring-frequency`
- `mcp`, `self-hosting`, `authentication`

### Contributor and Internal Docs

`docs/contributors/` and `docs/internal/` files do **not** require the full frontmatter. A simple H1 title is sufficient.

---

## Content Structure

### TL;DR Pattern

All `docs/public/technical/` docs start with a bold TL;DR after the H1:

```markdown
# System Architecture

**TL;DR:** Cronicorn uses two independent workers (Scheduler and AI Planner)
that communicate only through a shared database.

---

## The Big Picture
```

### Heading Hierarchy

- **H1** (`#`) — Page title only (one per file, matches frontmatter `title`)
- **H2** (`##`) — Major sections
- **H3** (`###`) — Subsections
- **H4** (`####`) — Rarely used, for deeply nested content

Never skip heading levels (e.g., don't go from H2 to H4).

### Section Ordering (Public Docs)

Typical order for feature docs:
1. TL;DR (for technical docs)
2. Overview / What is this?
3. How it works
4. Configuration / Options
5. Examples
6. Related links

### Horizontal Rules

Use `---` to separate the TL;DR from the main content. Do not overuse horizontal rules elsewhere.

---

## Code Examples

### Fenced Code Blocks

Always specify the language:

```markdown
```bash
curl -H "x-api-key: cron_abc123..." https://cronicorn.com/api/jobs
```​

```typescript
const response = await fetch('/api/jobs', {
  headers: { 'x-api-key': apiKey },
});
```​

```json
{
  "id": "job_123",
  "name": "Health Check",
  "status": "active"
}
```​
```

### Code Block Languages

Use these identifiers:
- `bash` — Shell commands
- `typescript` — TypeScript code
- `json` — JSON payloads and responses
- `yaml` — Configuration (rarely used)
- `sql` — Database queries (rarely used)

### Command Examples

Show commands the user would actually run:

```markdown
```bash
# Create a job via API
curl -X POST https://cronicorn.com/api/jobs \
  -H "x-api-key: cron_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Health Check"}'
```​
```

---

## Links

### Internal Links

Use relative paths from the current file:

```markdown
<!-- From docs/public/quick-start.md -->
See [Core Concepts](./core-concepts.md) for terminology.
See [System Architecture](./technical/system-architecture.md) for details.

<!-- From docs/public/technical/how-scheduling-works.md -->
See [Core Concepts](../core-concepts.md) for terminology.
```

### External Links

Use full URLs with descriptive text:

```markdown
See the [cron expression syntax](https://crontab.guru/) for help.
```

### Cross-Audience Links

Avoid linking from `docs/public/` to `docs/contributors/` or `docs/internal/`. These audiences are separate.

---

## Tables

Use Markdown tables for structured data:

```markdown
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | — | Job display name |
| `status` | enum | `active` | One of: active, paused, archived |
| `schedule` | string | — | Cron expression (e.g., `*/5 * * * *`) |
```

- Left-align all columns (default)
- Use `—` for "no default" or "required"
- Keep descriptions concise

---

## Writing Style

### Voice

- **Public docs**: Second person ("you"), instructional tone
- **Technical docs**: Third person for system descriptions, second person for user actions
- **Contributor docs**: Direct and pragmatic, assume developer audience

### Clarity

- Lead with the most important information
- One idea per paragraph
- Use lists for 3+ related items
- Prefer concrete examples over abstract descriptions
- Define new terms when first introduced

### Terminology

Use consistent terminology throughout:

| Term | Usage |
|------|-------|
| Job | A container for related endpoints |
| Endpoint | An HTTP request with a schedule |
| Scheduler | The worker that executes endpoints |
| AI Planner | The worker that analyzes and suggests |
| Hint | A temporary AI scheduling suggestion |
| Governor | The component that calculates next run times |
| Baseline schedule | The user-defined cron expression |
| Surge detection | AI identifying increased activity patterns |

If introducing new terminology, add it to `docs/public/core-concepts.md`.

---

## ADR Conventions

ADRs live in `.adr/` with numbered prefixes:

- Format: `NNNN-meaningful-name.md` (e.g., `0064-new-feature.md`)
- Check the highest existing number before creating a new one
- Follow the template in `.claude/rules/20-adr-process.md`
- Always include a `## References` section with task IDs

---

## Tech Debt Logging

Any TODO, shortcut, or uncertainty MUST be logged in `docs/_RUNNING_TECH_DEBT.md`:

```markdown
## Feature: <Feature Name> (Implementation Date: YYYY-MM-DD)

### Remaining Work
- [ ] Task description

### Technical Debt
- Description of shortcut or suboptimal implementation

### Uncertainties
- Open question about requirements or design
```

See `.claude/rules/21-tech-debt-logging.md` for full requirements.

---

## Commit Messages for Docs

Use conventional commit format:

```
docs(public): add surge detection guide
docs(api): update authentication examples
docs(contributors): add environment setup guide
docs(adr): record decision on hint expiration policy
docs(tech-debt): log missing validation in job creation
```

Scopes: `public`, `technical`, `api`, `contributors`, `adr`, `tech-debt`, `mcp`
