import type { Context, Next } from "hono";

type SecurityHeadersOptions = {
  enableHsts: boolean;
};

/**
 * Creates a Hono middleware that sets HTTP security headers on every response.
 *
 * Headers applied:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 0 (disabled; CSP is the modern solution)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Content-Security-Policy: default-src 'none'; frame-ancestors 'none' (API-appropriate)
 * - Permissions-Policy: camera=(), microphone=(), geolocation=()
 * - Strict-Transport-Security (production only, controlled via enableHsts)
 */
export function securityHeadersMiddleware(options: SecurityHeadersOptions) {
  return async (c: Context, next: Next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "0");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (options.enableHsts) {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    await next();
  };
}
