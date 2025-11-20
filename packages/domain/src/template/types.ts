/**
 * Template evaluation types
 */

import type { JsonValue } from "../entities/endpoint.js";

/**
 * Context data available for template evaluation.
 */
export type TemplateContext = {
  self: {
    latestResponse?: JsonValue;
    endpointId: string;
    endpointName: string;
  };
  siblings: Record<string, {
    latestResponse?: JsonValue;
    endpointId: string;
    endpointName: string;
  }>;
  now: string; // ISO timestamp
};

/**
 * Result of template evaluation.
 */
export type EvaluationResult = {
  success: boolean;
  value?: JsonValue;
  error?: string;
};
