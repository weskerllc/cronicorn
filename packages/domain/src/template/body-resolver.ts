/**
 * Body resolution logic for dynamic request bodies.
 * Resolves AI-generated bodies or falls back to static bodyJson.
 */

import type { JobEndpoint, JsonValue } from "../entities/endpoint.js";
import type { RunsRepo } from "../ports/repos.js";

/**
 * Resolve the body for an endpoint execution.
 * Priority: AI-generated body (if not expired) > static bodyJson
 *
 * @param endpoint - The endpoint to execute
 * @param runs - RunsRepo (unused now, but kept for backward compatibility)
 * @param now - Current timestamp
 * @returns Resolved body or undefined if none
 */
export async function resolveEndpointBody(
  endpoint: JobEndpoint,
  runs: RunsRepo,
  now: Date,
): Promise<JsonValue | undefined> {
  // Priority 1: AI-generated body (if not expired)
  // AI observes endpoint responses and generates a body conforming to bodySchema
  if (
    endpoint.aiHintBodyResolved
    && endpoint.aiHintBodyExpiresAt
    && endpoint.aiHintBodyExpiresAt > now
  ) {
    return endpoint.aiHintBodyResolved;
  }

  // Priority 2: Static bodyJson (fallback)
  return endpoint.bodyJson;
}
