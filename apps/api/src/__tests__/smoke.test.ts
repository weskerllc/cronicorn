/**
 * Smoke tests for API endpoints.
 *
 * These tests verify basic endpoint functionality without requiring
 * a full database or auth setup. Focus areas:
 * - Public endpoints (health check, documentation)
 * - OpenAPI spec generation
 * - Basic route structure
 *
 * For full integration testing with auth and database, see integration tests.
 */
import { describe, expect, it } from "vitest";

import { createTestApp } from "./test-helpers.js";

describe("api smoke tests", () => {
    describe("health check", () => {
        it("returns 200 OK without auth", async () => {
            const app = await createTestApp();

            const res = await app.request("/health");

            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toMatchObject({
                status: "ok",
            });
            expect(data.timestamp).toBeDefined();
        });
    });

    describe("openapi documentation", () => {
        it("serves OpenAPI spec at /api/openapi.json", async () => {
            const app = await createTestApp();

            const res = await app.request("/api/openapi.json");

            expect(res.status).toBe(200);

            const spec = await res.json();
            expect(spec.openapi).toBe("3.1.0");
            expect(spec.info.title).toBe("Cronicorn API");
            expect(spec.paths).toBeDefined();
        });

        it("serves Swagger UI at /api/docs", async () => {
            const app = await createTestApp();

            const res = await app.request("/api/docs");

            expect(res.status).toBe(200);

            // Swagger UI returns HTML
            const html = await res.text();
            expect(html).toContain("swagger-ui");
        });
    });
});
