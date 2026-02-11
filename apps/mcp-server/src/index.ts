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
import { deleteCredentials, getCredentials, isTokenExpired } from "./auth/token-store.js";
import { loadConfig } from "./env.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

async function main() {
  // Load configuration
  const env = loadConfig();
  console.error(`🔧 Config loaded:`, JSON.stringify(env, null, 2));

  // Initialize MCP server
  const server = new McpServer(
    {
      name: "cronicorn",
      // eslint-disable-next-line node/no-process-env
      version: process.env.PKG_VERSION ?? "0.0.0",
    },
    {
      instructions: [
        "Cronicorn is an adaptive HTTP job scheduler. It executes HTTP requests on a schedule and optionally uses AI to adjust frequency based on response data.",
        "",
        "## Core Concepts",
        "",
        "- **Job**: A container that groups related endpoints (e.g., \"Payment Monitoring\").",
        "- **Endpoint**: An HTTP request (URL + method + headers) executed on a baseline schedule — either a cron expression or an interval in milliseconds.",
        "- **AI Adaptation**: An endpoint's `description` field is plain English that tells the AI what to look for in HTTP response bodies. Example: \"Poll faster when error_rate_pct > 5%. Return to baseline when < 2%.\" The AI reads the actual response JSON and adjusts scheduling accordingly.",
        "- **Safety Constraints**: `minIntervalMs` and `maxIntervalMs` are hard limits the AI cannot exceed. Always set these.",
        "- **Hints**: Temporary schedule overrides (interval adjustments or one-shot runs) that auto-expire via TTL, then revert to baseline.",
        "",
        "## How to Help Users",
        "",
        "When users ask about Cronicorn concepts, integration patterns, self-hosting, or how scheduling works, read the bundled documentation resources on this server. Use the `file:///docs/` URI scheme to read resources. Key resources:",
        "",
        "- `file:///docs/introduction.md` — What Cronicorn is and why it exists",
        "- `file:///docs/quick-start.md` — Creating your first job",
        "- `file:///docs/core-concepts.md` — Jobs, endpoints, schedules, AI adaptation explained",
        "- `file:///docs/recipes.md` — Common patterns with working examples",
        "- `file:///docs/use-cases.md` — Real-world scenarios (health checks, data sync, auto-remediation)",
        "- `file:///docs/api-reference.md` — Complete REST API documentation",
        "- `file:///docs/code-examples.md` — Integration examples in multiple languages",
        "- `file:///docs/troubleshooting.md` — Common issues and solutions",
        "- `file:///docs/technical/how-ai-adaptation-works.md` — Deep dive into AI scheduling",
        "- `file:///docs/technical/how-scheduling-works.md` — Scheduling mechanics and backoff behavior",
        "- `file:///docs/self-hosting/index.md` — Docker Compose deployment guide",
        "",
        "Read the relevant resources before answering conceptual or integration questions. The docs are comprehensive — use them.",
      ].join("\n"),
    },
  );

  // Check for existing credentials, or initiate device flow
  let credentials = await getCredentials();
  if (!credentials || isTokenExpired(credentials)) {
    if (credentials && isTokenExpired(credentials)) {
      const expiresAtDate = new Date(credentials.expires_at);
      console.error(`⚠️  Token expired at ${expiresAtDate.toISOString()}`);
      console.error("Clearing expired credentials and starting re-authentication...");
      await deleteCredentials();
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
