# @cronicorn/adapter-ai

A type-safe adapter that bridges the Cronicorn AI Scheduler with Vercel AI SDK, enabling seamless tool calling integration.

## Purpose

This adapter maintains clean architecture by decoupling your scheduler domain from the Vercel AI SDK. It provides type-safe tool calling with automatic schema-to-type inference using Zod.

## Key Features

- **Clean Architecture**: Domain logic never directly depends on Vercel AI SDK
- **Type Safety**: Full TypeScript support with Zod schema inference
- **Tool Calling**: Complete AI tool calling integration
- **Error Classification**: Distinguishes between transient (retryable) and fatal errors
- **Provider Flexibility**: Easy to swap AI providers without domain changes

## Installation

```bash
pnpm add @cronicorn/adapter-ai
```

## Basic Usage

1. Create an AI client with `createVercelAiClient(config)`
2. Define tools using the scheduler's `tool()` and `defineTools()` functions
3. Call `aiClient.planWithTools({ input, tools, maxTokens })`

## Configuration

The client accepts:

- `model`: Any Vercel AI SDK language model
- `maxOutputTokens`: Default token limit
- `temperature`: Default randomness (0-1)
- `logger`: Optional logging interface

## Error Handling

- **AIClientTransientError**: Network issues, rate limits (should retry)
- **AIClientFatalError**: Invalid keys, malformed requests (don't retry)

## Environment Variables

Set API keys for your chosen provider:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

## Architecture

Follows hexagonal architecture:

```
Your App → Adapter → Scheduler Domain → Vercel AI SDK
```

This ensures your business logic remains independent of AI provider implementation details.

## Testing

Use Vercel AI SDK's `MockLanguageModelV2` for deterministic testing without real AI calls.
