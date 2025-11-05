/**
 * API Tool Helpers
 *
 * Reusable utilities for creating MCP tools that wrap API endpoints.
 * Reduces boilerplate and ensures consistent error handling.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z, ZodRawShape } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { ApiError } from "../../ports/api-client.js";

/**
 * Standard MCP tool response format
 */
type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: { [x: string]: unknown };
  isError?: boolean;
};

/**
 * Configuration for an API tool
 */
export type ApiToolConfig<TInput, TOutput extends { [x: string]: unknown }> = {
  /** Tool name (e.g., "createJob") */
  name: string;
  /** Human-readable title */
  title: string;
  /** Tool description for AI context */
  description: string;
  /** Zod schema shape for MCP (object with properties) */
  inputSchema: ZodRawShape;
  /** Zod schema shape for MCP output */
  outputSchema: ZodRawShape;
  /** Zod schema for runtime input validation */
  inputValidator: z.ZodType<TInput>;
  /** Zod schema for runtime output validation */
  outputValidator: z.ZodType<TOutput>;
  /** HTTP method */
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  /** API path (can include params like "/jobs/:id") */
  path: string | ((input: TInput) => string);
  /** Optional: Transform input before sending to API */
  transformInput?: (input: TInput) => unknown;
  /** Optional: Custom success message */
  successMessage?: (output: TOutput) => string;
};

/**
 * Create a standardized error response
 */
function createErrorResponse(error: unknown): ToolResponse {
  if (error instanceof ApiError) {
    return {
      content: [
        {
          type: "text",
          text: `API Error (${error.statusCode}): ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T extends { [x: string]: unknown }>(
  output: T,
  message?: string,
): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: message || "✅ Operation successful",
      },
    ],
    structuredContent: output,
  };
}

/**
 * Register an API tool with automatic error handling and validation
 *
 * @example
 * ```typescript
 * registerApiTool(server, apiClient, {
 *   name: "createJob",
 *   title: "Create Job",
 *   description: "Create a new job",
 *   inputSchema: CreateJobRequestSchema,
 *   outputSchema: JobResponseSchema,
 *   method: "POST",
 *   path: "/jobs",
 *   successMessage: (job) => `✅ Created job "${job.name}" (ID: ${job.id})`
 * });
 * ```
 */
export function registerApiTool<TInput, TOutput extends { [x: string]: unknown }>(
  server: McpServer,
  apiClient: ApiClient,
  config: ApiToolConfig<TInput, TOutput>,
): void {
  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: config.outputSchema,
    },
    async (params) => {
      try {
        // 1. Validate input
        const validatedInput = config.inputValidator.parse(params);

        // 2. Determine API path
        const path = typeof config.path === "function"
          ? config.path(validatedInput)
          : config.path;

        // 3. Transform input if needed
        const body = config.transformInput
          ? config.transformInput(validatedInput)
          : validatedInput;

        // 4. Call API
        const requestOptions: RequestInit = {
          method: config.method,
        };

        // Only include body for methods that support it
        if (["POST", "PATCH", "PUT"].includes(config.method)) {
          requestOptions.body = JSON.stringify(body);
        }

        const response = await apiClient.fetch<TOutput>(path, requestOptions);

        // 5. Validate response
        const validatedResponse = config.outputValidator.parse(response);

        // 6. Return success
        const message = config.successMessage
          ? config.successMessage(validatedResponse)
          : undefined;

        return createSuccessResponse(validatedResponse, message);
      }
      catch (error) {
        return createErrorResponse(error);
      }
    },
  );
}
