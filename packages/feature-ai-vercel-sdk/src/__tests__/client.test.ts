// Tests for Vercel AI SDK client adapter
/* eslint-disable ts/consistent-type-assertions */

import { tool } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import z from "zod";

import { createVercelAiClient } from "../client.js";

// Don't mock generateText when using MockLanguageModelV2 - let it work naturally
// Mock only the tool function which we need for our tool conversion
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    ...actual,
    tool: vi.fn(),
  };
});

const mockTool = vi.mocked(tool);

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
      model: new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: "text", text: `Hello, world!` }],
          warnings: [],
        }),
      }),
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
    const client = createVercelAiClient({
      ...mockConfig,
      model: new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: "text", text: "Hello, world!" }],
          warnings: [],
        }),
      }),
    });

    const result = await client.planWithTools({
      input: "Test prompt",
      tools: {}, // No tools provided
      maxTokens: 500,
    });

    expect(result.text).toBe("Hello, world!");
    expect(result).toHaveProperty("usage");
  });

  it("should convert tools to Vercel format and handle tool calls", async () => {
    const mockToolExecute = vi.fn().mockResolvedValue("tool result");

    // Mock generateText to return a response with tool calls (typical behavior)
    // mockGenerateText.mockResolvedValue(
    //     createMockGenerateTextResult({
    //         text: "", // Often empty when tools are called
    //         toolCalls: [
    //             {
    //                 type: "tool-call",
    //                 toolCallId: "call_123",
    //                 toolName: "testTool",
    //                 input: { param: "value" },
    //             },
    //         ],
    //         usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
    //     }),
    // );

    const client = createVercelAiClient({
      ...mockConfig,
      model: new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: "text", text: `Hello, world!` }, { type: "tool-call", toolCallId: "call_123", toolName: "testTool", input: "value" }, { type: "tool-result", toolCallId: "call_123", result: { text: "Hello" }, toolName: "testTool" }],
          warnings: [],
        }),
      }),

    });

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

    // Should return a result with text property
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  it("should handle error cases gracefully", async () => {
    // Create a mock model that throws an error
    const testError = new Error("AI service unavailable");
    const client = createVercelAiClient({
      ...mockConfig,
      model: new MockLanguageModelV2({
        doGenerate: async () => {
          throw testError;
        },
      }),
    });

    await expect(
      client.planWithTools({
        input: "Test prompt",
        tools: {},
        maxTokens: 500,
      }),
    ).rejects.toThrow("Unknown AI client error");

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      "AI client execution failed",
      { error: testError },
    );
  });

  it("should handle tools without schemas", async () => {
    const client = createVercelAiClient({
      ...mockConfig,
      model: new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: "stop",
          usage: { inputTokens: 15, outputTokens: 6, totalTokens: 21 },
          content: [{ type: "text", text: "Response with function tool" }],
          warnings: [],
        }),
      }),
    });

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
