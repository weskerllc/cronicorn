# SSRF Protection for HTTP Dispatcher

**Date:** 2026-02-07
**Status:** Accepted

## Context

Cronicorn's core function is making HTTP requests to user-configured URLs on a schedule. This creates a Server-Side Request Forgery (SSRF) attack surface: a malicious user could configure job endpoints pointing to internal services, cloud metadata endpoints (169.254.169.254), or private network resources, using the scheduler as a proxy to access otherwise-unreachable systems.

Without URL validation, the HTTP Dispatcher would faithfully request any URL — including `http://localhost:3333/api/admin`, `http://192.168.1.1/router-config`, or `http://169.254.169.254/latest/meta-data/`.

## Decision

We implemented a defense-in-depth URL validation system in the HTTP adapter that validates URLs before any network I/O occurs.

### Validation Layers

**1. Scheme Validation**
Only HTTP and HTTPS are permitted. Blocks `ftp://`, `file://`, `gopher://`, and other protocol handlers.

**2. Hostname Blocking (Pre-DNS)**
Blocks well-known internal hostnames before DNS resolution:
- `localhost`, `localhost.localdomain`
- `*.localhost` subdomains

**3. IP Address Validation**
Blocks requests to private, reserved, and internal IP ranges:

| Range | Purpose |
|-------|---------|
| `127.0.0.0/8` | Loopback |
| `10.0.0.0/8` | Private (RFC 1918) |
| `172.16.0.0/12` | Private (RFC 1918) |
| `192.168.0.0/16` | Private (RFC 1918) |
| `169.254.0.0/16` | Link-local / cloud metadata |
| `0.0.0.0/8` | Unspecified |
| `255.255.255.255` | Broadcast |
| `::1` | IPv6 loopback |
| `fe80::/10` | IPv6 link-local |
| `fc00::/7` | IPv6 unique local |
| `::ffff:0:0/96` | IPv4-mapped IPv6 |

**4. DNS Resolution Validation**
After hostname validation, the resolver performs DNS lookup and validates all resolved IP addresses against the blocked ranges. This catches:
- Hostnames that resolve to internal IPs (e.g., `internal.evil.com → 127.0.0.1`)
- DNS rebinding attacks
- Dual-stack hosts where only one address is internal

### Fail-Closed Design

- Invalid or unparseable IPs are treated as blocked
- If any resolved address is blocked, the entire URL is rejected
- Custom `UrlNotAllowedError` provides clear rejection reasons for logging

### Integration

Validation is called in `HttpDispatcher.dispatch()` before `fetch()`:

```typescript
try {
  await assertUrlAllowed(ep.url);
} catch (error) {
  if (error instanceof UrlNotAllowedError) {
    return { status: "failed", durationMs: 0, errorMessage: error.message };
  }
  throw error;
}
```

Failed validation returns a failed run result — the request is never made.

## Consequences

### Benefits

- Blocks all known SSRF vectors (private IPs, cloud metadata, localhost, non-HTTP schemes)
- Defense-in-depth: multiple validation layers catch different attack patterns
- DNS resolution check prevents rebinding and internal hostname attacks
- Fail-closed: unknown or malformed addresses are blocked by default
- Injectable DNS resolver enables deterministic testing

### Trade-offs

- Legitimate internal-network use cases are blocked (users cannot schedule requests to private IPs)
- DNS resolution adds latency to the first request validation (subsequent requests cached by OS)
- No allowlist mechanism yet for trusted internal endpoints

### Files Affected

**Adapter Layer:**
- `packages/adapter-http/src/url-validator.ts` - Core validation logic (new)
- `packages/adapter-http/src/__tests__/url-validator.test.ts` - Comprehensive test suite (new, 713+ lines)
- `packages/adapter-http/src/http-dispatcher.ts` - Integrated validation before fetch
- `packages/adapter-http/src/index.ts` - Exported validation functions and types

## References

- ADR-0002: Hexagonal Architecture Principles (validation lives in adapter, not domain)
- OWASP SSRF Prevention Cheat Sheet
