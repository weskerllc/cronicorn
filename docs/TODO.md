 Implement adapters/drizzle-store.ts with leases & migrations.

 Add adapters/http-dispatcher.ts

 Wire app/vercel-ai-planner.ts with real tools + Quota.allow.

 Build worker/ composition root: inject Clock, Cron, SQL repos, Dispatcher, Planner.

 Build api/ composition root: routes for endpoints, pause, tools, status.

 Add metrics/logging/tracing adapters & dashboards.

 CI: unit + contract (Postgres docker) + component; E2E behind nightly flag.

 Feature flags to toggle AI, cron vs interval, and per-tenant quotas.

 Playbook: oncall runbook (pause all alerts, resume, inspect leases).