import type { InferRequestType, InferResponseType } from "hono/client";

import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";

// Type helper to extract success response (excludes error responses)
type SuccessResponse<T> = Exclude<T, { message: string } | { error: string }>;

// ==================== Query Functions ====================

const $getStatus = apiClient.api.subscriptions.status.$get;
type GetSubscriptionStatusResponse = SuccessResponse<InferResponseType<typeof $getStatus>>;

export async function getSubscriptionStatus(): Promise<GetSubscriptionStatusResponse> {
  const resp = await apiClient.api.subscriptions.status.$get({ param: {} });
  const json = await resp.json();

  if ("error" in json) {
    throw new Error(json.error);
  }
  return json;
}

const $getUsage = apiClient.api.subscriptions.usage.$get;
type GetUsageResponse = SuccessResponse<InferResponseType<typeof $getUsage>>;

export async function getUsage(): Promise<GetUsageResponse> {
  const resp = await apiClient.api.subscriptions.usage.$get({ param: {} });
  const json = await resp.json();

  if ("error" in json) {
    throw new Error(json.error);
  }
  return json;
}

// ==================== Mutation Functions ====================

const $createCheckout = apiClient.api.subscriptions.checkout.$post;
type CreateCheckoutRequest = InferRequestType<typeof $createCheckout>["json"];
type CreateCheckoutResponse = SuccessResponse<InferResponseType<typeof $createCheckout>>;

export async function createCheckoutSession(data: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
  const resp = await apiClient.api.subscriptions.checkout.$post({
    param: {},
    json: data,
  });
  const json = await resp.json();

  if ("error" in json) {
    throw new Error(json.error);
  }
  return json;
}

const $createPortal = apiClient.api.subscriptions.portal.$post;
type CreatePortalResponse = SuccessResponse<InferResponseType<typeof $createPortal>>;

export async function createPortalSession(): Promise<CreatePortalResponse> {
  const resp = await apiClient.api.subscriptions.portal.$post({
    param: {},
    json: {},
  });
  const json = await resp.json();

  if ("error" in json) {
    throw new Error(json.error);
  }
  return json;
}

// ==================== Query Options Factories ====================

/**
 * Query options for subscription status
 * Usage: useSuspenseQuery(subscriptionStatusQueryOptions())
 */
export function subscriptionStatusQueryOptions() {
  return queryOptions({
    queryKey: ["subscriptions", "status"] as const,
    queryFn: getSubscriptionStatus,
    staleTime: 60000, // 60 seconds - subscription status doesn't change frequently
  });
}

/**
 * Query options for usage/quota data
 * Usage: useSuspenseQuery(usageQueryOptions())
 */
export function usageQueryOptions() {
  return queryOptions({
    queryKey: ["subscriptions", "usage"] as const,
    queryFn: getUsage,
    staleTime: 30000, // 30 seconds - usage data can be slightly stale
  });
}
