import type { Context, Next } from "hono";

type SecurityHeadersOptions = {
  enableHsts: boolean;
};

/** Paths that serve HTML pages needing external scripts/styles (e.g. Scalar API reference). */
const DOCS_PATHS = ["/reference", "/doc"];

/** CSP for JSON API responses — fully locked down. */
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

/** CSP for documentation/reference HTML pages — allows Scalar CDN assets. */
const DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Creates a Hono middleware that sets HTTP security headers on every response.
 *
 * Headers applied:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 0 (disabled; CSP is the modern solution)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Content-Security-Policy: strict for API, relaxed for docs pages
 * - Permissions-Policy: camera=(), microphone=(), geolocation=()
 * - Strict-Transport-Security (production only, controlled via enableHsts)
 */
export function securityHeadersMiddleware(options: SecurityHeadersOptions) {
  return async (c: Context, next: Next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "0");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    const isDocsPath = DOCS_PATHS.some(p => c.req.path.endsWith(p));
    c.header("Content-Security-Policy", isDocsPath ? DOCS_CSP : API_CSP);

    if (options.enableHsts) {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    await next();
  };
}
