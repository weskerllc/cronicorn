import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerSetupFirstJobPrompt } from "./setup-first-job.js";
import { registerTroubleshootFailuresPrompt } from "./troubleshoot-failures.js";

/**
 * Register all prompts with the MCP server.
 * Prompts are user-triggered conversation starters (slash commands)
 * that guide AI assistants through specific workflows.
 */
export function registerPrompts(server: McpServer): void {
  registerSetupFirstJobPrompt(server);
  registerTroubleshootFailuresPrompt(server);
}
