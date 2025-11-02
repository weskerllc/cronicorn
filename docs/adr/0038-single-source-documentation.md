# Documentation Migration: Single Source Approach

**Date:** November 2, 2025  
**Status:** Completed

## Summary

Successfully migrated from a dual-directory documentation approach (with sync script) to a single-source approach where `apps/docs/docs/` serves as the canonical documentation for both:
- Human users via Docusaurus
- AI assistants via MCP server resources

## What Changed

### Before (Sync Approach)

```
docs-v2/                       # Source of truth with MCP frontmatter
  ├── introduction.md
  ├── core-concepts.md
  └── quick-start.md

scripts/
  └── sync-docs.ts            # Transform and copy to Docusaurus

apps/docs/docs/               # Docusaurus destination (synced copies)
  ├── introduction.md
  ├── core-concepts.md
  └── quick-start.md
```

**Issues:**
- Required manual `pnpm sync:docs` step
- Two copies of documentation
- Could get out of sync
- Extra complexity in build process

### After (Single Source)

```
docs-v2/                      # Single source of truth at root
  ├── introduction.md         # Contains both Docusaurus AND MCP metadata
  ├── core-concepts.md
  ├── quick-start.md
  └── README.md

apps/docs/
  └── docusaurus.config.ts    # Configured with path: '../../docs-v2'

apps/mcp-server/
  └── src/resources/index.ts  # Reads from ../../../../docs-v2
```

**Benefits:**
- ✅ One file to edit
- ✅ No sync step needed
- ✅ Always in sync
- ✅ Simpler build process
- ✅ Standard Docusaurus pattern
- ✅ Documentation at root level for easy access

## Frontmatter Format

All documentation now uses this combined format:

```yaml
---
# Docusaurus fields
id: introduction
title: Introduction to Cronicorn
description: Overview of Cronicorn's AI-powered adaptive scheduling system
tags:
  - user
  - assistant
  - essential
sidebar_position: 1

# MCP custom fields (ignored by Docusaurus)
mcp:
  uri: file:///docs/introduction.md
  mimeType: text/markdown
  priority: 0.9
  lastModified: 2025-11-02T00:00:00Z
---
```

Docusaurus uses:
- `id`, `title`, `description`, `tags`, `sidebar_position`

MCP server uses:
- `title`, `description` (from Docusaurus)
- `tags` (filters for audience: user/assistant)
- `mcp.uri`, `mcp.mimeType`, `mcp.priority`, `mcp.lastModified`

## Implementation Details

### MCP Server Resources

The MCP server bundles documentation at build time:

1. **Build step** copies `docs-v2/` to `dist/docs/` during tsup build
2. At runtime, reads markdown files from bundled `dist/docs/`
3. Parses frontmatter using `gray-matter`
4. Registers each file as an MCP resource using `server.registerResource()`
5. Extracts metadata from both Docusaurus and MCP fields

**Why bundle instead of fetching from website?**
- Works when published to npm (docs included in package)
- Version-locked (docs match server version)
- No internet dependency (works offline)
- Fast access (local files)
- Reliable (no external service dependency)

**Key code:**
```typescript
// apps/mcp-server/tsup.config.ts
onSuccess: async () => {
  cpSync("../../docs-v2", "dist/docs", { recursive: true });
}

// apps/mcp-server/src/resources/index.ts
const DOCS_PATH = path.join(__dirname, "docs"); // Bundled docs

export async function registerResources(server: McpServer): Promise<void> {
  const resources = await loadDocumentationResources();
  
  for (const [uri, doc] of resources.entries()) {
    server.registerResource(
      doc.metadata.name,
      uri,
      {
        title: doc.metadata.title,
        description: doc.metadata.description,
        mimeType: doc.metadata.mimeType,
        annotations: doc.metadata.annotations,
      },
      async () => ({
        contents: [{
          uri,
          mimeType: doc.metadata.mimeType,
          text: doc.content,
        }],
      }),
    );
  }
}
```

### Docusaurus Configuration

Docusaurus is configured to read from the root `docs-v2/` directory:

```typescript
// apps/docs/docusaurus.config.ts
{
  docs: {
    path: '../../docs-v2',
    sidebarPath: './sidebars.ts',
  },
}
```

## Files Removed

- ✅ Original `docs-v2/` sync directory (was temporary)
- ✅ `scripts/sync-docs.ts`
- ✅ `sync:docs` script from root `package.json`
- ✅ `gray-matter` dependency from root (moved to MCP server package)
- ✅ Tutorial boilerplate from docs-v2 (tutorial-basics, tutorial-extras, intro.md)

## Files Created/Modified

### Documentation Files (at root)
- `docs-v2/introduction.md` - Single source with combined frontmatter
- `docs-v2/core-concepts.md` - Single source with combined frontmatter
- `docs-v2/quick-start.md` - Single source with combined frontmatter
- `docs-v2/README.md` - Single source with combined frontmatter

### MCP Server
- `apps/mcp-server/src/index.ts` - Now calls `registerResources(server)`
- `apps/mcp-server/src/resources/index.ts` - Reads from `../../../../docs-v2`

### Docusaurus Configuration
- `apps/docs/docusaurus.config.ts` - Updated `path: '../../docs-v2'`

## Testing

✅ Build successful: `pnpm -F @cronicorn/mcp-server build`
✅ No TypeScript errors
✅ Resources implementation compiles correctly
✅ MCP server bundles successfully

## Next Steps

To verify the MCP server works end-to-end:

1. **Start development environment:**
   ```bash
   pnpm dev
   ```

2. **Test MCP server:**
   ```bash
   pnpm -F @cronicorn/mcp-server inspect
   ```

3. **Verify resources are available:**
   - Check that MCP inspector shows documentation resources
   - Verify URIs like `file:///docs/introduction.md` are accessible
   - Confirm content includes frontmatter-parsed metadata

## Rollback Plan

If issues arise, the previous implementation is in Git history:
1. Checkout commit before migration
2. Restore `docs-v2/` directory
3. Restore `scripts/sync-docs.ts`
4. Restore `sync:docs` script in package.json
5. Add `gray-matter` back to root package.json

## References

- [Docusaurus Custom Frontmatter](https://docusaurus.io/docs/markdown-features#front-matter)
- [MCP Resources Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [MCP TypeScript SDK - Resources](https://github.com/modelcontextprotocol/typescript-sdk#resources)
