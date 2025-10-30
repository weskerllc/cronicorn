# AI Analysis Final Answer Tool Pattern

**Date:** 2025-10-29  
**Status:** Accepted

## Context

We discovered that the `reasoning` column in the `ai_analysis_sessions` table was empty for all records, despite successful AI analyses being executed. Investigation revealed that the Vercel AI SDK's `generateText()` function returns an empty string for `result.text` when the AI model only calls tools without generating accompanying free-form text.

### The Problem

Our original implementation relied on `result.text` to capture the AI's reasoning:

```typescript
const result = await generateText({
  model: config.model,
  prompt: input,
  tools: cleanTools,
});

return {
  reasoning: result.text, // ← Empty when only tools are called!
  toolCalls: capturedToolCalls,
};
```

**Why `result.text` was empty:**
1. AI receives analysis prompt
2. AI decides to call tools (e.g., `get_latest_response`, `propose_interval`)
3. AI finishes with `finishReason: "tool-calls"`
4. No text is generated because the interaction stopped after tool execution
5. Empty string stored in database

This is expected SDK behavior for tool-only interactions.

## Decision

We implemented the **"final answer tool" pattern** recommended by Vercel AI SDK documentation:

### 1. Added `submit_analysis` Tool

Created a new tool that the AI **must** call to submit its final reasoning:

```typescript
submit_analysis: tool({
  description: "Submit your final analysis and reasoning...",
  schema: z.object({
    reasoning: z.string(),
    actions_taken: z.array(z.string()).optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
  }),
  execute: async (args) => ({
    status: "analysis_complete",
    reasoning: args.reasoning,
    actions_taken: args.actions_taken || [],
    confidence: args.confidence || "high",
  }),
})
```

### 2. Stop Condition with `hasToolCall`

Changed from open-ended generation to stopping when `submit_analysis` is called:

```typescript
const result = await generateText({
  model: config.model,
  prompt: input,
  tools: cleanTools,
  stopWhen: hasToolCall("submit_analysis"), // ← Stop when AI submits
});
```

### 3. Extract Reasoning from Tool Result

Changed reasoning extraction to pull from the tool call result instead of `result.text`:

```typescript
// Extract ALL tool results from ALL steps
const allToolResults = result.steps.flatMap(step => step.toolResults);

// Find submit_analysis call in planner.ts
const submitAnalysisCall = session.toolCalls.find(tc => tc.tool === "submit_analysis");
const reasoning = submitAnalysisCall.result.reasoning;
```

### 4. Updated Prompt

Modified the AI prompt to explicitly require calling `submit_analysis`:

```
**You MUST call submit_analysis as your final step** with your complete 
reasoning and analysis. The submit_analysis tool is how you communicate 
your findings - be thorough and specific.
```

## Consequences

### Positive

1. **Reliable reasoning capture** - Structured schema guarantees reasoning is never empty
2. **Clean separation of concerns** - `adapter-ai` doesn't know about specific tools, `worker-ai-planner` handles extraction
3. **Better observability** - Can track `actions_taken` and `confidence` metadata
4. **Flexible step count** - AI runs as many steps as needed until calling `submit_analysis`, no arbitrary limits
5. **Better UX potential** - Can show "analyzing..." status until final tool is called
6. **Follows SDK best practices** - Aligns with Vercel's recommended multi-step tool calling pattern

### Negative

1. **Slightly higher token usage** - Additional ~100-300 tokens per analysis for final tool call
2. **Prompt dependency** - Relies on prompt engineering to ensure AI calls the tool
3. **One more tool** - Increased tool count from 6 to 7 (minor complexity)

### What Code Changed

**Modified files:**
- `packages/adapter-ai/src/client.ts` - Added `finalToolName` parameter, `hasToolCall` stop condition, extract tool results from `result.steps`
- `packages/domain/src/ports/ai.ts` - Added `finalToolName?: string` to AIClient port
- `packages/worker-ai-planner/src/tools.ts` - Added `submit_analysis` tool
- `packages/worker-ai-planner/src/planner.ts` - Extract reasoning from tool call, updated prompt to require `submit_analysis`

**No database migration needed** - `reasoning` column already exists.

### Rollback Plan

If this approach fails, we can:
1. Revert to using `result.text` 
2. Add explicit "reasoning" parameter to prompt
3. Use `maxSteps` with guaranteed text generation step

However, the final answer tool pattern is more reliable and aligns with SDK best practices.

## References

- [Vercel AI SDK: Multi-step tool calling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls)
- [Vercel AI SDK: hasToolCall stop condition](https://sdk.vercel.ai/docs/reference/ai-sdk-core/has-tool-call)
- [Vercel AI SDK: result.steps documentation](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- Related task: TASK-2.3 (AI Analysis Sessions)
- Technical debt doc: `docs/TECH_DEBT_AI_REASONING.md`
