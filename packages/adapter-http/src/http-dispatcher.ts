import type { Dispatcher, ExecutionResult, JobEndpoint, JsonValue } from "@cronicorn/domain";

/**
 * Production HTTP dispatcher using Node.js native fetch API.
 *
 * Design decisions:
 * - Uses AbortController for timeout handling (proper request cancellation)
 * - Does NOT retry (scheduler handles retries via failureCount)
 * - Stores JSON response bodies (for AI query tools) with size limits
 * - Auto-adds Content-Type: application/json when bodyJson present
 * - Measures duration from request start to response headers (precise timing)
 */
export class HttpDispatcher implements Dispatcher {
  /** Default response size limit: 100 KB */
  private static readonly DEFAULT_MAX_RESPONSE_SIZE_KB = 100;
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

      // Capture response body if JSON and within size limits
      const { responseBody, statusCode } = await this.captureResponse(response, ep);

      // Determine success/failure based on HTTP status
      if (response.ok) {
        return { status: "success", durationMs, statusCode, responseBody };
      }

      return {
        status: "failed",
        durationMs,
        statusCode,
        responseBody,
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

  /**
   * Captures response body and status code from HTTP response.
   *
   * Behavior:
   * - Always captures statusCode
   * - Only captures responseBody if:
   *   1. Content-Type is application/json (or variant)
   *   2. Body size is within limits (maxResponseSizeKb, default 100KB)
   *   3. Body parses successfully as JSON
   * - Silently skips response body storage on errors (non-JSON, oversized, parse errors)
   *
   * @param response Fetch Response object
   * @param ep JobEndpoint (for maxResponseSizeKb config)
   * @returns Object with statusCode (always) and responseBody (conditional)
   */
  private async captureResponse(
    response: Response,
    ep: JobEndpoint,
  ): Promise<{ statusCode: number; responseBody?: JsonValue }> {
    const statusCode = response.status;

    // Check Content-Type header
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!isJson) {
      // Not JSON - skip response body storage
      return { statusCode };
    }

    // Determine size limit
    const maxSizeKb = ep.maxResponseSizeKb ?? HttpDispatcher.DEFAULT_MAX_RESPONSE_SIZE_KB;
    const maxSizeBytes = maxSizeKb * 1024;

    // Check Content-Length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = Number.parseInt(contentLength, 10);
      if (sizeBytes > maxSizeBytes) {
        // Response too large - skip storage
        return { statusCode };
      }
    }

    try {
      // Read response body as text first to check size
      const bodyText = await response.text();

      // Check actual size
      const actualSizeBytes = new TextEncoder().encode(bodyText).length;
      if (actualSizeBytes > maxSizeBytes) {
        // Actual response too large - skip storage
        return { statusCode };
      }

      // Parse JSON safely
      const responseBody = JSON.parse(bodyText);
      return { statusCode, responseBody };
    }
    catch {
      // JSON parse error or read error - skip storage
      return { statusCode };
    }
  }
}
