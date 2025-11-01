/**
 * MCP Tool Registry
 *
 * Registers all tools available to AI agents
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Credentials } from "../auth/token-store.js";

import { createHttpApiClient } from "../adapters/http-api-client.js";
import { registerPostJobs } from "./api/post-jobs.js";

export function registerTools(
    server: McpServer,
    apiUrl: string,
    credentials: Credentials,
): void {
    // Create authenticated API client (Dependency Injection)
    const apiClient = createHttpApiClient({
        baseUrl: apiUrl,
        accessToken: credentials.access_token,
    });

    // Register all tools
    // New 1:1 API endpoints (testing pattern)
    registerPostJobs(server, apiClient);
}
