/**
 * HTTP API Client Adapter (Hexagonal Architecture)
 *
 * Concrete implementation of ApiClient using native fetch.
 * This is an "adapter" - infrastructure implementation of the port.
 */

import type { ApiClient } from "../ports/api-client.js";

import { deleteCredentials } from "../auth/token-store.js";
import { ApiError } from "../ports/api-client.js";

/**
 * Configuration for the HTTP API client
 */
export type HttpApiClientConfig = {
  /** Base URL for the API (e.g., "https://cronicorn.com") */
  baseUrl: string;
  /** OAuth access token for authentication (from device flow) */
  accessToken: string;
};

/**
 * Creates an authenticated HTTP API client
 *
 * @param config - Client configuration
 * @returns ApiClient implementation using fetch
 *
 * @example
 * ```typescript
 * const client = createHttpApiClient({
 *   baseUrl: "https://cronicorn.com",
 *   accessToken: credentials.access_token
 * });
 *
 * const job = await client.fetch<JobResponse>("/jobs/123");
 * ```
 */
export function createHttpApiClient(config: HttpApiClientConfig): ApiClient {
  const { baseUrl, accessToken } = config;

  return {
    async fetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
      const url = `${baseUrl}${path}`;
      const headers = {
        ...options.headers,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorText = await response.text();

        // If we get a 401 Unauthorized, the token is invalid
        // Automatically clear credentials and provide helpful error message
        if (response.status === 401) {
          console.error("⚠️  Token is invalid (401 Unauthorized). Clearing credentials...");
          await deleteCredentials();
          throw new ApiError(
            401,
            `Authentication failed. Invalid or expired token. Please restart the MCP server to re-authenticate.`,
          );
        }

        throw new ApiError(
          response.status,
          `API Error (${response.status}): ${errorText}`,
        );
      }

      // Handle 204 No Content responses (no body to parse)
      if (response.status === 204) {
        // 204 responses have no content, return empty object
        return Object.create(null);
      }

      return response.json();
    },
  };
}
