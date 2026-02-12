import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { securityHeadersMiddleware } from "../security-headers.js";

describe("securityHeadersMiddleware", () => {
  it("sets all security headers on responses", async () => {
    const app = new Hono();
    app.use("*", securityHeadersMiddleware({ enableHsts: false }));
    app.get("/test", c => c.json({ ok: true }));

    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-XSS-Protection")).toBe("0");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Content-Security-Policy")).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("does not set HSTS when enableHsts is false", async () => {
    const app = new Hono();
    app.use("*", securityHeadersMiddleware({ enableHsts: false }));
    app.get("/test", c => c.json({ ok: true }));

    const res = await app.request("/test");

    expect(res.headers.get("Strict-Transport-Security")).toBeNull();
  });

  it("sets HSTS when enableHsts is true", async () => {
    const app = new Hono();
    app.use("*", securityHeadersMiddleware({ enableHsts: true }));
    app.get("/test", c => c.json({ ok: true }));

    const res = await app.request("/test");

    expect(res.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });
});
