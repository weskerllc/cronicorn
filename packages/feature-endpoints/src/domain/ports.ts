import { z } from "zod";

export type Clock = {
    now: () => Date;
    sleep: (ms: number) => Promise<void>; // in tests: fast-forward
};

export type JobsRepo = {
    claimDueEndpoints: (limit: number, lockTtlMs: number) => Promise<string[]>;
    getEndpoint: (id: string) => Promise<JobEndpoint>;
    setLock: (id: string, until: Date) => Promise<void>;
    clearLock: (id: string) => Promise<void>;
    updateAfterRun: (id: string, patch: {
        lastRunAt: Date;
        nextRunAt: Date;
        status: "success" | "failed" | "canceled";
        failureCountDelta: number;
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

export type AIClient = {
    planWithTools: (args: { model: string; input: string; tools: Tools; maxTokens: number }) => Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;
};

/** Function-shaped tool */
export type ToolFn<P, R> = (args: P) => Promise<R>;

/** Object-shaped tool (SDK-style) */
export type ToolObj<P, R> = {
    description?: string;
    parameters?: z.ZodType<P>;
    execute: (args: P) => Promise<R>;
};

/** A tool can be either shape */
export type Tool<P, R> = ToolFn<P, R> | ToolObj<P, R>;

/** Map of named tools (keeps each key’s P/R types) */
export type Tools<T extends Record<string, Tool<unknown, unknown>>> = {
    [K in keyof T]: T[K];
};

/** Extract args/result types per-tool */
export type ToolArgs<T> =
    T extends ToolFn<infer P, unknown> ? P :
    T extends ToolObj<infer P, unknown> ? P :
    never;

export type ToolResult<T> =
    T extends ToolFn<unknown, infer R> ? R :
    T extends ToolObj<unknown, infer R> ? R :
    never;

/** Type guards (no `any`) */
function isToolFn<P, R>(t: Tool<P, R>): t is ToolFn<P, R> {
    return typeof t === "function";
}
function isToolObj<P, R>(t: Tool<P, R>): t is ToolObj<P, R> {
    return typeof t === "object" && t !== null && "execute" in t;
}

/** Type-safe invocation helper (no `any`) */
export async function callTool<
    TTools extends Record<string, Tool<unknown, unknown>>,
    K extends keyof TTools,
>(
    tools: TTools,
    key: K,
    args: ToolArgs<TTools[K]>,
): Promise<ToolResult<TTools[K]>> {
    const t = tools[key];
    if (isToolFn(t as Tool<unknown, unknown>)) {
        // Args/return are inferred for this key K
        return (t as ToolFn<ToolArgs<TTools[K]>, ToolResult<TTools[K]>>)(args);
    }
    if (isToolObj(t as Tool<unknown, unknown>)) {
        const obj = t as ToolObj<ToolArgs<TTools[K]>, ToolResult<TTools[K]>>;
        const parsed = obj.parameters ? obj.parameters.parse(args) : args;
        return obj.execute(parsed);
    }
    throw new TypeError(`Tool "${String(key)}" is not callable`);
}

/** Helper to define tools with full inference */
export function defineTools<
    T extends Record<string, Tool<unknown, unknown>>,
>(t: T) {
    return t;
}

export const jobEndpointSchema = z.object({
    id: z.string().min(1),
    jobId: z.string().min(1),
    tenantId: z.string().min(1),
    name: z.string().min(1),
    // baseline
    baselineCron: z.string().min(1).optional(),
    baselineIntervalMs: z.coerce.number().optional(),
    // hints
    aiHintNextRunAt: z.coerce.date().optional(),
    aiHintIntervalMs: z.coerce.number().optional(),
    aiHintExpiresAt: z.coerce.date().optional(),
    aiHintReason: z.string().min(1).optional(),
    // guardrails/ops
    minIntervalMs: z.coerce.number(),
    maxIntervalMs: z.coerce.number().optional(),
    pausedUntil: z.coerce.date().optional(),
    lockedUntil: z.coerce.date().optional(),
    // state
    nextRunAt: z.coerce.date(),
    lastRunAt: z.coerce.date().optional(),
    failureCount: z.coerce.number().min(0).default(0),
    lastStatus: z.enum(["success", "failed", "running", "canceled"]).optional(),
});
export type JobEndpoint = z.infer<typeof jobEndpointSchema>;
// Core data
// export type JobEndpoint = {
//     id: string;
//     jobId: string;
//     tenantId: string;
//     name: string;
//     // baseline
//     baselineCron?: string;
//     baselineIntervalMs?: number;
//     // hints
//     aiHintNextRunAt?: Date;
//     aiHintIntervalMs?: number;
//     aiHintExpiresAt?: Date;
//     aiHintReason?: string;
//     // guardrails/ops
//     minIntervalMs: number;
//     maxIntervalMs?: number;
//     pausedUntil?: Date;
//     lockedUntil?: Date;
//     // state
//     nextRunAt: Date;
//     lastRunAt?: Date;
//     failureCount: number;
//     lastStatus?: "success" | "failed" | "running" | "canceled";
// };
