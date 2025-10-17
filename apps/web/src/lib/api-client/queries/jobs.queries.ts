

import apiClient from "../api-client";
import type { InferRequestType, InferResponseType } from "hono/client";

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

// Type-safe function using InferRequestType/InferResponseType
const $get = apiClient.api.jobs.$get;
type GetJobsQuery = InferRequestType<typeof $get>["query"];
type GetJobsResponse = InferResponseType<typeof $get>;

export const getJobs = async (query: GetJobsQuery = {}): Promise<GetJobsResponse> => {
    const resp = await apiClient.api.jobs.$get({ query, param: {} });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

