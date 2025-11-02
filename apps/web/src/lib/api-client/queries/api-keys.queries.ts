import { queryOptions } from "@tanstack/react-query";

import { authClient } from "../../auth-client";

// ==================== Query Functions ====================

/**
 * List all API keys for the current user
 * Note: Keys in response do NOT include the actual key value
 */
export async function listApiKeys() {
  const { data, error } = await authClient.apiKey.list();
  if (error) {
    throw new Error(error.message || "Failed to list API keys");
  }
  return data;
}

// ==================== Mutation Functions ====================

// TODO: Refactor to use api contracts package
export type CreateApiKeyInput = {
  name: string;
  expiresIn?: number; // in seconds
  prefix?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Create a new API key
 * IMPORTANT: The key value is ONLY returned in this response - save it immediately!
 */
export async function createApiKey(input: CreateApiKeyInput) {
  const { data, error } = await authClient.apiKey.create(input);
  if (error) {
    throw new Error(error.message || "Failed to create API key");
  }
  return data;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string) {
  const { data, error } = await authClient.apiKey.delete({ keyId });
  if (error) {
    throw new Error(error.message || "Failed to delete API key");
  }
  return data;
}

/**
 * Update an API key (name only)
 */
export async function updateApiKey(keyId: string, name: string) {
  const { data, error } = await authClient.apiKey.update({ keyId, name });
  if (error) {
    throw new Error(error.message || "Failed to update API key");
  }
  return data;
}

// ==================== Query Options Factories ====================

/**
 * Query options for listing API keys
 * Usage: useSuspenseQuery(apiKeysQueryOptions())
 */
export function apiKeysQueryOptions() {
  return queryOptions({
    queryKey: ["api-keys"] as const,
    queryFn: listApiKeys,
    staleTime: 30000, // 30 seconds
  });
}
