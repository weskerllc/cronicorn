/**
 * Core job endpoint entity.
 * Pure domain type with no adapter-specific fields.
 */
export type JobEndpoint = {
    // Identity
    id: string;
    jobId: string;
    tenantId: string;
    name: string;

    // Baseline cadence (choose one)
    baselineCron?: string;
    baselineIntervalMs?: number;

    // AI hints (TTL-scoped)
    aiHintIntervalMs?: number;
    aiHintNextRunAt?: Date;
    aiHintExpiresAt?: Date;
    aiHintReason?: string;

    // Guardrails
    minIntervalMs?: number;
    maxIntervalMs?: number;

    // Pause control
    pausedUntil?: Date;

    // Runtime state
    lastRunAt?: Date;
    nextRunAt: Date;
    failureCount: number;

    // Execution config (dispatcher may use these)
    url?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headersJson?: Record<string, string>;
    bodyJson?: unknown;
};
