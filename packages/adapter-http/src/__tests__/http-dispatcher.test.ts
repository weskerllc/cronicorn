import type { JobEndpoint } from "@cronicorn/domain";

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { HttpDispatcher } from "../http-dispatcher.js";

// Setup MSW server for HTTP mocking
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper to create a minimal endpoint for testing
function createEndpoint(overrides: Partial<JobEndpoint> = {}): JobEndpoint {
  return {
    id: "ep-1",
    jobId: "job-1",
    tenantId: "tenant-1",
    name: "Test Endpoint",
    nextRunAt: new Date(),
    failureCount: 0,
    url: "http://example.com/webhook",
    method: "POST",
    ...overrides,
  };
}

describe("httpDispatcher", () => {
  const dispatcher = new HttpDispatcher();

  describe("success cases", () => {
    it("returns success for 200 response", async () => {
      server.use(
        http.post("http://example.com/webhook", () => HttpResponse.json({ ok: true })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it("returns success for 201 response", async () => {
      server.use(
        http.post("http://example.com/webhook", () => new HttpResponse(null, { status: 201 })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it("defaults method to GET when not specified", async () => {
      server.use(
        http.get("http://example.com/webhook", () => HttpResponse.json({ ok: true })),
      );

      const result = await dispatcher.execute(
        createEndpoint({ method: undefined }),
      );

      expect(result.status).toBe("success");
    });
  });

  describe("http error responses", () => {
    it("returns failure for 404 response", async () => {
      server.use(
        http.post("http://example.com/webhook", () => new HttpResponse(null, { status: 404, statusText: "Not Found" })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("failed");
      expect(result.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 for very fast responses
      expect(result.errorMessage).toBe("HTTP 404 Not Found");
    });

    it("returns failure for 500 response", async () => {
      server.use(
        http.post("http://example.com/webhook", () => new HttpResponse(null, { status: 500, statusText: "Internal Server Error" })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("failed");
      expect(result.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 for very fast responses
      expect(result.errorMessage).toBe("HTTP 500 Internal Server Error");
    });
  });

  describe("network errors", () => {
    it("returns failure with error message on network error", async () => {
      server.use(
        http.post("http://example.com/webhook", () => HttpResponse.error()),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("failed");
      expect(result.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 for very fast responses
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe("timeout handling", () => {
    it("returns timeout error when request exceeds timeout", async () => {
      server.use(
        http.post("http://example.com/webhook", async () => {
          // Delay longer than timeout
          await new Promise(resolve => setTimeout(resolve, 2000));
          return HttpResponse.json({ ok: true });
        }),
      );

      const result = await dispatcher.execute(
        createEndpoint({ timeoutMs: 100 }),
      );

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toContain("timed out");
      // Timeout is clamped to 1000ms minimum
      expect(result.errorMessage).toContain("1000ms");
    });

    it("clamps timeout to minimum 1000ms", async () => {
      server.use(
        http.post("http://example.com/webhook", async () => {
          // Delay longer than requested but less than clamped
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ ok: true });
        }),
      );

      // Request 0ms timeout, should be clamped to 1000ms
      const result = await dispatcher.execute(
        createEndpoint({ timeoutMs: 0 }),
      );

      // Should succeed because delay (500ms) < clamped timeout (1000ms)
      expect(result.status).toBe("success");
    });
  });

  describe("url validation", () => {
    it("returns failure when URL is missing", async () => {
      const result = await dispatcher.execute(
        createEndpoint({ url: undefined }),
      );

      expect(result.status).toBe("failed");
      expect(result.durationMs).toBe(0);
      expect(result.errorMessage).toBe("No URL configured for endpoint");
    });
  });

  describe("headers handling", () => {
    it("auto-adds Content-Type when bodyJson is present", async () => {
      let receivedHeaders: Headers | undefined;

      server.use(
        http.post("http://example.com/webhook", async ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json({ ok: true });
        }),
      );

      await dispatcher.execute(
        createEndpoint({
          bodyJson: { test: "data" },
          headersJson: {},
        }),
      );

      expect(receivedHeaders?.get("content-type")).toBe("application/json");
    });

    it("does not override user-provided Content-Type", async () => {
      let receivedHeaders: Headers | undefined;

      server.use(
        http.post("http://example.com/webhook", async ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json({ ok: true });
        }),
      );

      await dispatcher.execute(
        createEndpoint({
          bodyJson: { test: "data" },
          headersJson: { "content-type": "application/x-custom" },
        }),
      );

      expect(receivedHeaders?.get("content-type")).toBe("application/x-custom");
    });
  });

  describe("body handling", () => {
    it("excludes body for GET requests", async () => {
      let receivedBody: string | null = null;

      server.use(
        http.get("http://example.com/webhook", async ({ request }) => {
          receivedBody = await request.text();
          return HttpResponse.json({ ok: true });
        }),
      );

      await dispatcher.execute(
        createEndpoint({
          method: "GET",
          bodyJson: { should: "be ignored" },
        }),
      );

      expect(receivedBody).toBe("");
    });

    it("includes body for POST requests", async () => {
      let receivedBody: string | null = null;

      server.use(
        http.post("http://example.com/webhook", async ({ request }) => {
          receivedBody = await request.text();
          return HttpResponse.json({ ok: true });
        }),
      );

      await dispatcher.execute(
        createEndpoint({
          method: "POST",
          bodyJson: { test: "data" },
        }),
      );

      expect(receivedBody).toBe("{\"test\":\"data\"}");
    });
  });

  describe("duration measurement", () => {
    it("measures duration correctly", async () => {
      server.use(
        http.post("http://example.com/webhook", async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return HttpResponse.json({ ok: true });
        }),
      );

      const result = await dispatcher.execute(createEndpoint());

      // Duration should be at least 50ms (the delay we added)
      expect(result.durationMs).toBeGreaterThanOrEqual(40); // Allow some tolerance
      expect(result.durationMs).toBeLessThan(200); // Sanity check
    });
  });

  describe("response body capture", () => {
    it("captures JSON response body and status code on success", async () => {
      const responseData = { status: "ok", count: 42 };

      server.use(
        http.post("http://example.com/webhook", () => HttpResponse.json(responseData)),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toEqual(responseData);
    });

    it("captures JSON response body on error responses", async () => {
      const errorData = { error: "Not found", code: "RESOURCE_MISSING" };

      server.use(
        http.post("http://example.com/webhook", () =>
          HttpResponse.json(errorData, { status: 404 })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("failed");
      expect(result.statusCode).toBe(404);
      expect(result.responseBody).toEqual(errorData);
      expect(result.errorMessage).toBe("HTTP 404 Not Found");
    });

    it("skips response body for non-JSON Content-Type", async () => {
      server.use(
        http.post("http://example.com/webhook", () =>
          new HttpResponse("<html>OK</html>", {
            status: 200,
            headers: { "Content-Type": "text/html" },
          })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBeUndefined();
    });

    it("enforces size limit using Content-Length header", async () => {
      // Create response body that's 101KB (exceeds 100KB default limit)
      const largeBody = { data: "x".repeat(101 * 1024) };

      server.use(
        http.post("http://example.com/webhook", () =>
          HttpResponse.json(largeBody, {
            headers: {
              "Content-Length": String(JSON.stringify(largeBody).length),
            },
          })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBeUndefined(); // Should be skipped due to size
    });

    it("enforces size limit by checking actual body size", async () => {
      // Create response body that's 101KB (exceeds 100KB default limit)
      const largeBody = { data: "x".repeat(101 * 1024) };

      server.use(
        http.post("http://example.com/webhook", () =>
          // Don't set Content-Length to test fallback size check
          HttpResponse.json(largeBody)),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBeUndefined(); // Should be skipped due to size
    });

    it("respects custom maxResponseSizeKb limit", async () => {
      // Create response body that's 50KB
      const mediumBody = { data: "x".repeat(50 * 1024) };

      server.use(
        http.post("http://example.com/webhook", () => HttpResponse.json(mediumBody)),
      );

      // Set limit to 25KB - body should be rejected
      const result = await dispatcher.execute(
        createEndpoint({ maxResponseSizeKb: 25 }),
      );

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBeUndefined(); // Should be skipped due to size
    });

    it("captures response body within size limit", async () => {
      // Create response body that's ~10KB (within 100KB default)
      const smallBody = { data: "x".repeat(10 * 1024), status: "ok" };

      server.use(
        http.post("http://example.com/webhook", () => HttpResponse.json(smallBody)),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toEqual(smallBody);
    });

    it("skips response body when JSON parse fails", async () => {
      server.use(
        http.post("http://example.com/webhook", () =>
          new HttpResponse("{invalid json}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBeUndefined(); // Parse failed, skipped
    });

    it("handles Content-Type with charset parameter", async () => {
      const responseData = { message: "hello" };

      server.use(
        http.post("http://example.com/webhook", () =>
          HttpResponse.json(responseData, {
            headers: { "Content-Type": "application/json; charset=utf-8" },
          })),
      );

      const result = await dispatcher.execute(createEndpoint());

      expect(result.status).toBe("success");
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toEqual(responseData);
    });

    it("captures various JSON data types", async () => {
      const testCases = [
        { input: null, expected: null },
        { input: true, expected: true },
        { input: 42, expected: 42 },
        { input: "string", expected: "string" },
        { input: [1, 2, 3], expected: [1, 2, 3] },
        { input: { nested: { obj: "value" } }, expected: { nested: { obj: "value" } } },
      ];

      for (const { input, expected } of testCases) {
        server.use(
          http.post("http://example.com/webhook", () => HttpResponse.json(input)),
        );

        const result = await dispatcher.execute(createEndpoint());

        expect(result.responseBody).toEqual(expected);
      }
    });
  });
});
