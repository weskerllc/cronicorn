/**
 * Body resolution logic for dynamic request bodies.
 * Resolves body templates or AI hints before endpoint execution.
 */

import type { JobEndpoint, JsonValue } from "../entities/endpoint.js";
import type { RunsRepo } from "../ports/repos.js";
import type { TemplateContext } from "./types.js";

import { evaluateBodyTemplate } from "./evaluator.js";

/**
 * Resolve the body for an endpoint execution.
 * Priority: AI hint > body template > static bodyJson
 *
 * @param endpoint - The endpoint to execute
 * @param runs - RunsRepo for fetching response data
 * @param now - Current timestamp
 * @returns Resolved body or undefined if none
 */
export async function resolveEndpointBody(
  endpoint: JobEndpoint,
  runs: RunsRepo,
  now: Date,
): Promise<JsonValue | undefined> {
  // Priority 1: AI body hint (if not expired)
  if (
    endpoint.aiHintBodyResolved
    && endpoint.aiHintBodyExpiresAt
    && endpoint.aiHintBodyExpiresAt > now
  ) {
    return endpoint.aiHintBodyResolved;
  }

  // Priority 2: Body template (if present)
  if (endpoint.bodyTemplate) {
    // Build template context
    const context = await buildTemplateContext(endpoint, runs, now);

    // Evaluate template
    const result = evaluateBodyTemplate(endpoint.bodyTemplate, context);

    if (result.success && result.value !== undefined) {
      return result.value;
    }

    // If template evaluation fails, fall through to static body
  }

  // Priority 3: Static bodyJson
  return endpoint.bodyJson;
}

/**
 * Build template context for evaluation.
 * Fetches latest responses from self and sibling endpoints.
 */
async function buildTemplateContext(
  endpoint: JobEndpoint,
  runs: RunsRepo,
  now: Date,
): Promise<TemplateContext> {
  // Get latest response from this endpoint
  const selfResponse = await runs.getLatestResponse(endpoint.id);

  // Get sibling responses if endpoint is part of a job
  const siblings: TemplateContext["siblings"] = {};
  if (endpoint.jobId) {
    const siblingResponses = await runs.getSiblingLatestResponses(endpoint.jobId, endpoint.id);
    for (const sibling of siblingResponses) {
      siblings[sibling.endpointName] = {
        endpointId: sibling.endpointId,
        endpointName: sibling.endpointName,
        latestResponse: sibling.responseBody ?? undefined,
      };
    }
  }

  return {
    self: {
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      latestResponse: selfResponse?.responseBody ?? undefined,
    },
    siblings,
    now: now.toISOString(),
  };
}
