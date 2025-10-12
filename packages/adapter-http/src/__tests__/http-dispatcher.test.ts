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
});
