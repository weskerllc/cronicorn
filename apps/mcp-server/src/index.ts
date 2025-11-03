#!/usr/bin/env node

/**
 * Cronicorn MCP Server
 *
 * Provides Model Context Protocol tools for AI agents to manage cron jobs.
 * Uses OAuth 2.0 Device Authorization Grant for authentication.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { authenticate } from "./auth/device-flow.js";
import { getCredentials, isTokenExpired } from "./auth/token-store.js";
import { loadConfig } from "./env.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

async function main() {
  // Load configuration
  const env = loadConfig();
  console.error(`🔧 Config loaded:`, JSON.stringify(env, null, 2));

  // Initialize MCP server
  const server = new McpServer({
    name: "cronicorn",
    version: "0.1.0",
  });

  // Check for existing credentials, or initiate device flow
  let credentials = await getCredentials();
  if (!credentials || isTokenExpired(credentials)) {
    if (credentials && isTokenExpired(credentials)) {
      const expiresAtDate = new Date(credentials.expires_at);
      console.error(`⚠️  Token expired at ${expiresAtDate.toISOString()}`);
      console.error("Starting re-authentication...");
    }
    else {
      console.error("No credentials found. Starting OAuth device authorization...");
    }

    credentials = await authenticate({
      apiUrl: env.CRONICORN_API_URL,
      webUrl: env.CRONICORN_WEB_URL,
    });
    console.error("✅ Authentication successful!");
  }
  else {
    // Valid credentials found - log expiry info
    const expiresAtDate = new Date(credentials.expires_at);
    const daysUntilExpiry = Math.floor((credentials.expires_at - Date.now()) / (1000 * 60 * 60 * 24));
    console.error(`✅ Valid credentials found`);
    console.error(`📅 Token expires: ${expiresAtDate.toISOString()} (in ~${daysUntilExpiry} days)`);
  }

  // Register all tools (create_job, list_jobs, pause_job, get_job_history)
  registerTools(server, env.CRONICORN_API_URL, credentials);

  // Register documentation resources
  await registerResources(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ Cronicorn MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
