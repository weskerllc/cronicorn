// Type definitions for Vercel AI SDK adapter

import type { LanguageModel } from "ai";

export type VercelAiClientConfig = {
    model: LanguageModel; // string for model names, unknown for pre-configured model instances
    maxOutputTokens?: number;
    temperature?: number;
    logger?: Logger;
    telemetry?: TelemetryHooks;
    retryPolicy?: RetryPolicy;
};

export type Logger = {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
};

export type TelemetryHooks = {
    onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
    onStepFinish?: (stepResult: unknown) => void;
};

export type RetryPolicy = {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
};
