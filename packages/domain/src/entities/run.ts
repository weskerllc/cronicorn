/**
 * Run status types based on current usage.
 * Reflects the actual status values used in the scheduler.
 */
export type RunStatus = "success" | "failed" | "canceled" | "running";

/**
 * Result of executing a job endpoint.
 */
export type ExecutionResult = {
    status: "success" | "failed";
    durationMs: number;
    errorMessage?: string;
};
