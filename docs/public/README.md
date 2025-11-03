---
id: docs-readme
title: Cronicorn Documentation
description: Documentation overview and navigation guide
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

Welcome to the Cronicorn documentation! This guide will help you find the right documentation for your needs.

## Quick Navigation

### 🚀 Getting Started (SaaS Users)

Using Cronicorn as a hosted service? Start here:

1. **[Introduction](./introduction.md)** - What is Cronicorn and why use it
2. **[Quick Start](./quick-start.md)** - Create your first scheduled job in 5 minutes
3. **[Core Concepts](./core-concepts.md)** - Understand jobs, endpoints, and AI scheduling

**Perfect for:**
- SaaS developers monitoring APIs
- Teams running scheduled tasks
- Anyone using Cronicorn as a service

### 🔧 Self-Hosting (Developers)

Want to deploy Cronicorn yourself? See technical docs:

1. **[System Architecture](./technical/system-architecture.md)** - How Cronicorn works internally
2. **[How Scheduling Works](./technical/how-scheduling-works.md)** - The governor algorithm
3. **[How AI Adaptation Works](./technical/how-ai-adaptation-works.md)** - Optional AI features
4. **[Configuration & Constraints](./technical/configuration-and-constraints.md)** - Safety and limits

**Perfect for:**
- DevOps engineers deploying Cronicorn
- Contributors to the open-source project
- Advanced users customizing the system

### 🤖 AI Assistant Integration

Using Cronicorn with Claude, Cursor, or other AI assistants?

- **[MCP Server](https://www.npmjs.com/package/@cronicorn/mcp-server)** - Model Context Protocol integration
- Install with: `npm install -g @cronicorn/mcp-server`
- See [Quick Start MCP Section](./quick-start.md#using-with-ai-assistants) for setup

**Perfect for:**
- Claude Desktop users
- VS Code with GitHub Copilot
- Cursor, Cline, Continue users

## Documentation Tags

Documents are tagged for different audiences:

- **`user`** - End users of the Cronicorn service
- **`assistant`** - AI assistants accessing via MCP
- **`essential`** - Core documentation everyone should read

## Available Documentation

### User Documentation
- ✅ [Introduction](./introduction.md) - Overview and key features
- ✅ [Core Concepts](./core-concepts.md) - Jobs, endpoints, scheduling, AI hints
- ✅ [Quick Start](./quick-start.md) - Get started in 5 minutes

### Technical Documentation (Self-Hosting)
- ✅ [System Architecture](./technical/system-architecture.md) - Hexagonal architecture overview
- ✅ [How Scheduling Works](./technical/how-scheduling-works.md) - Governor algorithm details
- ✅ [How AI Adaptation Works](./technical/how-ai-adaptation-works.md) - AI planner internals
- ✅ [Coordinating Multiple Endpoints](./technical/coordinating-multiple-endpoints.md) - Advanced patterns
- ✅ [Configuration & Constraints](./technical/configuration-and-constraints.md) - Safety mechanisms
- ✅ [Technical Reference](./technical/reference.md) - API contracts and database schema

## About This Documentation

This directory (`docs-v2/`) serves as the **single source of truth** for Cronicorn documentation, consumed by:

- **Docusaurus website** - Human-readable documentation site
- **MCP server** - AI assistants accessing documentation via Model Context Protocol

### Frontmatter Structure

Each document includes metadata for both humans and AI:

```yaml
---
id: unique-identifier
title: Human-Readable Title
description: Brief description
tags:
  - user          # For end users
  - assistant     # For AI assistants  
  - essential     # Core documentation
sidebar_position: 1
mcp:
  uri: file:///docs/filename.md
  mimeType: text/markdown
  priority: 0.9   # 0.0-1.0, higher = more important
  lastModified: 2025-11-02T00:00:00Z
---
```

## Contributing

Found an issue or want to improve the docs?

1. **Report issues**: [GitHub Issues](https://github.com/weskerllc/cronicorn/issues)
2. **Suggest improvements**: [GitHub Discussions](https://github.com/weskerllc/cronicorn/discussions)
3. **Submit PRs**: See our contributing guidelines on GitHub

## Getting Help

- 📖 [Documentation Site](https://cronicorn.com/docs)
- 💬 [Discord Community](https://discord.gg/cronicorn)
- 📧 [Email Support](mailto:support@cronicorn.com)

## Related Resources

- **[MCP Server Package](https://www.npmjs.com/package/@cronicorn/mcp-server)** - AI assistant integration
- **[GitHub Repository](https://github.com/weskerllc/cronicorn)** - Source code and issues
- **[API Documentation](https://app.cronicorn.com/docs/api)** - REST API reference
