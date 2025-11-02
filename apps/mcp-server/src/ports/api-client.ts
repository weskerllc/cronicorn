/**
 * API Client Port (Hexagonal Architecture)
 *
 * Defines the interface for HTTP communication with the Cronicorn API.
 * This is a "port" - the boundary between domain logic and infrastructure.
 */

/**
 * API client interface for making authenticated HTTP requests
 */
export type ApiClient = {
  /**
   * Make an authenticated HTTP request to the API
   * @param path - API path (e.g., "/jobs", "/jobs/:id/endpoints")
   * @param options - Standard fetch options
   * @returns Parsed JSON response
   * @throws {ApiError} When response is not ok
   */
  fetch: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
};

/**
 * API error with status code and message
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
