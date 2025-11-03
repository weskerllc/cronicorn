# Documentation Restructure TODO

**Goal:** Optimize technical documentation for MCP (Model Context Protocol) server consumption and improve readability by using natural language explanations instead of code blocks.

**Date:** November 2, 2025  
**Context:** MCP servers enable AI assistants to query documentation as resources. Documentation needs to be hierarchical, topic-focused, and written in explanatory prose rather than code-heavy examples.

---

## Phase 1: Convert Code Blocks to Natural Language Explanations

### Priority: HIGH
**Why:** User specifically requested explanations in words instead of code blocks. MCP servers work better with natural language that AI models can understand and reason about.

### Tasks:

- [ ] **1.1: Rewrite Governor Algorithm Section**
  - Current: TypeScript-style pseudocode with conditionals
  - Target: Step-by-step narrative explanation
  - Example: "The governor first builds three types of scheduling candidates. The baseline candidate represents the user's original schedule. If they specified a cron expression, the governor calculates the next occurrence after the current time. If they specified a fixed interval, the governor multiplies it by an exponential backoff factor..."
  - Include "why" for each decision (e.g., "AI interval overrides baseline because this enables adaptive scheduling - tightening during load, relaxing during stability")

- [ ] **1.2: Rewrite Nudging Mechanism Section**
  - Current: Code showing proposeInterval function
  - Target: Conversational explanation of the workflow
  - Example: "When AI decides to adjust scheduling frequency, it performs two database operations. First, it writes a hint record containing the new interval and an expiration time. This hint will influence scheduling decisions for the next N minutes. Second, it immediately nudges the next run time forward if the new schedule would run sooner than currently planned..."
  - Explain the "why now not lastRunAt" decision in plain terms

- [ ] **1.3: Rewrite Scheduler Flow Section**
  - Current: ASCII box diagram + lettered steps
  - Target: Flowing narrative with transition words
  - Example: "Every 5 seconds, the scheduler wakes up and asks the database for endpoints that are due to run. The database returns up to 10 endpoints that need execution. For each one, the scheduler begins by recording that a run is starting. Then it calls the endpoint's URL and waits for the response..."
  - Add a "Safety Mechanisms" subsection explaining in words what happens when execution exceeds interval

- [ ] **1.4: Rewrite AI Planner Flow Section**
  - Current: ASCII box diagram + numbered steps
  - Target: Story-like narrative
  - Example: "The AI planner operates independently from the scheduler. Every 5 minutes, it wakes up and discovers which endpoints have been active recently. It queries the database for any endpoint that ran in the last 5 minutes. For each active endpoint, the planner checks whether the tenant has quota remaining..."
  - Explain tool usage in narrative form ("The AI can call seven different tools to gather information and make scheduling adjustments...")

- [ ] **1.5: Simplify Database Schema Section**
  - Current: SQL CREATE TABLE statements
  - Target: Table summary with prose description
  - Keep schema definitions but add introductory paragraph
  - Example: "The system uses three main database tables. The endpoints table stores all scheduling state - baseline schedules, AI hints with TTLs, guardrails, and the critical next_run_at field that the scheduler uses to claim work. The runs table records execution history..."
  - Create a separate "Schema Reference" document for full SQL definitions

- [ ] **1.6: Rewrite Multi-Endpoint Coordination Example**
  - Current: Code blocks showing tier structure
  - Target: Flash sale scenario told as a story
  - Example: "Imagine a flash sale starting at 9am. The traffic_monitor endpoint begins checking visitor counts every minute. At 9:05, it detects 5,500 visitors - far above the normal 2,000. The AI analyzes this spike and proposes tightening the monitoring interval to 20 seconds. Within 30 seconds, the traffic monitor runs again and now detects page load times spiking to 3.2 seconds..."
  - Show the cascade in narrative form, not code structure

---

## Phase 2: Split Monolithic Document into Topic-Focused Resources

### Priority: HIGH
**Why:** MCP servers need to retrieve specific topics on-demand. A single 800+ line document is hard to query efficiently. AI assistants work better with focused, standalone documents.

### Proposed Structure:

