# Annual Stripe pricing and env defaults

**Date:** 2026-01-05
**Status:** Accepted

## Context
Pro now offers monthly ($24) and annual ($228) plans. Annual checkout requires a dedicated Stripe price ID, but only the monthly price was documented in shared env examples. Without an annual env variable, deployments risk misconfigured pricing or reliance on dev defaults.

## Decision
- Added `STRIPE_PRICE_PRO_ANNUAL` to shared environment docs to mirror the annual price already supported in code (`config-defaults`, API config, Stripe adapter).
- Clarified Stripe key guidance (test for local dev, live for production) alongside the new annual price ID.
- Updated operational docs (scripts/README) to list the annual price alongside other Stripe envs.

## Consequences
- Deployments must set both `STRIPE_PRICE_PRO` and `STRIPE_PRICE_PRO_ANNUAL` (plus webhook secret and API key) in prod secrets; leaving defaults will block production start per config validation.
- Runbooks and onboarding should include the new annual price ID; missed configuration will surface as checkout errors or dev-default warnings at startup.
- Future pricing changes require updating both monthly and annual Stripe prices and corresponding envs.

## References
- TASK-? (Billing/subscriptions) — task ID not provided; update when available.
