import type { JobEndpoint } from "@cronicorn/domain";

import type { JobResponse } from "./jobs.schemas.js";

/**
 * Maps a domain JobEndpoint entity to an API JobResponse DTO.
 *
 * Handles all optional fields and Date → ISO string conversions.
 * Reusable across all CRUD handlers (create, get, list, update).
 */
export function mapEndpointToResponse(endpoint: JobEndpoint): JobResponse {
  return {
    id: endpoint.id,
    name: endpoint.name,
    baselineCron: endpoint.baselineCron,
    baselineIntervalMs: endpoint.baselineIntervalMs,
    minIntervalMs: endpoint.minIntervalMs,
    maxIntervalMs: endpoint.maxIntervalMs,
    nextRunAt: endpoint.nextRunAt.toISOString(),
    lastRunAt: endpoint.lastRunAt?.toISOString(),
    failureCount: endpoint.failureCount,
    pausedUntil: endpoint.pausedUntil?.toISOString(),
    url: endpoint.url,
    method: endpoint.method,
    headersJson: endpoint.headersJson,
    bodyJson: endpoint.bodyJson,
    timeoutMs: endpoint.timeoutMs,
  };
}
