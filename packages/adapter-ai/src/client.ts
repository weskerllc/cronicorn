// Vercel AI SDK client implementation

import type { AIClient, Tool } from "@cronicorn/domain";

import { generateText, hasToolCall, stepCountIs, tool } from "ai";
import { z } from "zod";

import type { VercelAiClientConfig } from "./types.js";

import { AIClientFatalError, AIClientTransientError } from "./errors.js";

/**
 * Creates a Vercel AI SDK tool from a scheduler tool definition
 * This function handles the adaptation between our port interface and Vercel's requirements
 *
 * We use a type-safe approach that works within TypeScript's constraints while avoiding
 * explicit 'any' usage. The key is to use conditional schema extraction and proper typing.
 */
function createVercelTool(
  name: string,
  schedulerTool: Tool<unknown, unknown>,
  logger?: VercelAiClientConfig["logger"],
) {
  // Handle ToolObj case (has execute method)
  if (typeof schedulerTool === "object" && schedulerTool && "execute" in schedulerTool) {
    const toolObj = schedulerTool;

    // Extract description safely
    const description = ("description" in toolObj && typeof toolObj.description === "string")
      ? toolObj.description
      : `Execute ${name}`;

    // Build the tool based on whether we have a schema or not
    if ("meta" in toolObj
      && toolObj.meta
      && "schema" in toolObj.meta
      && toolObj.meta.schema) {
      // We have a schema - use it directly
      const zodSchema = toolObj.meta.schema;

      return tool({
        description,
        inputSchema: zodSchema,
        execute: async (params: unknown) => {
          logger?.info(`Executing tool: ${name}`, { params });

          try {
            const result = await toolObj.execute(params);
            logger?.info(`Tool ${name} executed successfully`);
            return result;
          }
          catch (toolError) {
            const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
            logger?.error(`Tool ${name} execution failed:`, { error: errorMsg });
            throw new Error(`Tool execution failed: ${errorMsg}`);
          }
        },
      });
    }
    else {
      // No schema available - use empty object schema
      return tool({
        description,
        inputSchema: z.object({}),
        execute: async () => {
          logger?.info(`Executing tool: ${name}`, { params: {} });

          try {
            const result = await toolObj.execute({});
            logger?.info(`Tool ${name} executed successfully`);
            return result;
          }
          catch (toolError) {
            const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
            logger?.error(`Tool ${name} execution failed:`, { error: errorMsg });
            throw new Error(`Tool execution failed: ${errorMsg}`);
          }
        },
      });
    }
  }

  // Handle ToolFn case - not supported yet but we can add it later
  logger?.warn(`Function-style tool ${name} not yet supported`);
  return null;
}

/** Create Vercel AI SDK client that implements our AIClient port */
export function createVercelAiClient(config: VercelAiClientConfig): AIClient {
  return {
    async planWithTools({ input, tools, maxTokens, finalToolName }: Parameters<AIClient["planWithTools"]>[0]) {
      try {
        // Note: _modelName parameter from interface is ignored for now
        // We use the pre-configured model from config instead
        // TODO: Consider using modelName to support per-call model selection

        const vercelTools: Record<string, unknown> = {};

        // Step 1: Convert tools to Vercel AI SDK format using our adapter
        if (tools && Object.keys(tools).length > 0) {
          config.logger?.info("Converting tools to Vercel format:", {
            toolNames: Object.keys(tools),
          });

          for (const [toolName, toolDef] of Object.entries(tools)) {
            try {
              const vercelTool = createVercelTool(toolName, toolDef, config.logger);
              if (vercelTool) {
                vercelTools[toolName] = vercelTool;
              }
            }
            catch (conversionError) {
              const errorMsg = conversionError instanceof Error ? conversionError.message : String(conversionError);
              config.logger?.warn(`Failed to convert tool ${toolName}:`, { error: errorMsg });
              config.logger?.warn(`Stack trace:`, { stack: conversionError instanceof Error ? conversionError.stack : "N/A" });
            }
          }
        }

        // Step 3: Call AI with tools and handle responses
        // TypeScript struggles with the complex tool generics, but runtime behavior is correct
        // This single type assertion is safer than scattering 'any' throughout the codebase
        const cleanTools = Object.keys(vercelTools).length > 0
          // eslint-disable-next-line ts/consistent-type-assertions
          ? vercelTools as Parameters<typeof generateText>[0]["tools"]
          : undefined;

        // Build stop conditions:
        // 1. Safety limit: stop at step 15 to prevent runaway tool loops
        // 2. Final tool: stop when the specified tool is called (e.g., submit_analysis)
        const stopConditions = finalToolName
          ? [stepCountIs(15), hasToolCall(finalToolName)]
          : stepCountIs(15);

        const result = await generateText({
          model: config.model,
          prompt: input,
          tools: cleanTools,
          maxOutputTokens: maxTokens || config.maxOutputTokens || 4096,
          ...(config.temperature !== undefined && { temperature: config.temperature }),
          // Force tool calls when a final tool is required — prevents the model
          // from ending the loop with a text-only response before calling it.
          ...(finalToolName && { toolChoice: "required" as const }),
          stopWhen: stopConditions,
        });

        // Extract ALL tool calls and results from ALL steps
        // Per Vercel AI SDK docs: steps.flatMap(step => step.toolResults) gets all results
        const capturedToolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [];
        const allToolResults = result.steps.flatMap(step => step.toolResults);

        for (const toolResult of allToolResults) {
          capturedToolCalls.push({
            tool: toolResult.toolName,
            args: toolResult.input, // SDK uses 'input', not 'args'
            result: toolResult.output, // SDK uses 'output', not 'result'
          });
        }

        // Emit telemetry if configured
        config.logger?.info("AI client execution completed", {
          textLength: result.text.length,
          hasUsage: !!result.usage,
          toolCalls: capturedToolCalls.length,
          tools: capturedToolCalls.map(tc => tc.tool),
        });

        return {
          toolCalls: capturedToolCalls,
          reasoning: result.text,
          tokenUsage: result.usage?.totalTokens,
        };
      }
      catch (error) {
        config.logger?.error("AI client execution failed", { error });

        // Classify errors for retry logic
        if (error instanceof Error) {
          // Network/timeout errors - retryable
          if (error.message.includes("timeout")
            || error.message.includes("network")
            || error.message.includes("429")) {
            throw new AIClientTransientError(
              `Transient AI client error: ${error.message}`,
              error,
            );
          }

          // Auth/quota errors - fatal
          if (error.message.includes("401")
            || error.message.includes("403")
            || error.message.includes("quota")) {
            throw new AIClientFatalError(
              `Fatal AI client error: ${error.message}`,
              error,
            );
          }
        }

        // Default to transient for unknown errors
        throw new AIClientTransientError(
          `Unknown AI client error: ${String(error)}`,
          error,
        );
      }
    },
  };
}
