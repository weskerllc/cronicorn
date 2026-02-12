# Outbound Request Signing (HMAC-SHA256)

**Date:** 2026-02-10
**Status:** Accepted

## Context

Cronicorn dispatches HTTP requests to user endpoints on a schedule, but had no way for those endpoints to verify that a request genuinely came from Cronicorn. This is table-stakes for production webhook/scheduler systems — Stripe, QStash, and Inngest all sign outbound requests.

With AI/MCP as a primary interface, this gap is critical: the AI can set up an endpoint and generate verification middleware, but only if Cronicorn actually signs the requests.

## Decision

Every outbound HTTP request is signed with HMAC-SHA256 using a per-account signing key. Two headers are injected:

- `X-Cronicorn-Signature: sha256=<hex-encoded HMAC>`
- `X-Cronicorn-Timestamp: <unix-seconds>`

Signature = `HMAC-SHA256(key, "{timestamp}.{body}")` where body is empty string for bodyless requests.

### Key design choices:

1. **Per-account key** (not per-endpoint): Simpler model, consistent with Stripe's approach. One key to manage per user.
2. **Always-on**: Every outbound request is signed. Users who don't verify just ignore the extra headers. No opt-in/out complexity.
3. **Raw key storage**: Plaintext in DB, matching the existing `oauthTokens.accessToken` pattern. Acceptable for MVP; encryption at rest can be added later.
4. **Fail-open**: If signing key lookup fails, the request proceeds unsigned. Availability prioritized over security for the dispatcher.
5. **Decorator pattern**: `SigningDispatcher` wraps `HttpDispatcher` via the existing `Dispatcher` port. Clean separation, easy to test.
6. **Auto-provisioning**: Keys are created automatically for new users (via Better Auth `databaseHooks`) and seeded admin users.

## Consequences

**Benefits:**
- Endpoints can verify request authenticity by recomputing the HMAC
- Timestamp header enables replay attack protection (reject requests older than 5 minutes)
- MCP tools allow AI to generate verification middleware for user codebases
- No configuration needed — signing just works

**Tradeoffs:**
- No dual-key grace period during rotation (old key immediately invalidated)
- SigningKeyProvider does a DB query per dispatch (add LRU cache if this becomes a bottleneck)
- Raw key storage means DB compromise exposes signing keys
- No per-endpoint key override (all endpoints share the account key)

**Files Affected:**
- Domain: `packages/domain/src/ports/signing.ts`, `packages/domain/src/signing/`
- Schema: `packages/adapter-drizzle/src/schema.ts` (signingKeys table)
- Adapters: `packages/adapter-drizzle/src/signing-key-*.ts`, `packages/adapter-http/src/signing-dispatcher.ts`
- Composition roots: `apps/scheduler/src/index.ts`, `apps/api/src/app.ts`
- API routes: `apps/api/src/routes/signing-keys/`
- MCP tools: `apps/mcp-server/src/tools/api/{get,post,post-rotate}-signing-key.ts`
- Contracts: `packages/api-contracts/src/signing-keys/`

## References

- Industry precedent: Stripe webhook signing, QStash request signing, Inngest event signing
- TASK-X.Y.Z: Outbound request signing implementation
