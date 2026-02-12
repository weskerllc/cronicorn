import { queryOptions } from "@tanstack/react-query";
import apiClient from "../api-client";
import type { InferResponseType } from "hono/client";


// Type helper to extract success response (excludes error responses)
type SuccessResponse<T> = Exclude<T, { message: string } | { success: boolean; error: unknown }>;

/**
 * Signing Keys API Query Helpers
 *
 * Provides type-safe access to the webhook signing key endpoints.
 * Uses Hono RPC client for end-to-end type safety.
 */

// ==================== Query Functions ====================

const $getSigningKeyInfo = apiClient.api["signing-keys"].$get;
export type SigningKeyInfoResponse = SuccessResponse<InferResponseType<typeof $getSigningKeyInfo>>;

export async function getSigningKeyInfo(): Promise<SigningKeyInfoResponse> {
  const resp = await apiClient.api["signing-keys"].$get({ param: {} });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Mutation Functions ====================

const $createSigningKey = apiClient.api["signing-keys"].$post;
export type CreateSigningKeyResponse = SuccessResponse<InferResponseType<typeof $createSigningKey>>;

export async function createSigningKey(): Promise<CreateSigningKeyResponse> {
  const resp = await apiClient.api["signing-keys"].$post({ param: {} });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

const $rotateSigningKey = apiClient.api["signing-keys"].rotate.$post;
export type RotateSigningKeyResponse = SuccessResponse<InferResponseType<typeof $rotateSigningKey>>;

export async function rotateSigningKey(): Promise<RotateSigningKeyResponse> {
  const resp = await apiClient.api["signing-keys"].rotate.$post({ param: {} });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Query Options Factories ====================

export const SIGNING_KEY_QUERY_KEY = ["signing-key"] as const;

/**
 * Query options for getting signing key info
 * Usage: useSuspenseQuery(signingKeyQueryOptions())
 */
export function signingKeyQueryOptions() {
  return queryOptions({
    queryKey: SIGNING_KEY_QUERY_KEY,
    queryFn: () => getSigningKeyInfo(),
    staleTime: 30000, // 30 seconds
  });
}
