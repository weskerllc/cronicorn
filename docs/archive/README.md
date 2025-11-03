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

This directory contains the canonical documentation for Cronicorn, structured to be consumed by both:
- **Human users** via the Docusaurus documentation site at `apps/docs`
- **AI assistants** via the MCP server resources API

## Documentation Structure

### Core Concepts
- **[Introduction](./introduction.md)** - What is Cronicorn and why use it
- **[Architecture](./architecture.md)** - System design and components
- **[Core Concepts](./core-concepts.md)** - Key terminology and mental models

### Getting Started
- **[Quick Start](./quick-start.md)** - Get up and running in 5 minutes
- **[Installation](./installation.md)** - Detailed installation guide
- **[Configuration](./configuration.md)** - Environment variables and settings

### API Reference
- **[REST API](./api/rest-api.md)** - HTTP API endpoints
- **[MCP Server](./api/mcp-server.md)** - Model Context Protocol integration
- **[Authentication](./api/authentication.md)** - OAuth 2.0 device flow

### Guides
- **[Creating Jobs](./guides/creating-jobs.md)** - How to create and configure jobs
- **[AI Scheduling](./guides/ai-scheduling.md)** - Understanding AI-powered adaptations
- **[Monitoring](./guides/monitoring.md)** - Observability and debugging

### Advanced
- **[Deployment](./advanced/deployment.md)** - Production deployment strategies
- **[Multi-tenancy](./advanced/multi-tenancy.md)** - Tenant isolation and management
- **[Custom Adapters](./advanced/custom-adapters.md)** - Extending Cronicorn

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

These markdown files are imported into the Docusaurus site at `apps/docs/docs/` through symbolic links or build-time copying. The frontmatter is compatible with Docusaurus and provides additional metadata for AI consumption.

## Usage in MCP Server

The MCP server exposes these documents as resources through the `resources/list` and `resources/read` endpoints. AI assistants can discover and read documentation to provide accurate, context-aware assistance.

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
