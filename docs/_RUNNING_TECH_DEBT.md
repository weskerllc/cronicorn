# Running Technical Debt

This document tracks technical debt, TODOs, and uncertainties discovered during development.

## MCP Server: Bundling Strategy Decision

**Date:** 2025-11-01
**Status:** ✅ RESOLVED
**Area:** MCP Server Publishing & Distribution

**Problem:**
When publishing `@cronicorn/mcp-server` to npm, needed to decide whether to:
1. Publish both `@cronicorn/api-contracts` and `@cronicorn/mcp-server` separately
2. Bundle api-contracts into mcp-server dist

**Resolution:**
Chose **Option 2: Bundle api-contracts** using tsup bundler.

**Implementation:**
- Added `tsup@^8.5.0` as build tool
- Configured to bundle all dependencies except `@modelcontextprotocol/sdk`
- api-contracts code is included in 470KB executable
- Only one package to publish/install

**Rationale:**
- Simpler user experience (one `npm install`)
- No version coordination needed
- api-contracts has no standalone use case
- Smaller attack surface
- Faster cold starts

**Documentation:**
See `apps/mcp-server/BUNDLING.md` for full technical details.

**ADR:** Created `.adr/0040-mcp-server-bundling-strategy.md`

**Publishing Workflow:**
Created `.github/workflows/publish-mcp-server.yml` for automated npm publishing.
See `.github/workflows/PUBLISHING_MCP_SERVER.md` for usage instructions.

---

## MCP Server: 1:1 API Endpoint Pattern vs Custom Tools

**Date:** 2025-11-01
**Status:** ✅ VALIDATED - Pattern Ready for Template Use
**Severity:** Medium
**Area:** MCP Server Architecture

**Problem:**
Current MCP server uses custom tools (`create_job`, `list_jobs`, etc.) that:
- Have custom input/output schemas that don't match API contracts
- Require transformation layer between MCP and API
- Create impedance mismatches (e.g., `create_job` tries to access `job.endpoints` but `JobResponseSchema` doesn't include that field)
- Need manual updates when API changes
- Limited functionality (only 4 operations exposed)

**Proposed Solution:**
Implement 1:1 API endpoint mirroring pattern where:
- Each MCP tool maps directly to one API endpoint (e.g., `POST_jobs`, `GET_jobs`, `POST_jobs_jobId_endpoints`)
- Input/output schemas come directly from `@cronicorn/api-contracts`
- No transformation layer needed
- All API operations automatically available
- AI models compose primitives for workflows

**Validation Results (2025-01-10):**
✅ Pattern validated against MCP TypeScript SDK best practices
✅ Fixed critical issues:
  - Schema definitions: Must use `{ ...Schema.shape }` not `.shape` directly
  - Error handling: Added comprehensive try/catch with `isError: true` flag
  - API errors vs validation errors: Differentiated handling
✅ Created documentation: `apps/mcp-server/docs/1-to-1-API-TOOL-PATTERN.md`
✅ Updated POST_jobs as validated template

**Pattern Ready For:**
- ✅ Use as template for all new API endpoint tools
- ✅ Migration of existing custom tools
- ✅ Code generation from OpenAPI spec (future)

**Next Steps:**
1. Migrate existing custom tools to 1:1 pattern
2. Create generator script for bulk conversion
3. Add comprehensive test coverage for error cases
4. Consider extracting common error handler wrapper

**Benefits of Migration:**
- 50% less code to maintain
- Zero schema drift
- Complete API coverage
- Better AI experience (REST-native)
- Self-documenting via OpenAPI metadata

**Impact:**
- Better maintainability
- More flexible for AI agents
- Breaking change for any existing MCP clients (tool names change)

## Database Configuration Inconsistency

**Date:** 2025-10-30
**Severity:** Low
**Area:** Testing Infrastructure

**Problem:**
- `.env` file specifies `DB_PORT=6666` for docker-compose
- Running docker container is actually on port `5432`
- `DATABASE_URL` in `.env` points to `localhost:5432/cronicorn_prod`
- Tests were using `.env.test` with `localhost:6666/db` causing connection failures

**Current Workaround:**
Updated `.env.test` to use `postgresql://cronicorn_user:asdfasdfasdf@localhost:5432/cronicorn_prod` to match the actual running database.

**Proper Fix Needed:**
1. Decide on canonical port (5432 or 6666)
2. Update docker-compose to use that port
3. Update all .env files consistently
4. Document in quickstart.md
5. Consider separate test database vs using prod database for tests

**Impact:**
- Tests were failing with ECONNREFUSED errors
- Potential data corruption risk if tests run against prod database
- Confusion for new developers setting up local environment

**Next Steps:**
- [ ] Create ADR for test database strategy (separate DB vs same DB with transactions)
- [ ] Standardize port configuration
- [ ] Add validation script to check env configuration before tests
