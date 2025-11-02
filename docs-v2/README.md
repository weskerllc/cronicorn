---
id: docs-readme
title: Cronicorn Documentation Structure
description: Overview of the Cronicorn documentation system and resource organization
tags:
  - user
  - assistant
  - essential
sidebar_position: 10
mcp:
  uri: file:///docs/README.md
  mimeType: text/markdown
  priority: 1.0
  lastModified: 2025-11-02T00:00:00Z
---

# Cronicorn Documentation

This directory (`docs-v2/` at the root of the repository) contains the **single source of truth** for Cronicorn documentation, structured to be consumed by both:
- **Human users** via the Docusaurus documentation site at `apps/docs`
- **AI assistants** via the MCP server resources API

## Why docs-v2?

This directory is named `docs-v2` to distinguish it from the existing `docs/` directory (which contains ADRs, architecture docs, and other project documentation). The `docs-v2/` directory specifically contains **user-facing** documentation that is rendered by Docusaurus and exposed via the MCP server.

## Documentation Structure

### Available Documentation
- **[Introduction](./introduction.md)** - What is Cronicorn and why use it
- **[Core Concepts](./core-concepts.md)** - Key terminology and mental models
- **[Quick Start](./quick-start.md)** - Get up and running in 5 minutes

### Planned Documentation
Additional documentation will be added as needed:
- Architecture guides
- Detailed installation and configuration
- API reference (REST and MCP)
- Usage guides (creating jobs, AI scheduling, monitoring)
- Advanced topics (deployment, multi-tenancy, custom adapters)

## MCP Resource Metadata

Each markdown file in this directory includes frontmatter with MCP resource metadata:

- **uri**: Unique resource identifier (file:// scheme)
- **name**: Short filename
- **title**: Human-readable title
- **description**: Brief description of the content
- **mimeType**: Always `text/markdown` for markdown files
- **annotations**: Metadata hints for AI consumption
  - **audience**: `["user"]`, `["assistant"]`, or `["user", "assistant"]`
  - **priority**: 0.0 to 1.0 (1.0 = required, 0.0 = optional)
  - **lastModified**: ISO 8601 timestamp

## Usage in Docusaurus

Docusaurus is configured to read directly from this directory:

```typescript
// apps/docs/docusaurus.config.ts
{
  docs: {
    path: '../../docs-v2',  // Points to this directory
    sidebarPath: './sidebars.ts',
  }
}
```

The frontmatter is fully compatible with Docusaurus and provides additional metadata for AI consumption.

## Usage in MCP Server

The MCP server reads markdown files from this directory at startup and exposes them as resources:

```typescript
// apps/mcp-server/src/resources/index.ts
const DOCS_PATH = path.join(__dirname, "../../../../docs-v2");
```

The MCP server exposes these documents through the `resources/list` and `resources/read` endpoints. AI assistants can discover and read documentation to provide accurate, context-aware assistance.

## Contributing

When adding or updating documentation:

1. Include complete MCP frontmatter metadata
2. Use clear, descriptive titles and descriptions
3. Set appropriate audience and priority values
4. Update the lastModified timestamp
5. Ensure content is valuable for both humans and AI

## Related Documentation

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Markdown Best Practices](https://www.markdownguide.org/basic-syntax/)
