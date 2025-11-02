# Technical Documentation

Deep-dive explanations of how Cronicorn's adaptive scheduling system works. These documents explain the dual-worker architecture, scheduling logic, AI adaptation mechanics, and coordination patterns.

## Reading Order

**New to Cronicorn?** Start here:

1. **[System Architecture](./system-architecture.md)** - Big picture: dual workers, database-mediated communication, why this enables adaptation

Then explore these in any order:

2. **[How Scheduling Works](./how-scheduling-works.md)** - Scheduler loop, Governor decision logic, constraints, safety mechanisms
3. **[How AI Adaptation Works](./how-ai-adaptation-works.md)** - AI discovery, analysis, tools, hints, response body design

Once you understand the basics:

4. **[Coordinating Multiple Endpoints](./coordinating-multiple-endpoints.md)** - Practical orchestration patterns with examples you can copy
5. **[Configuration and Constraints](./configuration-and-constraints.md)** - Decision guide for setting up endpoints correctly

Finally, bookmark this for quick lookups:

6. **[Reference](./reference.md)** - Glossary, schema, defaults, tool catalog, troubleshooting

## Document Summaries

### [System Architecture](./system-architecture.md)
Mental model for the entire system: why two workers, how they communicate via database, three types of scheduling information (baseline, hints, pause), and what makes adaptation work.

### [How Scheduling Works](./how-scheduling-works.md)
Deep-dive into the Scheduler worker: tick loop, claiming, execution, Governor decision logic, candidate evaluation, constraint clamping, safety mechanisms, and source tracing.

### [How AI Adaptation Works](./how-ai-adaptation-works.md)
Deep-dive into the AI Planner worker: discovery mechanism, what data AI sees, the three action tools, hint mechanics (TTLs, override semantics), nudging, and how to structure response bodies.

### [Coordinating Multiple Endpoints](./coordinating-multiple-endpoints.md)
Practical patterns for building workflows: flash sale load management, ETL pipelines, cooldown-based actions, tiered priorities, and cross-job coordination with complete examples.

### [Configuration and Constraints](./configuration-and-constraints.md)
Decision guide for configuring endpoints: cron vs interval, min/max intervals, timeouts, response body design, pause vs constraints, and how limits interact.

### [Reference](./reference.md)
Quick lookup: glossary, job_endpoints schema, defaults, AI tool catalog, scheduling sources, constraint matrix, response body patterns, and troubleshooting.

## For MCP/AI Agents

These documents are optimized for AI consumption via the Model Context Protocol (MCP) server. Each document has:

- **Frontmatter tags** for topic-based discovery
- **Prerequisites** indicating reading order
- **Related documents** for following connections
- **Prose-based explanations** (minimal code blocks)
- **Concrete examples** showing real-world usage

Use the MCP server to query specific documents or search by tags.

## Getting Help

- **New users**: Start with System Architecture to understand the foundation
- **Configuration questions**: See Configuration and Constraints for decision guidance  
- **Debugging issues**: Check Reference for troubleshooting and quick lookups
- **Building workflows**: See Coordinating Multiple Endpoints for patterns
- **Understanding behavior**: See How Scheduling Works or How AI Adaptation Works

All documents use concise, direct language and focus on practical understanding over theoretical concepts.