```
docs/
  technical/
    overview/
      00-introduction.md              # What is the system, 2-minute overview
      01-architecture-overview.md     # Two workers, database-mediated communication
      02-core-concepts.md            # Key terms, principles, how adaptation works
      03-why-this-architecture.md    # Trade-offs, decisions, alternatives considered
    
    components/
      10-scheduler-worker.md         # Deep-dive: how scheduler claims and executes
      11-ai-planner-worker.md        # Deep-dive: how AI analyzes and suggests
      12-governor-algorithm.md       # Deep-dive: next run calculation logic
      13-hints-and-nudging.md        # Deep-dive: how AI influences scheduling
      14-failure-handling.md         # Deep-dive: backoff, retries, zombie cleanup
    
    patterns/
      20-multi-endpoint-coordination.md   # Orchestrating related endpoints (flash sale example)
      21-quota-and-cost-control.md       # Preventing runaway AI usage
      22-safety-mechanisms.md            # Long execution handling, past-candidate logic
      23-testing-strategies.md           # How to test scheduling logic deterministically
    
    reference/
      30-database-schema.md          # Full table definitions with indexes
      31-configuration-reference.md  # All tunable parameters (intervals, TTLs, limits)
      32-tool-reference.md          # AI tools catalog with parameters
      33-glossary.md                # Term definitions (baseline, hint, governor, nudge, etc.)
    
    extending/
      40-adding-new-endpoints.md     # How to create endpoints with coordination
      41-customizing-governor.md     # Extending scheduling logic
      42-integrating-ai-models.md    # Swapping Vercel AI SDK for other providers
```

### Tasks:

- [ ] **2.1: Create Overview Documents**
  - Extract Executive Summary → `00-introduction.md`
  - Extract Core Architecture section → `01-architecture-overview.md`
  - Create new `02-core-concepts.md` with key terms and principles
  - Create new `03-why-this-architecture.md` explaining design decisions

- [ ] **2.2: Create Component Deep-Dives**
  - Extract and expand Scheduler Flow → `10-scheduler-worker.md`
  - Extract and expand AI Planner Flow → `11-ai-planner-worker.md`
  - Extract and expand Governor section → `12-governor-algorithm.md`
  - Extract and expand Nudging section → `13-hints-and-nudging.md`
  - Create new `14-failure-handling.md` (backoff, zombie cleanup, recovery)

- [ ] **2.3: Create Pattern Documents**
  - Extract multi-endpoint example → `20-multi-endpoint-coordination.md`
  - Create new `21-quota-and-cost-control.md` (tenant quotas, rate limiting)
  - Create new `22-safety-mechanisms.md` (all safety checks in one place)
  - Extract Determinism section → `23-testing-strategies.md`

- [ ] **2.4: Create Reference Documents**
  - Extract schema → `30-database-schema.md`
  - Create new `31-configuration-reference.md` (all env vars, defaults, limits)
  - Create new `32-tool-reference.md` (AI tool catalog)
  - Create new `33-glossary.md` (all technical terms with definitions)

- [ ] **2.5: Create Extension Guides**
  - Create new `40-adding-new-endpoints.md` (how to use the system)
  - Create new `41-customizing-governor.md` (advanced: modify scheduling logic)
  - Create new `42-integrating-ai-models.md` (advanced: swap AI providers)

---

## Phase 3: Add MCP-Optimized Metadata and Structure

### Priority: MEDIUM
**Why:** Help MCP servers understand document relationships and retrieve relevant content efficiently.

### Tasks:

- [ ] **3.1: Add Frontmatter to Each Document**
  ```yaml
  ---
  title: "Governor Algorithm Deep-Dive"
  category: "components"
  tags: ["scheduling", "algorithm", "pure-function"]
  audience: "developers-implementing"
  prerequisites: ["architecture-overview", "core-concepts"]
  related: ["hints-and-nudging", "failure-handling"]
  last_updated: "2025-11-02"
  ---
  ```
  - Helps MCP servers understand context and relationships
  - Enables smart cross-referencing and prerequisite checking

- [ ] **3.2: Create Documentation Index**
  - Create `docs/technical/INDEX.md` with document map
  - Include learning paths (beginner → intermediate → advanced)
  - Include topic-based navigation (scheduling → AI → coordination)
  - Example:
    ```markdown
    ## Learning Paths
    
    **New to the system?** Start here:
    1. Introduction → Architecture Overview → Core Concepts
    2. Then pick a component: Scheduler or AI Planner
    
    **Want to understand scheduling logic?**
    1. Governor Algorithm → Hints and Nudging → Failure Handling
    
    **Building multi-endpoint workflows?**
    1. Multi-Endpoint Coordination → Tool Reference
    ```

