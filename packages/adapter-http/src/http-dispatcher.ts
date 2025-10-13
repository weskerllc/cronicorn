import type { Dispatcher, ExecutionResult, JobEndpoint } from "@cronicorn/domain";

/**
 * Production HTTP dispatcher using Node.js native fetch API.
 *
 * Design decisions:
 * - Uses AbortController for timeout handling (proper request cancellation)
 * - Does NOT retry (scheduler handles retries via failureCount)
 * - Does NOT store response bodies (only status code matters for scheduling)
 * - Auto-adds Content-Type: application/json when bodyJson present
 * - Measures duration from request start to response headers (precise timing)
 */
export class HttpDispatcher implements Dispatcher {
  async execute(ep: JobEndpoint): Promise<ExecutionResult> {
    // Validate URL early
    if (!ep.url) {
      return {
        status: "failed",
        durationMs: 0,
        errorMessage: "No URL configured for endpoint",
      };
    }

    // Clamp timeout to minimum 1000ms (1 second)
    const timeoutMs = Math.max(ep.timeoutMs ?? 30000, 1000);

    // Setup timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Start duration measurement
    const startMs = performance.now();

    try {
      // Build headers
      const headers = new Headers(ep.headersJson ?? {});

      // Auto-add Content-Type if bodyJson present and not already set
      if (ep.bodyJson && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      // Determine if body should be included (not for GET/HEAD)
      const method = ep.method ?? "GET";
      const hasBody = !["GET", "HEAD"].includes(method);
      const body = hasBody && ep.bodyJson ? JSON.stringify(ep.bodyJson) : undefined;

      // Execute request
      const response = await fetch(ep.url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      // Measure duration
      const durationMs = Math.round(performance.now() - startMs);

      // Determine success/failure based on HTTP status
      if (response.ok) {
        return { status: "success", durationMs };
      }

      return {
        status: "failed",
        durationMs,
        errorMessage: `HTTP ${response.status} ${response.statusText}`,
      };
    }
    catch (error) {
      // Clear timeout
      clearTimeout(timeoutId);

      // Measure duration even on error
      const durationMs = Math.round(performance.now() - startMs);

      // Check if it's an AbortError (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "failed",
          durationMs,
          errorMessage: `Request timed out after ${timeoutMs}ms`,
        };
      }

      // Other errors (network, DNS, invalid URL, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: "failed",
        durationMs,
        errorMessage,
      };
    }
  }
}
