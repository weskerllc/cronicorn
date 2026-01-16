
import { queryOptions } from "@tanstack/react-query";

import apiClient from "../api-client";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type helper to extract success response (excludes error responses with just "message")
type SuccessResponse<T> = Exclude<T, { message: string }>;

// ==================== Query Functions ====================

const $listSessions = apiClient.api.endpoints[":id"].sessions.$get;
type ListSessionsQuery = InferRequestType<typeof $listSessions>["query"];
type ListSessionsResponse = SuccessResponse<InferResponseType<typeof $listSessions>>;

const $getSession = apiClient.api.sessions[":id"].$get;
type GetSessionResponse = SuccessResponse<InferResponseType<typeof $getSession>>;

export async function listSessions(endpointId: string, filters?: ListSessionsQuery): Promise<ListSessionsResponse> {
  const resp = await apiClient.api.endpoints[":id"].sessions.$get({
    param: { id: endpointId },
    query: filters || {},
  });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const resp = await apiClient.api.sessions[":id"].$get({ param: { id: sessionId } });
  const json = await resp.json();

  if ("message" in json) {
    throw new Error(json.message);
  }
  return json;
}

// ==================== Query Options Factories ====================

/**
 * Query options for listing AI analysis sessions for an endpoint
 * Usage: useSuspenseQuery(sessionsQueryOptions(endpointId, filters))
 */
export function sessionsQueryOptions(endpointId: string, filters?: ListSessionsQuery) {
  return queryOptions({
    queryKey: ["endpoints", endpointId, "sessions", filters] as const,
    queryFn: () => listSessions(endpointId, filters),
    staleTime: 60000, // 60 seconds - session history doesn't change frequently
  });
}

/**
 * Query options for getting a single AI session
 * Usage: useSuspenseQuery(aiSessionQueryOptions(sessionId))
 */
export function aiSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: ["sessions", sessionId] as const,
    queryFn: () => getSession(sessionId),
    staleTime: 60000, // 60 seconds - historical data doesn't change
  });
}
