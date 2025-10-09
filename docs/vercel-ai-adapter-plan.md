# Vercel AI SDK Adapter Implementation Plan

## Context

- **Port contract**: `AIClient.planWithTools({ model, input, tools, maxTokens })` → `{ text, usage? }`.
- **Clean architecture**: Adapters live in their own package, expose factories, and are wired into apps through dependency injection.
- **Vercel AI SDK v5 observations** (from official docs):
  - Tool calling requires tool definitions that expose an `inputSchema` (Zod) or use `dynamicTool` with runtime validation.
  - Tool execution receives context (messages, abort signal, toolCallId) we can surface through our port if needed.
  - Multi-step `generateText` flows support `stopWhen`, `onStepFinish`, and tool repair strategies—useful for resilience.

## Guiding Decisions

1. **Package isolation**: create a dedicated workspace package (e.g. `packages/feature-ai-vercel-sdk`) that depends on `ai` v5 and provider modules. Core scheduler package remains zod-free.
2. **Runtime metadata for tools**: extend `ToolObj` (in core ports) with optional `inputSchema?: JsonSchema` / `validate?: (args: unknown) => asserts args is P` metadata so adapters can supply schemas without forcing every consumer to use Zod.
3. **Adapter strategy**: map our `Tools<T>` to Vercel tool definitions via `dynamicTool` when no schema is provided; prefer full `tool()` helper when a JSON schema is supplied (adapter can translate JSON schema to Zod using `zod-to-json-schema` or a lightweight utility).
4. **Error handling**: standardise on domain-specific error classes (e.g. `AIClientTransientError`, `AIClientFatalError`) so callers can react appropriately.
5. **Observability hooks**: accept optional logger/metrics callbacks in the adapter factory to forward Vercel AI telemetry or tool-call spans.

## Step-by-step Roadmap

### 1. Prepare workspace scaffolding
- Add new package directory with `package.json`, `tsconfig.json`, and entry file (`src/index.ts`).
- Declare dependencies: `ai@^5`, chosen provider (`@ai-sdk/openai` or configurable), optional `zod` (local to adapter) and `zod-to-json-schema` if schema conversion is needed.
- Update `pnpm-workspace.yaml`, root `tsconfig` references, and `turbo.json` targets if present.

### 2. Evolve core ports for schema metadata
- Update `ToolObj` in `packages/scheduler/src/domain/ports.ts` to add optional `meta?: { jsonSchema?: JsonSchema7; validate?: (args: unknown) => asserts args is P }`.
- Adjust `callTool` helper to invoke `validate` when supplied before executing the tool.
- Keep metadata optional to avoid breaking existing callers; provide default no-op behaviour.

### 3. Implement Vercel adapter
- Create `createVercelAiClient(deps)` factory in new package:
  - Inputs: `{ model: LanguageModelV1 | string; provider?: ProviderFactory; logger?: Logger; telemetry?: TelemetryHooks; retryPolicy?; }`.
  - Optional overrides for `maxOutputTokens`, `toolChoice`, `stopWhen`, etc.
- Inside `planWithTools`:
  - Translate input message & tool set into Vercel AI `generateText` parameters.
  - For each tool:
    - If `meta.jsonSchema` exists, convert to Zod schema (using helper) and create `tool({ inputSchema, execute })`.
    - Else construct `dynamicTool({ description, execute })` and treat args as `unknown` (the tool already typed at compile time).
  - Bridge tool execution by calling original `execute` function with typed args (after optional validation) and returning serialized result.
  - Capture `result.text` plus `result.usage` (prompt/completion tokens) when provided.
  - Map Vercel SDK errors to domain errors, tagging retryable conditions (e.g., HTTP 429, network errors).
- Support multi-step flows by allowing configuration of `stopWhen`, `experimental_repairToolCall`, or `onStepFinish` to improve reliability in production.

### 4. Dependency injection wiring
- Expose builder from new package via `src/index.ts`.
- In consuming app (e.g. `apps/api`), add composition code to instantiate `createVercelAiClient` using environment config (API keys, default model).
- Register the resulting instance in the request-scoped DI container for use by managers.
- Ensure non-production environments can swap the adapter with existing fakes.

### 5. Testing
- **Unit tests (new package)**:
  - Mock Vercel `generateText` to assert request payloads (models, tool map, max tokens).
  - Verify tool metadata handling: schema path uses conversion, dynamic path passes arguments through untouched.
  - Ensure error translation returns domain-specific errors.
  - Prefer the official `ai/test` utilities (e.g. `MockLanguageModelV2`) to return deterministic responses and usage data without hitting real providers.
  - Use available testing functions when exercising `generateText`/multi-step behaviour; assert tool-call deltas and finish events.
- **Integration tests (feature package)**:
  - Provide smoke test verifying DI wiring resolves the adapter and `planWithTools` delegates to mocked SDK.
  - Optional live test (guarded) to exercise real Vercel AI responses.
  - For frameworks using Jest, add `moduleNameMapper` for `@ai-sdk/rsc` per Vercel guidance to avoid missing-module errors.
  - Keep tool-call tests deterministic by setting `temperature: 0` and validating tool-call repair paths using the SDK's `experimental_repairToolCall` hook when applicable.

### 6. Documentation & DX
- Add README in adapter package covering configuration, dependency injection, tool metadata expectations, and how to provide JSON schema/validators.
- Update overall architecture documentation to list the new adapter package and note optional schema metadata on tools.
- Document required environment variables (`VERCEL_AI_API_KEY`, default model name, provider-specific settings).

### 7. Observability & resilience enhancements (optional)
- Hook into Vercel AI telemetry (`usage`, `onStepFinish`) to emit metrics or logging.
- Provide optional retry/backoff configuration for transient SDK failures.
- Consider implementing tool-call repair strategy (per docs) when a tool results in validation errors.

## Open Questions / Follow-ups
- Decide on preferred provider(s) (OpenAI, Anthropic, etc.) and whether to expose provider-agnostic configuration.
- Evaluate whether to add first-class support for streaming responses in the port contract.
- Confirm if JSON schema metadata should live alongside tool definitions or be adapter-specific configuration.
