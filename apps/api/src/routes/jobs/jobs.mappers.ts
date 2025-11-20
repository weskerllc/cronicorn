import type { Job, JobEndpoint } from "@cronicorn/domain";

import type {
  EndpointResponse,
  HealthSummaryResponse,
  JobResponse,
  JobWithCountResponse,
  ListRunsResponse,
  RunDetailsResponse,
  RunSummaryResponse,
} from "./jobs.schemas.js";

/**
 * Maps a domain Job entity to an API JobResponse DTO.
 */
export function mapJobToResponse(job: Job): JobResponse {
  return {
    id: job.id,
    userId: job.userId,
    name: job.name,
    description: job.description,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    archivedAt: job.archivedAt?.toISOString(),
  };
}

/**
 * Maps a domain Job with endpoint count to JobWithCountResponse DTO.
 */
export function mapJobWithCountToResponse(job: Job & { endpointCount: number }): JobWithCountResponse {
  return {
    ...mapJobToResponse(job),
    endpointCount: job.endpointCount,
  };
}

/**
 * Maps a domain JobEndpoint entity to an API EndpointResponse DTO.
 */
export function mapEndpointToResponse(endpoint: JobEndpoint): EndpointResponse {
  return {
    id: endpoint.id,
    jobId: endpoint.jobId,
    name: endpoint.name,
    description: endpoint.description,
    baselineCron: endpoint.baselineCron,
    baselineIntervalMs: endpoint.baselineIntervalMs,
    minIntervalMs: endpoint.minIntervalMs,
    maxIntervalMs: endpoint.maxIntervalMs,
    nextRunAt: endpoint.nextRunAt.toISOString(),
    lastRunAt: endpoint.lastRunAt?.toISOString(),
    failureCount: endpoint.failureCount,
    pausedUntil: endpoint.pausedUntil?.toISOString(),
    archivedAt: endpoint.archivedAt?.toISOString(),
    url: endpoint.url,
    method: endpoint.method,
    headersJson: endpoint.headersJson,
    bodyJson: endpoint.bodyJson,
    bodySchema: endpoint.bodySchema,
    timeoutMs: endpoint.timeoutMs,
    maxExecutionTimeMs: endpoint.maxExecutionTimeMs,
    maxResponseSizeKb: endpoint.maxResponseSizeKb,
    aiHintIntervalMs: endpoint.aiHintIntervalMs,
    aiHintNextRunAt: endpoint.aiHintNextRunAt?.toISOString(),
    aiHintExpiresAt: endpoint.aiHintExpiresAt?.toISOString(),
    aiHintReason: endpoint.aiHintReason,
    aiHintBodyResolved: endpoint.aiHintBodyResolved,
    aiHintBodyExpiresAt: endpoint.aiHintBodyExpiresAt?.toISOString(),
    aiHintBodyReason: endpoint.aiHintBodyReason,
  };
}

/**
 * Maps run summary from manager to RunSummaryResponse DTO.
 */
export function mapRunSummaryToResponse(run: {
  runId: string;
  endpointId: string;
  startedAt: Date;
  status: string;
  durationMs?: number;
  source?: string;
}): RunSummaryResponse {
  return {
    runId: run.runId,
    endpointId: run.endpointId,
    startedAt: run.startedAt.toISOString(),
    status: run.status,
    durationMs: run.durationMs,
    source: run.source,
  };
}

/**
 * Maps list runs result with pagination.
 */
export function mapListRunsToResponse(result: {
  runs: Array<{
    runId: string;
    endpointId: string;
    startedAt: Date;
    status: string;
    durationMs?: number;
    source?: string;
  }>;
  total: number;
}): ListRunsResponse {
  return {
    runs: result.runs.map(mapRunSummaryToResponse),
    total: result.total,
  };
}

/**
 * Maps run details from manager to RunDetailsResponse DTO.
 */
export function mapRunDetailsToResponse(run: {
  id: string;
  endpointId: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  errorMessage?: string;
  source?: string;
  attempt: number;
  responseBody?: import("@cronicorn/domain").JsonValue | null;
  statusCode?: number;
  endpoint?: {
    id: string;
    name: string;
    url?: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  };
}): RunDetailsResponse {
  return {
    id: run.id,
    endpointId: run.endpointId,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    durationMs: run.durationMs,
    errorMessage: run.errorMessage,
    source: run.source,
    attempt: run.attempt,
    responseBody: run.responseBody ?? null,
    statusCode: run.statusCode,
    endpoint: run.endpoint,
  };
}

/**
 * Maps health summary from manager to HealthSummaryResponse DTO.
 */
export function mapHealthSummaryToResponse(summary: {
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
  lastRun: { status: string; at: Date } | null;
  failureStreak: number;
}): HealthSummaryResponse {
  return {
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    avgDurationMs: summary.avgDurationMs,
    lastRun: summary.lastRun
      ? {
          status: summary.lastRun.status,
          at: summary.lastRun.at.toISOString(),
        }
      : null,
    failureStreak: summary.failureStreak,
  };
}
