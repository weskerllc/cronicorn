# Documentation Structure Implementation Summary

## What Was Created

A dual-purpose documentation system has been implemented at `/docs-v2` that serves both:

1. **Human users** - via the Docusaurus site at `apps/docs`
2. **AI assistants** - via MCP (Model Context Protocol) server resources

## Directory Structure

```
docs-v2/                       # Canonical documentation source
├── README.md                  # Documentation overview and structure
├── introduction.md            # What is Cronicorn and why use it
├── core-concepts.md           # Key terminology and mental models  
└── quick-start.md             # Get up and running in 5 minutes

apps/docs/docs/                # Docusaurus documentation (synced)
├── README.md                  # Synced from docs-v2
├── introduction.md            # Synced from docs-v2
├── core-concepts.md           # Synced from docs-v2
├── quick-start.md             # Synced from docs-v2
└── ...                        # Other Docusaurus content

apps/mcp-server/src/resources/ # MCP resources implementation (TODO)
└── README.md                  # Implementation guide
```

## MCP-Compatible Frontmatter

Each markdown file in `docs-v2/` includes MCP resource metadata following the [MCP 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources):

```yaml
---
uri: file:///docs-v2/filename.md
name: filename.md
title: Human Readable Title
description: Brief description for context
mimeType: text/markdown
annotations:
  audience: ["user", "assistant"]  # Target audience
  priority: 0.9                    # 0.0 (optional) to 1.0 (required)
  lastModified: 2025-11-02T00:00:00Z  # ISO 8601 timestamp
---
```

### Annotation Fields

- **audience**: Array of `"user"`, `"assistant"`, or both
  - `["user"]` - Primarily for human readers
  - `["assistant"]` - Primarily for AI assistants
  - `["user", "assistant"]` - Valuable for both

- **priority**: Float from 0.0 to 1.0
  - `1.0` - Essential/required reading
  - `0.9` - Highly recommended
  - `0.5` - Optional but useful
  - `0.0` - Supplementary/reference

- **lastModified**: ISO 8601 datetime
  - Used by AI to prioritize recent docs
  - Helps identify stale content

## Docusaurus Integration

### Sync Script

The `scripts/sync-docs.ts` script transforms MCP frontmatter to Docusaurus format:

```bash
pnpm sync:docs
```

**Transformations:**
- `title` → `title` (preserved)
- `description` → `description` (preserved)
- `name` → `id` (filename without extension)
- `annotations.audience` → `tags` (added as tags)
- `annotations.priority >= 0.9` → `tags: ["essential"]`
- `annotations.lastModified` → `last_update.date`

### Running Docusaurus

```bash
# Development
pnpm dev:docs

# Build
pnpm -F @cronicorn/docs build

# Serve built site
pnpm -F @cronicorn/docs serve
```

The site runs at http://localhost:3000

## MCP Server Integration (Future)

### Implementation Steps

1. **Declare Resources Capability** in `apps/mcp-server/src/index.ts`:
   ```typescript
   const server = new McpServer({
     name: "cronicorn",
     version: "0.1.0",
     capabilities: {
       resources: {
         subscribe: false,
         listChanged: false
       }
     }
   });
   ```

2. **Implement Resource Handlers**:
   - `resources/list` - Return metadata for all docs
   - `resources/read` - Return full content for a specific doc URI

3. **Load Documentation** at startup:
   - Parse all markdown files from `docs-v2/`
   - Extract frontmatter metadata
   - Cache in memory for fast access

4. **Add Dependencies**:
   - `gray-matter` - Already installed in mcp-server package.json

### MCP Resource Protocol

According to the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources):

**List Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": "optional-pagination-cursor"
  }
}
```

**List Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///docs-v2/introduction.md",
        "name": "introduction.md",
        "title": "Introduction to Cronicorn",
        "description": "Overview of Cronicorn's AI-powered adaptive scheduling system",
        "mimeType": "text/markdown",
        "annotations": {
          "audience": ["user", "assistant"],
          "priority": 0.9,
          "lastModified": "2025-11-02T00:00:00Z"
        }
      }
    ]
  }
}
```

**Read Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///docs-v2/introduction.md"
  }
}
```

**Read Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///docs-v2/introduction.md",
        "mimeType": "text/markdown",
        "text": "# Introduction to Cronicorn\n\n..."
      }
    ]
  }
}
```

## Documentation Guidelines

When creating new documentation:

1. **Create in `docs-v2/`** (canonical source)
2. **Include complete MCP frontmatter**
3. **Set appropriate audience and priority**
4. **Update lastModified timestamp**
5. **Run sync script**: `pnpm sync:docs`
6. **Verify in Docusaurus**: `pnpm dev:docs`

### Content Best Practices

- **Clear titles** - Descriptive and searchable
- **Good descriptions** - Summarize in one sentence
- **Audience targeting**:
  - `["user"]` - Tutorials, guides, UI documentation
  - `["assistant"]` - API reference, CLI commands, architecture
  - `["user", "assistant"]` - Core concepts, getting started

- **Priority setting**:
  - `1.0` - Must read (introduction, core concepts)
  - `0.9` - Should read (quick start, API reference)
  - `0.7` - Nice to read (guides, examples)
  - `0.5` - Optional (advanced topics, internals)

## Files Created

### Documentation Files
- `/docs-v2/README.md` - Documentation structure overview
- `/docs-v2/introduction.md` - Introduction to Cronicorn
- `/docs-v2/core-concepts.md` - Key terminology and concepts
- `/docs-v2/quick-start.md` - 5-minute getting started guide

### Integration Files
- `/scripts/sync-docs.ts` - Sync script (docs-v2 → apps/docs)
- `/apps/mcp-server/src/resources/README.md` - MCP implementation guide

### Package Updates
- Root `package.json` - Added `sync:docs` script and `gray-matter` dependency
- `apps/mcp-server/package.json` - Added `gray-matter` dependency

## Next Steps

1. **Expand Documentation**:
   - Architecture guide
   - API reference
   - Deployment guide
   - Advanced topics

2. **Implement MCP Resources**:
   - Add capability declaration
   - Implement list/read handlers
   - Test with MCP inspector

3. **Organize Docusaurus**:
   - Update sidebar configuration
   - Remove tutorial placeholders
   - Add custom CSS/branding

4. **Automation**:
   - Add sync to build process
   - Set up pre-commit hooks
   - CI/CD documentation deployment

## References

- [MCP Resources Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Markdown Best Practices](https://www.markdownguide.org/basic-syntax/)
- [ISO 8601 DateTime Format](https://www.iso.org/iso-8601-date-and-time-format.html)
