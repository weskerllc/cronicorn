# Self-Hosting Documentation Restructure

**Date:** 2026-02-07
**Status:** Accepted

## Context

The self-hosting documentation was a single 173-line page (`docs/public/self-hosting.md`) covering basic setup. Compared to mature self-hosted projects like Sentry (which use a hub-and-spoke model with ~10 pages covering requirements, configuration, upgrades, backup, monitoring, troubleshooting, and honest limitations), our docs lacked critical operational guidance for production self-hosters:

- No system requirements
- No backup/restore procedures
- No upgrade safety guidance
- No reverse proxy examples
- No monitoring/observability guidance
- No honest limitations section

Users deploying Cronicorn to production had to discover these gaps the hard way.

## Decision

Restructure self-hosting into a Docusaurus category with 8 sub-pages modeled after Sentry's hub-and-spoke documentation pattern:

1. **Overview & Installation** — System requirements, architecture, quick start
2. **Configuration** — Environment variables, URL matrix, optional features
3. **Reverse Proxy** — Working examples for Caddy, Nginx, Traefik, Cloudflare Tunnel
4. **Upgrading** — Version pinning, migration behavior, rollback procedure
5. **Backup & Restore** — Guidance on pg_dump, automation, restore procedure
6. **Monitoring** — Health checks, structured logging, resource monitoring
7. **Troubleshooting** — Per-component issue diagnosis
8. **Known Limitations** — Honest transparency about single-instance, no HA, no ARM64, etc.

Additionally, two small infrastructure changes support the documentation:
- Docker healthchecks added to all services in `docker-compose.yml`
- `docker-compose.override.yml.example` for common customizations

## Consequences

**Benefits:**
- Production self-hosters have actionable guidance for every operational concern
- Known limitations are documented upfront, reducing support burden
- Reverse proxy examples reduce the #1 deployment friction point
- Backup guidance uses standard PostgreSQL tooling — no custom scripts to maintain

**Tradeoffs:**
- 8 pages to maintain instead of 1 — mitigated by clear scope per page
- Cross-links between pages need to stay in sync

**Files affected:**
- `docker-compose.yml` — Added healthchecks to api, web, scheduler, ai-planner
- `docker-compose.override.yml.example` — New file
- `docs/public/self-hosting.md` — Deleted (replaced by category)
- `docs/public/self-hosting/` — 8 new pages + `_category.yml`
- `apps/docs/sidebars.ts` — Category replaces flat link
- `apps/docs/docusaurus.config.ts` — Added to llms-txt includeOrder
- `docs/public/troubleshooting.md` — Self-hosting section replaced with link
- `docs/_RUNNING_TECH_DEBT.md` — Added self-hosting gaps

## References

- Sentry self-hosted docs: https://develop.sentry.dev/self-hosted/
