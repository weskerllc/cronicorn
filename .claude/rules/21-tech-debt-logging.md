---
applyTo: '**'
---

# Tech Debt Logging (MANDATORY)

## The Rule

In any situation where you identify technical debt, or a TODO, or any uncertainty about the path forward, or where/how code will be used, you **MUST** log it in:

**`docs/_RUNNING_TECH_DEBT.md`**

## Why This Matters

There must not be any code written anywhere without a direct purpose and without logging the tech debt in that document.

This ensures:
- Future maintainers understand shortcuts taken
- Technical debt is visible and trackable
- Uncertainty is documented for later resolution
- Nothing is "forgotten" or "left for later" without record

## What to Log

Log these types of items:

### 1. TODOs
Any work that needs to be done later:
```markdown
- TODO: Add validation for email format in UserRepo
- TODO: Implement rate limiting on job creation endpoint
```

### 2. Technical Debt
Shortcuts or suboptimal implementations:
```markdown
- TECH DEBT: Job scheduler uses polling instead of event-driven approach
- TECH DEBT: No database indexes on frequently queried columns
```

### 3. Uncertainty
Unclear requirements or implementation decisions:
```markdown
- UNCERTAIN: Should job failures retry automatically or require manual intervention?
- UNCERTAIN: What's the max number of concurrent jobs per tenant?
```

### 4. Missing Features
Features that should exist but don't yet:
```markdown
- MISSING: No user audit log for security-sensitive actions
- MISSING: No backup/restore functionality for job configurations
```

## How to Log

Keep entries concise and actionable:

```markdown
## Feature: Job Scheduling (Implementation Date: 2024-03-20)

### Remaining Work
- [ ] Add retry logic for failed job executions
- [ ] Implement job priority system
- [ ] Add metrics/monitoring for job execution times

### Technical Debt
- No database indexes on `next_run_at` column (performance risk at scale)
- Job dispatcher uses synchronous HTTP calls (blocks scheduler thread)
- Hard-coded timeout values (should be configurable per job)

### Uncertainties
- Should jobs support dependencies (job A must complete before job B)?
- What happens if a job runs longer than its interval?
- How to handle timezone changes for cron expressions?
```

## When to Log

Log immediately when:
- Implementing a quick fix or workaround
- Skipping error handling for MVP
- Making assumptions about future requirements
- Discovering something unclear in requirements
- Writing code you know will need refactoring

## File Location

Always use: **`docs/_RUNNING_TECH_DEBT.md`**

This file is tracked in git and visible to the entire team.

## Format

Use Markdown with clear sections:
- H2 (##) for features/areas
- H3 (###) for categories (Remaining Work, Technical Debt, Uncertainties)
- Bullet points for individual items
- Checkboxes (- [ ]) for actionable tasks

## Example Entry

```markdown
## 14-Day Money-Back Guarantee (Implementation Date: 2024-12-15)

### Implementation Summary
- Added `refund_period_ends_at` to subscriptions table
- Created `/api/webhooks/stripe` endpoint for payment events
- Added refund logic to SubscriptionsManager

### Remaining Work
- [ ] Email notification when refund period ends
- [ ] Admin dashboard view for subscriptions in refund period
- [ ] Analytics tracking for refund requests

### Technical Debt
- Refund logic doesn't handle partial refunds (only full refunds)
- No idempotency key on Stripe API calls (retry risk)
- Webhook signature verification uses deprecated method

### Uncertainties
- Should pro-rated refunds be allowed after partial month?
- What happens to job data when subscription is refunded?
- Should we keep job history after refund or delete everything?
```

## Enforcement

If Claude finds:
- A TODO in code without `docs/_RUNNING_TECH_DEBT.md` entry
- A shortcut implementation without logging
- Uncertainty about requirements without documentation

Claude should log it immediately in `docs/_RUNNING_TECH_DEBT.md`.

## Review Process

Periodically review `docs/_RUNNING_TECH_DEBT.md`:
- Convert items to proper GitHub issues or ADRs
- Resolve completed items
- Re-prioritize based on impact
- Update uncertainties when requirements clarify

## No Exceptions

This is a **mandatory** requirement. No code should be written without proper tech debt logging.
