/**
 * AI tooling helpers - relocated from domain.
 * These handle tool execution and validation with Zod.
 */

import type { z } from "zod";

type AnyTools = Record<string, Tool<unknown, unknown>>;

/**
 * Result of an AI analysis session.
 * Captures what the AI did (tools called, reasoning) for observability and debugging.
 */
export type AISessionResult = {
  /** Tools called during analysis */
  toolCalls: Array<{
    tool: string; // Tool name (e.g., "propose_interval")
    args: unknown; // Input parameters
    result: unknown; // Tool execution result
  }>;
  /** AI's final text response (reasoning/analysis) */
  reasoning: string;
  /** Token usage (if available from provider) */
  tokenUsage?: number;
};

export type AIClient = {
  planWithTools: (args: {
    finalToolName?: string;
    input: string;
    tools: Tools<AnyTools>;
    maxTokens: number;
  }) => Promise<AISessionResult>;
};

export type ToolFn<P, R> = (args: P) => Promise<R>;

/** Tool metadata for schema validation and introspection */
export type ToolMeta<P> = {
  schema?: z.ZodSchema<P>;
  validate?: (args: unknown) => asserts args is P;
};

/** Object-shaped tool (SDK-style) */
export type ToolObj<P, R> = {
  description?: string;
  execute: (args: P) => Promise<R>;
  meta?: ToolMeta<P>;
};

/** A tool can be either shape */
export type Tool<P, R> = ToolFn<P, R> | ToolObj<P, R>;

/** Map of named tools (keeps each key's P/R types) */
export type Tools<T extends Record<string, Tool<unknown, unknown>>> = {
  [K in keyof T]: T[K];
};

export type ToolArgs<T> =
  T extends ToolFn<infer P, unknown> ? P
  : T extends ToolObj<infer P, unknown> ? P
  : never;

export type ToolResult<T> =
  T extends ToolFn<unknown, infer R> ? R
  : T extends ToolObj<unknown, infer R> ? R
  : never;

/** Type guards (no `any`) */
function isToolFn<P, R>(t: Tool<P, R>): t is ToolFn<P, R> {
  return typeof t === "function";
}

function isToolObj<P, R>(t: Tool<P, R>): t is ToolObj<P, R> {
  return typeof t === "object" && t !== null && "execute" in t;
}

/** Type-safe invocation helper */
export async function callTool<
  TTools extends Record<string, Tool<unknown, unknown>>,
  K extends keyof TTools,
>(
  tools: TTools,
  key: K,
  args: ToolArgs<TTools[K]>,
): Promise<ToolResult<TTools[K]>> {
  const tool = tools[key];
  if (isToolFn(tool)) {
    // eslint-disable-next-line ts/consistent-type-assertions
    return tool(args) as Promise<ToolResult<TTools[K]>>;
  }
  if (isToolObj(tool)) {
    // Validate args using Zod schema if available
    if (tool.meta?.schema) {
      const validatedArgs = tool.meta.schema.parse(args);
      // eslint-disable-next-line ts/consistent-type-assertions
      return tool.execute(validatedArgs) as Promise<ToolResult<TTools[K]>>;
    }
    // Fallback to custom validate function
    if (tool.meta?.validate) {
      // eslint-disable-next-line ts/consistent-type-assertions
      (tool.meta.validate as (args: unknown) => void)(args);
    }
    // eslint-disable-next-line ts/consistent-type-assertions
    return tool.execute(args) as Promise<ToolResult<TTools[K]>>;
  }
  throw new TypeError(`Tool "${String(key)}" is not callable`);
}

/** Create a type-safe tool with Zod schema */
export function tool<TSchema extends z.ZodSchema>(config: {
  description?: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<unknown>;
}): ToolObj<z.infer<TSchema>, Awaited<ReturnType<typeof config.execute>>> {
  return {
    description: config.description,
    execute: config.execute,
    meta: {
      // eslint-disable-next-line ts/consistent-type-assertions
      schema: config.schema as z.ZodSchema<z.infer<TSchema>>,
    },
  };
}

/** Helper to define tools with full type inference from Zod schemas */
export function defineTools<
  // eslint-disable-next-line ts/no-explicit-any
  T extends Record<string, Tool<any, any>>,
>(tools: T): Tools<AnyTools> {
  // eslint-disable-next-line ts/consistent-type-assertions
  return tools as Tools<AnyTools>;
}