- [ ] **3.3: Add "TL;DR" Sections**
  - Add to top of each document: 2-3 sentence summary
  - Example for Governor doc: "The governor is a pure function that calculates when a job should run next. It evaluates three inputs (baseline schedule, AI hints, current time) and returns a single next run time. AI interval hints override baseline to enable adaptation, while guardrails always apply."
  - Helps MCP servers quickly determine if document is relevant

- [ ] **3.4: Add "Common Questions" Sections**
  - End each document with FAQ-style questions
  - Example for Nudging doc:
    - "Why does nudging use 'now' instead of 'lastRunAt'?"
    - "What happens if I nudge while the job is already running?"
    - "Can nudging violate min/max interval constraints?"
  - Helps MCP servers provide direct answers to user questions

---

## Phase 4: Enhance Readability and Scanability

### Priority: MEDIUM
**Why:** AI models and humans both benefit from clear structure and scannable content.

### Tasks:

- [ ] **4.1: Add "How to Read This Document" Sections**
  - Include at start of complex docs (Governor, Coordination)
  - Example: "This document explains the governor algorithm. If you're looking for why AI hints override baseline, jump to 'Candidate Selection Priority.' For safety mechanisms, see 'Handling Past Candidates.' For examples, see 'Decision Flowchart.'"

- [ ] **4.2: Use Hierarchical Headings Consistently**
  - H1: Document title
  - H2: Major sections
  - H3: Subsections
  - H4: Details (use sparingly)
  - Keep heading depth ≤ 3 levels for scanability

- [ ] **4.3: Add Visual Dividers for Major Transitions**
  - Use `---` horizontal rules between major sections
  - Add "Key Takeaway" callout boxes (use markdown blockquotes with emoji)
  - Example:
    ```markdown
    > 🔑 **Key Takeaway:** AI interval hints completely override the baseline schedule. 
    > This is what enables adaptive scheduling - the system can tighten or relax 
    > monitoring frequency based on real-time conditions.
    ```

- [ ] **4.4: Replace ASCII Diagrams with Prose or Mermaid**
  - Current: ASCII box diagrams for flows
  - Option 1: Rewrite as prose (preferred for MCP)
  - Option 2: Use Mermaid flowcharts if visual is needed
  - Mermaid is more AI-friendly than ASCII art

- [ ] **4.5: Add "Real-World Example" Subsections**
  - After explaining concepts, show concrete scenarios
  - Example for Governor: "Let's follow a job through multiple scheduling decisions. The job starts with a 5-minute baseline interval and 0 failures. At T=0, it runs successfully. The governor calculates next run at T+5min (baseline). At T+3min, AI detects load increasing and proposes 30-second interval. At T+3m30s, the scheduler claims the job (now due). After execution, the governor sees the fresh AI hint and calculates next run at T+4min (30 seconds later)..."

---

## Phase 5: Add Cross-Linking and Navigation

### Priority: LOW
**Why:** Help users and MCP servers navigate related content.

### Tasks:

- [ ] **5.1: Add "See Also" Sections**
  - End each document with links to related docs
  - Example for Scheduler doc:
    ```markdown
    ## See Also
    
    - [AI Planner Worker](./11-ai-planner-worker.md) - How the other half of the system works
    - [Governor Algorithm](./12-governor-algorithm.md) - Deep-dive into next run calculation
    - [Safety Mechanisms](./22-safety-mechanisms.md) - Edge case handling
    ```

- [ ] **5.2: Add Inline Cross-References**
  - When mentioning concepts, link to their definitions
  - Example: "The scheduler re-reads endpoint state to catch any [AI hints](./13-hints-and-nudging.md#how-hints-work) written concurrently..."

- [ ] **5.3: Create "Further Reading" Breadcrumbs**
  - At document start, show where you are in the hierarchy
  - Example: `Technical Docs > Components > Governor Algorithm`

---

## Phase 6: Update MCP Server Integration

### Priority: LOW (after restructure complete)
**Why:** MCP server needs to know about the new document structure to serve resources effectively.

### Tasks:

- [ ] **6.1: Update MCP Server Resource Definitions**
  - Current: Likely serves single TECHNICAL_SYSTEM_EXPLANATION.md
  - Target: Serve all technical docs as queryable resources
  - Update resource URIs to reflect new structure

- [ ] **6.2: Add Resource Search/Discovery**
  - Implement topic-based search in MCP server
  - Example: User asks "How does the governor work?" → serve `12-governor-algorithm.md`
  - Use frontmatter tags for smart matching

