
import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

/**
 * Jobs API Query Helpers
 *
 * These functions demonstrate two approaches for type-safe API consumption:
 *
 * 1. Using InferRequestType/InferResponseType from Hono RPC client
 *    - For typing function parameters and responses
 *    - No runtime validation, just TypeScript types
 *
 * 2. Using schemas from @cronicorn/api-contracts (see form example)
 *    - For client-side validation (e.g., react-hook-form + zodResolver)
 *    - Provides actual Zod schema objects for runtime validation
 *
 * Example form usage with api-contracts:
 * ```ts
 * import { CreateJobRequestSchema } from '@cronicorn/api-contracts/jobs'
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 *
 * const form = useForm({
 *   resolver: zodResolver(CreateJobRequestSchema)
 * })
 * ```
 */

// ==================== Query Functions ====================

// Type-safe function using InferRequestType/InferResponseType
const $get = apiClient.api.jobs.$get;
type GetJobsQuery = InferRequestType<typeof $get>["query"];
type GetJobsResponse = SuccessResponse<InferResponseType<typeof $get>>;

export async function getJobs(query: GetJobsQuery = {}): Promise<GetJobsResponse> {
  const resp = await apiClient.api.jobs.$get({ query, param: {} });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $getById = apiClient.api.jobs[":id"].$get;
type GetJobResponse = SuccessResponse<InferResponseType<typeof $getById>>;

export async function getJob(id: string): Promise<GetJobResponse> {
  const resp = await apiClient.api.jobs[":id"].$get({ param: { id } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Mutation Functions ====================

const $createJob = apiClient.api.jobs.$post;
type CreateJobRequest = InferRequestType<typeof $createJob>["json"];
type CreateJobResponse = SuccessResponse<InferResponseType<typeof $createJob>>;

export async function createJob(data: CreateJobRequest): Promise<CreateJobResponse> {
  const resp = await apiClient.api.jobs.$post({
    param: {},
    json: data,
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $updateJob = apiClient.api.jobs[":id"].$patch;
type UpdateJobRequest = InferRequestType<typeof $updateJob>["json"];
type UpdateJobResponse = SuccessResponse<InferResponseType<typeof $updateJob>>;

export async function updateJob(id: string, data: UpdateJobRequest): Promise<UpdateJobResponse> {
  const resp = await apiClient.api.jobs[":id"].$patch({
    param: { id },
    json: data,
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $archiveJob = apiClient.api.jobs[":id"].$delete;
type ArchiveJobResponse = SuccessResponse<InferResponseType<typeof $archiveJob>>;

export async function archiveJob(id: string): Promise<ArchiveJobResponse> {
  const resp = await apiClient.api.jobs[":id"].$delete({ param: { id } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Query Options Factories ====================

export const JOBS_QUERY_KEY = ["jobs"] as const;
/**
 * Query options for listing jobs
 * Usage: useQuery(jobsQueryOptions()), useSuspenseQuery(jobsQueryOptions())
 */
export function jobsQueryOptions(query: GetJobsQuery = {}) {
  return queryOptions({
    queryKey: [JOBS_QUERY_KEY, query] as const,
    queryFn: () => getJobs(query),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Query options for getting a single job by ID
 * Usage: useQuery(jobQueryOptions(jobId)), useSuspenseQuery(jobQueryOptions(jobId))
 */
export function jobQueryOptions(id: string) {
  return queryOptions({
    queryKey: [JOBS_QUERY_KEY, id] as const,
    queryFn: () => getJob(id),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Query options for listing endpoints for a job
 * Usage: useQuery(endpointsQueryOptions(jobId))
 */
export function endpointsQueryOptions(jobId: string) {
  return queryOptions({
    queryKey: [JOBS_QUERY_KEY, jobId, "endpoints"] as const,
    queryFn: async () => {
      const resp = await apiClient.api.jobs[":jobId"].endpoints.$get({ param: { jobId } });
      const json = await resp.json();

      if ("message" in json) {
        throw new Error(json.message);
      }
      return json;
    },
    staleTime: 30000, // 30 seconds
  });
}
