# AI Tool Payload Budgeting

**Date:** 2025-12-18
**Status:** Accepted

## Context

The first AI planner session after ADR 0051 still consumed ~8K tokens despite the 15-step guardrail. The bulk of the cost came from our own tool payloads: `get_latest_response` returned full JSON responses, `get_response_history` streamed ten identical 1K-character bodies per call, and `get_sibling_latest_responses` emitted full response objects for every endpoint in a job. Without more aggressive defaults the <5K token target from ADR 0051 would remain unattainable, and we lacked telemetry to confirm which tools were responsible when sessions spiked.

## Decision

1. **Default to metadata-only responses.**
   - `get_latest_response`, `get_response_history`, and `get_sibling_latest_responses` now include short previews plus truncated bodies capped at 400–500 chars only when callers opt in (`includeBodies`/`includeResponses`).
   - History default `limit` dropped from 10 to 5 and duplicate payloads are flagged so the AI can ignore redundant entries.

2. **Prompt guidance updated.**
   - The analysis prompt now explains the lighter defaults and how to request full bodies so the AI cooperates with the new budget.

3. **Telemetry for accountability.**
   - The planner logs approximate per-tool payload sizes (args/results) for every session so we can verify the changes keep costs below the ADR 0051 thresholds.

## Consequences

- Typical sessions should now stay inside the <5K token budget while still allowing deep dives on demand.
- Developers and operators can see when a particular tool (e.g., history with bodies) dominates spend and react quickly.
- AI behavior remains flexible—full payloads are still available, but only when explicitly requested.
- Tests or scripts that relied on the old defaults may need to set the new flags if they require raw bodies.

## References

- ADR 0051 — AI Planner Efficiency Improvements (context for token targets).
