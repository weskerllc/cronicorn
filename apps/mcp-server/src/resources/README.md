# MCP Resources Implementation Guide

## Overview

This directory will contain the implementation of MCP resources for exposing Cronicorn documentation to AI assistants.

## Documentation Structure

The `docs-v2/` directory in the repository root contains markdown files with MCP-compatible frontmatter metadata. Each file includes:

```yaml
---
uri: file:///docs-v2/filename.md
name: filename.md
title: Human Readable Title
description: Brief description
mimeType: text/markdown
annotations:
  audience: ["user", "assistant"]  # or ["user"] or ["assistant"]
  priority: 0.9                    # 0.0 to 1.0
  lastModified: 2025-11-02T00:00:00Z
---
```

## MCP Resource Specification

According to the [MCP 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources):

### Capabilities

Servers supporting resources must declare the `resources` capability during initialization:

```typescript
{
  capabilities: {
    resources: {
      subscribe: true,      // Optional: support subscriptions
      listChanged: true     // Optional: notify on list changes
    }
  }
}
```

### Protocol Messages

#### List Resources
- Request: `resources/list` with optional cursor for pagination
- Response: Array of resource metadata (uri, name, title, description, mimeType, annotations)

#### Read Resource
- Request: `resources/read` with required `uri` parameter  
- Response: Resource contents with text or blob data

## Implementation TODO

1. **Declare Resources Capability** - Update server initialization in `src/index.ts`
2. **Implement Resource Handlers** - Add handlers for `resources/list` and `resources/read`
3. **Load Documentation** - Parse markdown files from `docs-v2/` at startup
4. **Cache Resources** - Keep parsed resources in memory for fast access
5. **Add Dependencies** - Install `gray-matter` for frontmatter parsing
6. **Test Integration** - Verify resources are accessible via MCP inspector

## References

- [MCP Resources Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [Cronicorn Documentation](../../docs-v2/README.md)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