- [ ] **6.3: Add Resource Summarization**
  - MCP server could provide document summaries before full content
  - Use TL;DR sections for quick previews

- [ ] **6.4: Test with Real MCP Clients**
  - Test with Claude Desktop, Cline, Continue
  - Verify docs are discoverable and useful in context
  - Gather feedback on doc structure and content

---

## Phase 7: Quality Assurance and Maintenance

### Priority: ONGOING
**Why:** Keep documentation accurate and useful over time.

### Tasks:

- [ ] **7.1: Add Documentation Tests**
  - Create scripts to verify:
    - All cross-links are valid
    - Code examples actually run (if any remain)
    - Frontmatter is consistent
    - No orphaned documents

- [ ] **7.2: Add "Last Verified" Dates**
  - Each doc shows when it was last checked against code
  - Example: "Last verified against codebase: 2025-11-02"

- [ ] **7.3: Create Documentation Review Checklist**
  - Before merging code changes, verify affected docs
  - Example: If governor.ts changes → review `12-governor-algorithm.md`

- [ ] **7.4: Set Up Documentation Versioning**
  - Tag docs with system version
  - Maintain docs for multiple versions if needed
  - Example: `docs/v1.0/`, `docs/v2.0/`

---

## Success Criteria

### Restructure Complete When:

- ✅ All code blocks converted to natural language explanations
- ✅ Single 800+ line doc split into 15-20 focused documents
- ✅ Each document has frontmatter, TL;DR, and "See Also"
- ✅ Documentation index created with learning paths
- ✅ All documents follow consistent structure (H1 title, H2 sections, H3 subsections)
- ✅ No section requires reading another document to understand basics
- ✅ Technical accuracy maintained (verified against code)

### MCP Integration Complete When:

- ✅ MCP server can serve individual documents as resources
- ✅ Topic-based search works (e.g., "governor" → correct doc)
- ✅ Tested with at least 2 MCP clients (Claude Desktop + Cline/Continue)
- ✅ User feedback confirms docs are discoverable and helpful

### Quality Bar:

- **Readability**: Non-expert can understand architecture in 15 minutes
- **Searchability**: Specific questions answered in <2 document reads
- **Maintainability**: Developer can update doc when code changes in <15 minutes
- **AI-Friendliness**: MCP server can extract relevant info without reading entire corpus

---

## Estimated Effort

- **Phase 1 (Code→Prose):** 8-12 hours
- **Phase 2 (Split Documents):** 12-16 hours
- **Phase 3 (MCP Metadata):** 4-6 hours
- **Phase 4 (Enhance Readability):** 6-8 hours
- **Phase 5 (Cross-Linking):** 3-4 hours
- **Phase 6 (MCP Integration):** 4-6 hours
- **Phase 7 (QA Setup):** 2-3 hours

**Total: 39-55 hours** (approximately 1-1.5 weeks of focused work)

---

## Implementation Strategy

### Recommended Order:

1. **Start with Phase 1 (Code→Prose)** - Get quick wins on readability
2. **Then Phase 2.1-2.2 (Core Splits)** - Create overview + component docs
3. **Then Phase 3 (Metadata)** - Add structure for MCP
4. **Then Phase 2.3-2.5 (Remaining Splits)** - Complete document breakout
5. **Then Phase 4 (Readability)** - Polish individual docs
6. **Then Phase 5 (Cross-Linking)** - Connect the ecosystem
7. **Finally Phases 6-7 (Integration + QA)** - Production-ready

### Quick Win Approach (if time-limited):

1. Convert Governor section to prose (1-2 hours) → immediate readability improvement
2. Split into 5 core docs (4-6 hours):
   - Introduction
   - Scheduler Worker
   - AI Planner Worker
   - Governor Algorithm
   - Database Schema
3. Add TL;DRs and frontmatter (2-3 hours) → MCP-ready
4. Test with MCP server (1-2 hours) → validate approach

**Quick Win Total: 8-13 hours** for 80% of the value

---

## Notes

- **Preserve technical accuracy**: Every change must be verified against actual code
- **Keep TECHNICAL_SYSTEM_EXPLANATION.md**: Rename to `_ARCHIVE_TECHNICAL_SYSTEM_EXPLANATION.md` for reference
- **Create migration guide**: Help existing doc users find new structure
- **Get user feedback early**: Share first 3-5 converted docs for feedback before completing all
