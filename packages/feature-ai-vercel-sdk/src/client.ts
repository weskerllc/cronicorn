// Vercel AI SDK client implementation

import type { AIClient } from "@cronicorn/scheduler/domain/ports.js";

import { generateText } from "ai";

import type { VercelAiClientConfig } from "./types.js";

import { AIClientFatalError, AIClientTransientError } from "./errors.js";

/** Create Vercel AI SDK client that implements our AIClient port */
export function createVercelAiClient(config: VercelAiClientConfig): AIClient {
    return {
        async planWithTools({ input, tools, maxTokens }) {
            try {
                // Log tools for debugging, but don't implement them yet
                // TODO: Implement tool calling in next iteration
                if (tools && Object.keys(tools).length > 0) {
                    config.logger?.info("Tools provided but not yet implemented", {
                        toolNames: Object.keys(tools),
                    });
                }

                // Generate response using Vercel AI SDK
                const result = await generateText({
                    model: config.model,
                    prompt: input,
                    maxOutputTokens: maxTokens || config.maxOutputTokens || 4096,
                    temperature: config.temperature || 0,
                });

                // Emit telemetry if configured
                config.logger?.info("AI client execution completed", {
                    textLength: result.text.length,
                    hasUsage: !!result.usage,
                });

                return {
                    text: result.text,
                    // Usage will be implemented once we determine correct property names
                    usage: undefined,
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
