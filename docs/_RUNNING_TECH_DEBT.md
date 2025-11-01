# Running Technical Debt

This document tracks technical debt, TODOs, and uncertainties discovered during development.

## MCP Server: 1:1 API Endpoint Pattern vs Custom Tools

**Date:** 2025-11-01
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

**Proof of Concept:**
Created `tools/api/post-jobs.ts` as example:
- ~45 lines vs ~70+ for custom tool
- Zero schema drift (uses `CreateJobRequestSchema` directly)
- Runtime validation via api-contracts
- Works as tested

**Decision Needed:**
1. Migrate all existing custom tools to 1:1 pattern?
2. Keep both approaches (custom + 1:1) for comparison?
3. Timeline for migration?

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
