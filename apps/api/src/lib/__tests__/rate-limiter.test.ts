import { Hono } from "hono";
import { describe } from "vitest";

import { createRateLimiter, createRateLimitMiddleware, RateLimiter } from "../rate-limiter.js";
import { expect, test } from "./fixtures.js";

/**
 * Unit tests for the sliding-window rate limiter.
 *
 * Tests cover:
 * - Basic rate limiting functionality
 * - 429 response when limit exceeded
 * - Sliding window algorithm behavior
 * - Middleware integration with Hono
 * - Rate limit headers
 */

// Helper to safely extract JSON from response
// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

describe("RateLimiter", () => {
  describe("check()", () => {
    test("allows requests under the limit", async () => {
      const limiter = createRateLimiter(5);

      for (let i = 0; i < 5; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(i + 1);
        expect(result.limit).toBe(5);
      }
    });

    test("blocks requests when limit is exceeded", async () => {
      const limiter = createRateLimiter(3);

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(3);
    });

    test("tracks different users independently", async () => {
      const limiter = createRateLimiter(2);

      // User 1 hits limit
      limiter.check("user-1");
      limiter.check("user-1");
      const user1Result = limiter.check("user-1");
      expect(user1Result.allowed).toBe(false);

      // User 2 should still be allowed
      const user2Result = limiter.check("user-2");
      expect(user2Result.allowed).toBe(true);
    });

    test("returns resetInSeconds for retry timing", async () => {
      const mockTime = 30_000; // 30 seconds into a minute
      const limiter = createRateLimiter(1, { now: () => mockTime });

      limiter.check("user-1");
      const result = limiter.check("user-1");

      expect(result.allowed).toBe(false);
      expect(result.resetInSeconds).toBeGreaterThan(0);
      expect(result.resetInSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe("sliding window algorithm", () => {
    test("carries over previous window counts with decay", async () => {
      // Test the sliding window interpolation
      // Window boundaries: 0-59999ms = window 0, 60000-119999ms = window 1, etc.
      let currentTime = 0; // Start at window 0
      const limiter = createRateLimiter(10, {
        windowMs: 60_000,
        now: () => currentTime,
      });

      // Fill up window 0 with 10 requests (at limit)
      for (let i = 0; i < 10; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
      }

      // Verify we're now at limit
      expect(limiter.check("user-1").allowed).toBe(false);

      // Move to new window 1, halfway through (30 seconds into 60s window)
      currentTime = 90_000; // 30s into window 1 (window 1 starts at 60,000)

      // At 90,000ms, positionInWindow = (90000 - 60000) / 60000 = 0.5
      // Effective count = previousCount * (1 - 0.5) + currentCount = 10 * 0.5 + 0 = 5
      // So we should be able to make requests until effective count reaches 10
      // Since effectiveCount starts at 5, we can make 5 more requests (5 + 5 = 10)

      // Each request increments currentCount, which changes effectiveCount calculation:
      // After request 1: effectiveCount = floor(10 * 0.5 + 0) = 5, allowed, then currentCount = 1
      // After request 2: effectiveCount = floor(10 * 0.5 + 1) = 6, allowed, then currentCount = 2
      // ... etc until effectiveCount >= 10

      // Let's verify - 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked (effectiveCount = floor(10*0.5 + 5) = 10)
      const blocked = limiter.check("user-1");
      expect(blocked.allowed).toBe(false);
    });

    test("fully resets after two windows have passed", async () => {
      let currentTime = 0;
      const limiter = createRateLimiter(2, {
        windowMs: 60_000,
        now: () => currentTime,
      });

      // Use up the limit
      limiter.check("user-1");
      limiter.check("user-1");
      expect(limiter.check("user-1").allowed).toBe(false);

      // Skip ahead two full windows
      currentTime = 130_000; // 2+ minutes later

      // Should be fully reset
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });
  });

  describe("peek()", () => {
    test("returns current status without incrementing", async () => {
      const limiter = createRateLimiter(5);

      limiter.check("user-1");
      limiter.check("user-1");

      // Peek should show count of 2 without incrementing
      const peek1 = limiter.peek("user-1");
      expect(peek1.current).toBe(2);

      // Peek again should still show 2
      const peek2 = limiter.peek("user-1");
      expect(peek2.current).toBe(2);

      // Check should now increment to 3
      const checkResult = limiter.check("user-1");
      expect(checkResult.current).toBe(3);
    });

    test("returns allowed status for unknown user", async () => {
      const limiter = createRateLimiter(5);

      const result = limiter.peek("unknown-user");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
    });
  });

  describe("reset() and clear()", () => {
    test("reset() clears data for specific user", async () => {
      const limiter = createRateLimiter(2);

      // Both users hit limit
      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-2");
      limiter.check("user-2");

      // Reset user-1 only
      limiter.reset("user-1");

      // User-1 should be reset
      expect(limiter.check("user-1").allowed).toBe(true);

      // User-2 should still be at limit
      expect(limiter.check("user-2").allowed).toBe(false);
    });

    test("clear() removes all data", async () => {
      const limiter = createRateLimiter(2);

      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-2");
      limiter.check("user-2");

      expect(limiter.size).toBe(2);

      limiter.clear();

      expect(limiter.size).toBe(0);
      expect(limiter.check("user-1").allowed).toBe(true);
      expect(limiter.check("user-2").allowed).toBe(true);
    });
  });

  describe("cleanup()", () => {
    test("removes stale entries", async () => {
      let currentTime = 0;
      const limiter = new RateLimiter({
        limit: 10,
        windowMs: 60_000,
        now: () => currentTime,
      });

      limiter.check("old-user");
      expect(limiter.size).toBe(1);

      // Move time forward past stale threshold (2+ windows)
      currentTime = 180_000;

      limiter.check("new-user");
      expect(limiter.size).toBe(2);

      // Cleanup should remove old-user
      const cleaned = limiter.cleanup();
      expect(cleaned).toBe(1);
      expect(limiter.size).toBe(1);
    });
  });
});

describe("createRateLimitMiddleware", () => {
  describe("rate limit enforcement", () => {
    test("returns 429 when mutation limit is exceeded", async () => {
      let currentTime = 0;
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 3,
        readLimit: 10,
        now: () => currentTime,
      });

      const app = new Hono();

      // Simulate auth middleware setting userId
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.post("/api/test", c => c.json({ ok: true }));

      // First 3 POST requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.request("/api/test", { method: "POST" });
        expect(res.status).toBe(200);
      }

      // 4th POST request should be rate limited
      const res = await app.request("/api/test", { method: "POST" });
      expect(res.status).toBe(429);

      const body = await getJson(res);
      expect(body.error).toBe("Too many requests");
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    test("returns 429 when read limit is exceeded", async () => {
      let currentTime = 0;
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 3,
        now: () => currentTime,
      });

      const app = new Hono();

      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      // First 3 GET requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.request("/api/test", { method: "GET" });
        expect(res.status).toBe(200);
      }

      // 4th GET request should be rate limited
      const res = await app.request("/api/test", { method: "GET" });
      expect(res.status).toBe(429);
    });

    test("applies different limits for mutations vs reads", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 2, // Very low for mutations
        readLimit: 5, // Higher for reads
      });

      const app = new Hono();

      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));
      app.post("/api/test", c => c.json({ ok: true }));
      app.patch("/api/test", c => c.json({ ok: true }));
      app.delete("/api/test", c => c.json({ ok: true }));

      // Exhaust mutation limit
      await app.request("/api/test", { method: "POST" });
      await app.request("/api/test", { method: "POST" });

      // Mutations should be blocked
      expect((await app.request("/api/test", { method: "POST" })).status).toBe(429);
      expect((await app.request("/api/test", { method: "PATCH" })).status).toBe(429);
      expect((await app.request("/api/test", { method: "DELETE" })).status).toBe(429);

      // Reads should still work
      expect((await app.request("/api/test", { method: "GET" })).status).toBe(200);
    });
  });

  describe("rate limit headers", () => {
    test("includes X-RateLimit headers on successful requests", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 60,
        readLimit: 120,
      });

      const app = new Hono();

      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      const res = await app.request("/api/test", { method: "GET" });

      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    test("includes Retry-After header on 429 response", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 1,
        readLimit: 1,
      });

      const app = new Hono();

      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      // Exhaust limit
      await app.request("/api/test", { method: "GET" });

      // Check 429 response
      const res = await app.request("/api/test", { method: "GET" });

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(Number.parseInt(res.headers.get("Retry-After")!)).toBeGreaterThan(0);
    });

    test("X-RateLimit-Remaining decrements with each request", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 60,
        readLimit: 5,
      });

      const app = new Hono();

      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      const res1 = await app.request("/api/test", { method: "GET" });
      expect(res1.headers.get("X-RateLimit-Remaining")).toBe("4");

      const res2 = await app.request("/api/test", { method: "GET" });
      expect(res2.headers.get("X-RateLimit-Remaining")).toBe("3");

      const res3 = await app.request("/api/test", { method: "GET" });
      expect(res3.headers.get("X-RateLimit-Remaining")).toBe("2");
    });
  });

  describe("authentication handling", () => {
    test("skips rate limiting when userId is not set", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 1,
        readLimit: 1,
      });

      const app = new Hono();

      // NO userId set in context
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      // Should never be rate limited without userId
      for (let i = 0; i < 10; i++) {
        const res = await app.request("/api/test", { method: "GET" });
        expect(res.status).toBe(200);
      }
    });

    test("tracks rate limits per user independently", async () => {
      const { rateLimitMiddleware } = createRateLimitMiddleware({
        mutationLimit: 2,
        readLimit: 2,
      });

      const app = new Hono<{ Variables: { userId: string } }>();

      // Dynamic userId based on header (simulating different users)
      app.use("/*", async (c, next) => {
        const userId = c.req.header("X-User-ID");
        if (userId) {
          c.set("userId", userId);
        }
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      // User A exhausts limit
      await app.request("/api/test", { method: "GET", headers: { "X-User-ID": "user-a" } });
      await app.request("/api/test", { method: "GET", headers: { "X-User-ID": "user-a" } });

      // User A is blocked
      const resA = await app.request("/api/test", { method: "GET", headers: { "X-User-ID": "user-a" } });
      expect(resA.status).toBe(429);

      // User B should still be allowed
      const resB = await app.request("/api/test", { method: "GET", headers: { "X-User-ID": "user-b" } });
      expect(resB.status).toBe(200);
    });
  });

  describe("HTTP method classification", () => {
    test("classifies POST as mutation", async () => {
      const { rateLimitMiddleware, mutationLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.post("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "POST" });

      expect(mutationLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies PATCH as mutation", async () => {
      const { rateLimitMiddleware, mutationLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.patch("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "PATCH" });

      expect(mutationLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies DELETE as mutation", async () => {
      const { rateLimitMiddleware, mutationLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.delete("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "DELETE" });

      expect(mutationLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies PUT as mutation", async () => {
      const { rateLimitMiddleware, mutationLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.put("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "PUT" });

      expect(mutationLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies GET as read", async () => {
      const { rateLimitMiddleware, readLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "GET" });

      expect(readLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies HEAD as read", async () => {
      const { rateLimitMiddleware, readLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.get("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "HEAD" });

      expect(readLimiter.peek("test-user").current).toBe(1);
    });

    test("classifies OPTIONS as read", async () => {
      const { rateLimitMiddleware, readLimiter } = createRateLimitMiddleware({
        mutationLimit: 10,
        readLimit: 10,
      });

      const app = new Hono();
      app.use("/*", async (c, next) => {
        c.set("userId", "test-user");
        return next();
      });
      app.use("/*", rateLimitMiddleware);
      app.options("/api/test", c => c.json({ ok: true }));

      await app.request("/api/test", { method: "OPTIONS" });

      expect(readLimiter.peek("test-user").current).toBe(1);
    });
  });
});
