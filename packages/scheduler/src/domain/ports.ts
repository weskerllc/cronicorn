import type { z } from "zod";

export type Clock = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>; // in tests: fast-forward
};

export type Cron = {
  next: (expr: string, from: Date) => Date;
};

export type JobsRepo = {
  add: (ep: JobEndpoint) => void;
  claimDueEndpoints: (limit: number, withinMs: number) => Promise<string[]>;
  getEndpoint: (id: string) => Promise<JobEndpoint>;
  setLock: (id: string, until: Date) => Promise<void>;
  clearLock: (id: string) => Promise<void>;
  setNextRunAtIfEarlier: (id: string, when: Date) => Promise<void>;
  updateAfterRun: (id: string, patch: {
    lastRunAt: Date;
    nextRunAt: Date;
    status: { status: "success" | "failed" | "canceled"; durationMs: number };
    failureCountPolicy: "increment" | "reset";
    clearExpiredHints: boolean;
  }) => Promise<void>;
  writeAIHint: (id: string, hint: { nextRunAt?: Date; intervalMs?: number; expiresAt: Date; reason?: string }) => Promise<void>;
  setPausedUntil: (id: string, until: Date | null) => Promise<void>;
};

export type RunsRepo = {
  create: (run: { endpointId: string; status: "running"; attempt: number }) => Promise<string>;
  finish: (runId: string, patch: { status: "success" | "failed" | "canceled"; durationMs: number; err?: unknown }) => Promise<void>;
};

export type Dispatcher = {
  execute: (ep: JobEndpoint) => Promise<{ status: "success" | "failed"; durationMs: number }>;
};

export type QuotaGuard = {
  reserveAI: (tenantId: string, model: string, estPrompt: number, maxCompletion: number) => Promise<{ kind: "ok"; reservationId: string } | { kind: "retry"; retryInMs: number } | { kind: "deny"; reason: string }>;
  commit: (resId: string, usedPrompt: number, usedCompletion: number) => Promise<void>;
  release: (resId: string) => Promise<void>;
};

type AnyTools = Record<string, Tool<unknown, unknown>>;

export type AIClient = {
  planWithTools: (args: { input: string; tools: Tools<AnyTools>; maxTokens: number }) => Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;
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

/** Map of named tools (keeps each key’s P/R types) */
export type Tools<T extends Record<string, Tool<unknown, unknown>>> = {
  [K in keyof T]: T[K];
};

export type ToolArgs<T> =
    T extends ToolFn<infer P, unknown> ? P :
      T extends ToolObj<infer P, unknown> ? P :
        never;

export type ToolResult<T> =
    T extends ToolFn<unknown, infer R> ? R :
      T extends ToolObj<unknown, infer R> ? R :
        never;

/** Extract args/result types per-tool */
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

// Core data
export type JobEndpoint = {
  id: string;
  jobId: string;
  tenantId: string;
  name: string;
  // baseline
  baselineCron?: string;
  baselineIntervalMs?: number;
  // hints
  aiHintNextRunAt?: Date;
  aiHintIntervalMs?: number;
  aiHintExpiresAt?: Date;
  aiHintReason?: string;
  // guardrails/ops
  minIntervalMs: number;
  maxIntervalMs?: number;
  pausedUntil?: Date;
  lockedUntil?: Date;
  // state
  nextRunAt: Date;
  lastRunAt?: Date;
  failureCount: number;
  lastStatus?: "success" | "failed" | "running" | "canceled";
};
