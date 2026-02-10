# Sync Checklist

This document tracks cross-cutting changes that require updates in multiple locations.

## API Routes ↔ MCP Server Tools

When adding, editing, or removing API routes in `apps/api/src/routes/`:

- [ ] Create/update corresponding MCP tool in `apps/mcp-server/src/tools/api/`
- [ ] Register tool in `apps/mcp-server/src/tools/index.ts`
- [ ] Verify tool follows the pattern in `tools/QUICK_REFERENCE.md`
- [ ] Run `pnpm --filter @cronicorn/mcp-server typecheck`

**Pattern**: Each API route should have a 1:1 MCP tool mapping using the helper utilities from `tools/helpers/`.

---

<!-- Add new sync items below as needed -->

- docs, root readme