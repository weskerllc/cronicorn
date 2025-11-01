/**
 * HTTP API Client Adapter (Hexagonal Architecture)
 *
 * Concrete implementation of ApiClient using native fetch.
 * This is an "adapter" - infrastructure implementation of the port.
 */

import type { ApiClient } from "../ports/api-client.js";

import { ApiError } from "../ports/api-client.js";

/**
 * Configuration for the HTTP API client
 */
export type HttpApiClientConfig = {
    /** Base URL for the API (e.g., "https://api.cronicorn.com") */
    baseUrl: string;
    /** OAuth access token for authentication */
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
 *   baseUrl: "https://api.cronicorn.com",
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
                throw new ApiError(
                    response.status,
                    `API Error (${response.status}): ${errorText}`,
                );
            }

            return response.json();
        },
    };
}
