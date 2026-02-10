---
id: self-hosting-known-limitations
title: Known Limitations
description: Current limitations and constraints of self-hosted Cronicorn
sidebar_position: 8
tags:
  - self-hosting
  - limitations
---

# Known Limitations

Transparency about what self-hosted Cronicorn does not yet support. These are known gaps, not bugs — they're documented here so you can plan accordingly.

## Single Instance Only

Cronicorn is designed for single-instance deployments. You cannot run multiple replicas of the API, scheduler, or AI planner behind a load balancer.

**Why:**
- **Rate limiting** uses in-memory state — each instance would maintain separate counters, effectively multiplying your rate limits by the number of instances
- **Scheduler** uses database-level locking to claim work — multiple schedulers would compete for the same jobs, but the architecture assumes a single scheduler process
- **AI planner** analyzes endpoints sequentially — multiple planners would duplicate analysis work

**Workaround:** For higher availability, use a process manager (e.g., systemd, Docker restart policies) to automatically restart failed containers. The default `restart: unless-stopped` policy handles most crash scenarios.

## No Down Migrations

Database migrations are forward-only. There are no "down" migration files to reverse schema changes.

**Impact:** If an upgrade introduces a breaking migration, you cannot roll back by simply downgrading the image version. The database schema will be ahead of what the older code expects.

**Workaround:** Always [back up your database](./backup-restore.md) before upgrading. Rollback requires restoring from the pre-upgrade backup.

## No Built-in Backups

Cronicorn does not automatically back up your database. You are responsible for implementing a backup strategy.

**Workaround:** Use standard PostgreSQL tooling (`pg_dump`) with a cron job. See [Backup & Restore](./backup-restore.md) for guidance.

## No Built-in Alerting

There is no built-in notification system for service health, job failures, or system errors.

**Workaround:** Use external monitoring services pointed at the `/api/health` endpoint. See [Monitoring](./monitoring.md) for recommendations.

## No Built-in SSL/TLS

The Docker Compose setup does not include TLS termination. All inter-service communication happens over the internal Docker network (unencrypted but isolated).

**Workaround:** Use a [reverse proxy](./reverse-proxy.md) (Caddy, Nginx, Traefik) for HTTPS termination.

## Linux/amd64 Only

Container images are built for `linux/amd64` only. ARM64 images (Apple Silicon Macs, AWS Graviton) are not yet available.

**Impact:** Running on ARM64 requires emulation (e.g., Docker Desktop on Apple Silicon uses Rosetta), which adds overhead and may cause subtle compatibility issues.

**Status:** ARM64 builds are planned but not yet prioritized.

## VITE Build-Time URLs

The web app uses Vite, which embeds `VITE_*` environment variables into the JavaScript bundle at **build time**. The published Docker images are built with default URLs.

**Impact:** If your `VITE_API_URL` differs from the default, the pre-built image still works as long as your reverse proxy serves the API and web app from the same domain (so relative URLs resolve correctly). If you need the API on a different domain, you would need to rebuild the web image.

**Workaround:** Serve both the web app and API through the same domain using path-based routing (e.g., `yourdomain.com/` → web, `yourdomain.com/api/*` → API). This is the recommended setup and avoids the issue entirely.

## No Multi-Tenancy Isolation

All users share the same database and service instances. There is no per-tenant resource isolation, separate databases, or namespace separation.

**Impact:** Suitable for small teams and individual use. Not designed for hosting as a service for unrelated customers.
