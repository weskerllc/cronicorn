/**
 * MCP Tool Registry
 *
 * Registers all tools available to AI agents
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Credentials } from "../auth/token-store.js";

import { createHttpApiClient } from "../adapters/http-api-client.js";
import { registerDeleteEndpoint } from "./api/delete-endpoint.js";
import { registerDeleteHints } from "./api/delete-hints.js";
import { registerDeleteJob } from "./api/delete-job.js";
import { registerGetDashboardStats } from "./api/get-dashboard-stats.js";
import { registerGetEndpointHealth } from "./api/get-endpoint-health.js";
import { registerGetEndpointRuns } from "./api/get-endpoint-runs.js";
import { registerGetEndpoint } from "./api/get-endpoint.js";
import { registerGetJob } from "./api/get-job.js";
import { registerGetRunDetails } from "./api/get-run-details.js";
import { registerListEndpoints } from "./api/list-endpoints.js";
import { registerListJobs } from "./api/list-jobs.js";
import { registerPatchEndpoint } from "./api/patch-endpoint.js";
import { registerPatchJob } from "./api/patch-job.js";
import { registerPostEndpointPause } from "./api/post-endpoint-pause.js";
import { registerPostEndpoint } from "./api/post-endpoint.js";
import { registerPostIntervalHint } from "./api/post-interval-hint.js";
import { registerPauseJob } from "./api/post-job-pause.js";
import { registerResumeJob } from "./api/post-job-resume.js";
import { registerPostJobs } from "./api/post-jobs.js";
import { registerPostOneShotHint } from "./api/post-oneshot-hint.js";
import { registerPostResetFailures } from "./api/post-reset-failures.js";

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
  // Job Lifecycle
  registerPostJobs(server, apiClient);
  registerGetJob(server, apiClient);
  registerListJobs(server, apiClient);
  registerPatchJob(server, apiClient);
  registerDeleteJob(server, apiClient);
  registerPauseJob(server, apiClient);
  registerResumeJob(server, apiClient);

  // Endpoints
  registerPostEndpoint(server, apiClient);
  registerGetEndpoint(server, apiClient);
  registerListEndpoints(server, apiClient);
  registerPatchEndpoint(server, apiClient);
  registerDeleteEndpoint(server, apiClient);

  // Adaptive Scheduling
  registerPostIntervalHint(server, apiClient);
  registerPostOneShotHint(server, apiClient);
  registerPostEndpointPause(server, apiClient);
  registerDeleteHints(server, apiClient);
  registerPostResetFailures(server, apiClient);

  // Execution Visibility
  registerGetEndpointRuns(server, apiClient);
  registerGetRunDetails(server, apiClient);
  registerGetEndpointHealth(server, apiClient);

  // Dashboard
  registerGetDashboardStats(server, apiClient);
}
