# Publish MCP Server to Official MCP Registry

**Date:** 2025-02-10
**Status:** Accepted

## Context

The `@cronicorn/mcp-server` npm package is published and functional but only discoverable via npm search. The Official MCP Registry (registry.modelcontextprotocol.io) powers VS Code `@mcp` search and Claude Code plugin discovery. Publishing there significantly increases discoverability for AI assistant users.

## Decision

Publish the MCP server to the Official MCP Registry, automated via the existing CI workflow.

### Namespace

Use `io.github.weskerllc/cronicorn-mcp-server` as the MCP Registry name, derived from the GitHub org `weskerllc`. This follows the reverse-domain convention and is verified via GitHub OIDC during publishing.

### Transport

Use `stdio` transport. This is the standard for npm-distributed MCP servers and works with `npx -y @cronicorn/mcp-server`.

### Authentication

Uses `mcp-publisher` CLI (Go binary from `modelcontextprotocol/registry` releases) with GitHub OIDC auth (leverages existing `id-token: write` permission in CI). No new secrets required.

### Metadata

- `server.json` — MCP Registry metadata, validated by `mcp-registry-validator` in CI
- Version is derived from `package.json` at publish time via `jq` (not tracked in git)
- `mcpName` field in `package.json` links the npm package to the registry entry

### Version Strategy

`apps/mcp-server/package.json` version in git is a placeholder. At publish time:
1. CI sets the version from the release tag (or manual input)
2. `tsup` inlines it into the bundle via `define`
3. `jq` syncs it into `server.json` for the registry

## Consequences

**Benefits:**
- Discoverable in VS Code MCP search and Claude Code plugin marketplace
- Automated publishing on every release (no manual steps after initial setup)
- No changes to the server runtime code

**Tradeoffs:**
- `server.json` version must be synced at publish time (handled by CI `jq` step)
- First publish may require manual execution to establish the namespace

**Files Affected:**
- `apps/mcp-server/package.json` — added `mcpName`
- `apps/mcp-server/server.json` — new registry metadata
- `apps/mcp-server/tsup.config.ts` — added `define` for version injection
- `.github/workflows/publish-mcp-server.yml` — added MCP Registry publish steps
- `apps/mcp-server/README.md` — added MCP Registry badge
