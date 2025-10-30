# Running Technical Debt

This document tracks technical debt, TODOs, and uncertainties discovered during development.

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
