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
    planWithTools: (args: { model: string; input: string; tools: Tools<AnyTools>; maxTokens: number }) => Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;
};

export type ToolFn<P, R> = (args: P) => Promise<R>;

/** Object-shaped tool (SDK-style) */
export type ToolObj<P, R> = {
    description?: string;
    execute: (args: P) => Promise<R>;
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
        // eslint-disable-next-line ts/consistent-type-assertions
        return tool.execute(args) as Promise<ToolResult<TTools[K]>>;
    }
    throw new TypeError(`Tool "${String(key)}" is not callable`);
}

/** Helper to define tools with full inference */
export function defineTools<
    T extends Record<string, Tool<unknown, unknown>>,
>(t: T) {
    return t;
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
