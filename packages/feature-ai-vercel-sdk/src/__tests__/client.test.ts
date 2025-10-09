// Tests for Vercel AI SDK client adapter

import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createVercelAiClient } from "../client.js";

// Mock the AI SDK generateText function
vi.mock("ai", () => ({
    generateText: vi.fn(),
}));

const mockGenerateText = vi.mocked(generateText);

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
    });

    it("should create a client that implements AIClient interface", () => {
        const client = createVercelAiClient(mockConfig);

        expect(client).toHaveProperty("planWithTools");
        expect(typeof client.planWithTools).toBe("function");
    });

    it("should call generateText and return response", async () => {
        // Mock generateText to return a test response
        mockGenerateText.mockResolvedValue({
            text: "Hello, world!",
        } as Awaited<ReturnType<typeof generateText>>);

        const client = createVercelAiClient(mockConfig);

        const result = await client.planWithTools({
            model: "test-model", // Required by AIClient interface
            input: "Test prompt",
            tools: {}, // Required by AIClient interface
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

    it("should log when tools are provided", async () => {
        // Mock generateText to return a response
        mockGenerateText.mockResolvedValue({
            text: "Tool response",
        } as Awaited<ReturnType<typeof generateText>>);

        const client = createVercelAiClient(mockConfig);
        const mockToolExecute = vi.fn().mockResolvedValue("tool result");

        await client.planWithTools({
            model: "test-model",
            input: "Use the test tool",
            tools: {
                testTool: {
                    description: "A test tool",
                    execute: mockToolExecute,
                },
                functionTool: vi.fn().mockResolvedValue("function result"),
            },
            maxTokens: 500,
        });

        // Should log that tools are provided but not implemented
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Tools provided but not yet implemented",
            { toolNames: ["testTool", "functionTool"] },
        );

        // Should still call generateText without tools (for now)
        expect(mockGenerateText).toHaveBeenCalledWith({
            model: "test-model",
            prompt: "Use the test tool",
            maxOutputTokens: 500,
            temperature: 0.5,
        });

        // Tools should not be executed yet (since not implemented)
        expect(mockToolExecute).not.toHaveBeenCalled();
    });

    it("should handle tools with metadata", async () => {
        // Mock generateText to return a response
        mockGenerateText.mockResolvedValue({
            text: "Schema tool response",
        } as Awaited<ReturnType<typeof generateText>>);

        const client = createVercelAiClient(mockConfig);
        const mockToolExecute = vi.fn().mockResolvedValue("validated result");
        const mockValidator = vi.fn(); // Mock validation function

        await client.planWithTools({
            model: "test-model",
            input: "Use the schema tool",
            tools: {
                schemaTool: {
                    description: "A tool with JSON schema",
                    execute: mockToolExecute,
                    meta: {
                        jsonSchema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                age: { type: "number" },
                            },
                            required: ["name"],
                        },
                        validate: mockValidator,
                    },
                },
            },
            maxTokens: 500,
        });

        // Should log that tools are provided but not implemented
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Tools provided but not yet implemented",
            { toolNames: ["schemaTool"] },
        );

        // Tools with metadata should also not be executed yet
        expect(mockToolExecute).not.toHaveBeenCalled();
        expect(mockValidator).not.toHaveBeenCalled();
    });
});
