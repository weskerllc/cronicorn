// Tests for Vercel AI SDK client adapter
/* eslint-disable ts/consistent-type-assertions */

import { generateText, tool } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createVercelAiClient } from "../client.js";

// Mock the AI SDK functions
vi.mock("ai", () => ({
    generateText: vi.fn(),
    tool: vi.fn(),
}));

const mockGenerateText = vi.mocked(generateText);
const mockTool = vi.mocked(tool);

// Helper to create mock generateText responses - use type assertion for test simplicity
// eslint-disable-next-line ts/no-explicit-any
function createMockGenerateTextResult(overrides: Record<string, unknown> = {}): any {
    return {
        text: "",
        content: [],
        reasoning: [],
        reasoningText: undefined,
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop" as const,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        warnings: [],
        providerMetadata: undefined,
        steps: [],
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        staticToolCalls: [],
        dynamicToolCalls: [],
        staticToolResults: [],
        dynamicToolResults: [],
        experimental_output: undefined,
        experimental_providerMetadata: undefined,
        experimental_reasoning: undefined,
        ...overrides,
    };
}

describe("createVercelAiClient", () => {
    let mockConfig: Parameters<typeof createVercelAiClient>[0];
    let mockLogger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        mockConfig = {
            model: "test-model",
            maxOutputTokens: 1000,
            temperature: 0.5,
            logger: mockLogger,
        };

        // Reset all mocks
        vi.clearAllMocks();

        // Set up the tool mock to return a truthy value (the actual structure doesn't matter for the test)
        mockTool.mockReturnValue({} as ReturnType<typeof tool>);
    });

    it("should create a client that implements AIClient interface", () => {
        const client = createVercelAiClient(mockConfig);

        expect(client).toHaveProperty("planWithTools");
        expect(typeof client.planWithTools).toBe("function");
    });

    it("should call generateText without tools and return response", async () => {
        // Mock generateText to return a test response
        mockGenerateText.mockResolvedValue(
            createMockGenerateTextResult({
                text: "Hello, world!",
                usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            }),
        );

        const client = createVercelAiClient(mockConfig);

        const result = await client.planWithTools({
            input: "Test prompt",
            tools: {}, // No tools provided
            maxTokens: 500,
        });

        expect(result.text).toBe("Hello, world!");
        expect(mockGenerateText).toHaveBeenCalledWith({
            model: "test-model", // Uses the model from config, not from args
            prompt: "Test prompt",
            maxOutputTokens: 500,
            temperature: 0.5,
        });
    });

    it("should convert tools to Vercel format and handle tool calls", async () => {
        const mockToolExecute = vi.fn().mockResolvedValue("tool result");

        // Mock generateText to return a response with tool calls (typical behavior)
        mockGenerateText.mockResolvedValue(
            createMockGenerateTextResult({
                text: "", // Often empty when tools are called
                toolCalls: [
                    {
                        type: "tool-call",
                        toolCallId: "call_123",
                        toolName: "testTool",
                        input: { param: "value" },
                    },
                ],
                usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
            }),
        );

        const client = createVercelAiClient(mockConfig);

        const result = await client.planWithTools({
            input: "Use the test tool",
            tools: {
                testTool: {
                    description: "A test tool",
                    execute: mockToolExecute,
                    meta: {
                        schema: z.object({
                            param: z.string(),
                        }),
                    },
                },
            },
            maxTokens: 500,
        });

        // Should log that tools are being converted
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Converting tools to Vercel format:",
            { toolNames: ["testTool"] },
        );

        // Should call generateText with tools
        expect(mockGenerateText).toHaveBeenCalledWith(
            expect.objectContaining({
                model: "test-model",
                prompt: "Use the test tool",
                tools: expect.any(Object),
                maxOutputTokens: 500,
                temperature: 0.5,
            }),
        );

        // Should return the text (even if empty)
        expect(result.text).toBe("");
    });

    it("should handle error cases gracefully", async () => {
        // Mock generateText to throw an error
        const testError = new Error("AI service unavailable");
        mockGenerateText.mockRejectedValue(testError);

        const client = createVercelAiClient(mockConfig);

        await expect(
            client.planWithTools({
                input: "Test prompt",
                tools: {},
                maxTokens: 500,
            }),
        ).rejects.toThrow("AI service unavailable");

        // Should log the error
        expect(mockLogger.error).toHaveBeenCalledWith(
            "AI client execution failed",
            { error: testError },
        );
    });

    it("should handle tools without schemas", async () => {
        mockGenerateText.mockResolvedValue(
            createMockGenerateTextResult({
                text: "Response with function tool",
                usage: { inputTokens: 15, outputTokens: 6, totalTokens: 21 },
            }),
        );

        const client = createVercelAiClient(mockConfig);
        const mockToolFunction = vi.fn().mockResolvedValue("function result");

        const result = await client.planWithTools({
            input: "Use the function tool",
            tools: {
                functionTool: mockToolFunction, // Function without meta
            },
            maxTokens: 500,
        });

        expect(result.text).toBe("Response with function tool");
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Converting tools to Vercel format:",
            { toolNames: ["functionTool"] },
        );
    });
});
