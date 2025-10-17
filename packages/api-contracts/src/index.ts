/**
 * API Contracts
 *
 * Shared Zod schemas and TypeScript types for all API endpoints.
 *
 * ## Usage
 *
 * ### In API Routes (Server-side validation)
 * ```ts
 * import { CreateJobRequestSchema } from '@cronicorn/api-contracts/jobs'
 * import { zValidator } from '@hono/zod-validator'
 *
 * app.post('/jobs', zValidator('json', CreateJobRequestSchema), async (c) => {
 *   const data = c.req.valid('json')
 *   // ...
 * })
 * ```
 *
 * ### In Forms (Client-side validation)
 * ```ts
 * import { CreateJobRequestSchema } from '@cronicorn/api-contracts/jobs'
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 *
 * const form = useForm({
 *   resolver: zodResolver(CreateJobRequestSchema)
 * })
 * ```
 *
 * ### For Types Only
 * ```ts
 * import type { CreateJobRequest } from '@cronicorn/api-contracts/jobs'
 *
 * async function createJob(data: CreateJobRequest) {
 *   // ...
 * }
 * ```
 *
 * ### With Hono RPC Client (Alternative for types)
 * ```ts
 * import type { InferRequestType } from 'hono/client'
 * import apiClient from './api-client'
 *
 * const $post = apiClient.api.jobs.$post
 * type RequestBody = InferRequestType<typeof $post>['json']
 * ```
 */

export * as jobs from "./jobs/index.js";
export * as subscriptions from "./subscriptions/index.js";
