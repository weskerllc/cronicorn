# Publish MCP Server to Official Registry & Smithery

**Date:** 2025-02-10
**Status:** Accepted

## Context

The `@cronicorn/mcp-server` npm package is published and functional but only discoverable via npm search. The MCP ecosystem has two major marketplaces:

1. **Official MCP Registry** (registry.modelcontextprotocol.io) — powers VS Code `@mcp` search and Claude Code plugin discovery
2. **Smithery** (smithery.ai) — largest community marketplace for MCP servers

Publishing to both significantly increases discoverability for AI assistant users.

## Decision

Publish the MCP server to both the Official MCP Registry and Smithery, automated via the existing CI workflow.

### Namespace

Use `io.github.weskerllc/cronicorn-mcp-server` as the MCP Registry name, derived from the GitHub org `weskerllc`. This follows the reverse-domain convention and is verified via GitHub OIDC during publishing.

### Transport

Use `stdio` transport for both registries. This is the standard for npm-distributed MCP servers and works with `npx -y @cronicorn/mcp-server`.

### Authentication

- **MCP Registry**: Uses `mcp-publisher` CLI (Go binary from `modelcontextprotocol/registry` releases) with GitHub OIDC auth (leverages existing `id-token: write` permission in CI). No new secrets required.
- **Smithery**: Requires a `SMITHERY_API_KEY` secret added to GitHub repo settings. The publish step is conditional on the secret existing.

### Metadata Files

- `server.json` — Official MCP Registry metadata (schema-validated, version synced in CI)
- `smithery.yaml` — Smithery stdio configuration with config schema

Both files are included in the npm package via the `files` array so they ship alongside the server code.

## Consequences

**Benefits:**
- Discoverable in VS Code MCP search, Claude Code plugin marketplace, and Smithery
- Automated publishing on every release (no manual steps after initial setup)
- No changes to the server runtime code

**Tradeoffs:**
- `server.json` version must be kept in sync (handled by CI `jq` step)
- Smithery publishing requires maintaining a `SMITHERY_API_KEY` secret
- First MCP Registry publish may require manual execution to establish the namespace

**Files Affected:**
- `apps/mcp-server/package.json` — added `mcpName`, updated `files`
- `apps/mcp-server/server.json` — new registry metadata
- `apps/mcp-server/smithery.yaml` — new Smithery config
- `.github/workflows/publish-mcp-server.yml` — added registry + Smithery publish steps
- `apps/mcp-server/README.md` — added marketplace badges
