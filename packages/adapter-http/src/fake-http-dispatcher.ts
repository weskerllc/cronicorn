import type { Dispatcher, ExecutionResult, JobEndpoint } from "@cronicorn/domain";

/**
 * Test stub for Dispatcher port.
 * Allows tests to control execution behavior without actual HTTP requests.
 *
 * Usage:
 * ```typescript
 * // Default: always succeeds with 100ms duration
 * const dispatcher = new FakeHttpDispatcher();
 *
 * // Custom behavior
 * const dispatcher = new FakeHttpDispatcher((ep) => {
 *   if (ep.url?.includes('fail')) {
 *     return { status: 'failed', durationMs: 50, errorMessage: 'Simulated failure' };
 *   }
 *   return { status: 'success', durationMs: 100 };
 * });
 * ```
 */
export class FakeHttpDispatcher implements Dispatcher {
    constructor(
        private plan: (ep: JobEndpoint) => ExecutionResult = () => ({
            status: "success",
            durationMs: 100,
        }),
    ) { }

    async execute(ep: JobEndpoint): Promise<ExecutionResult> {
        return this.plan(ep);
    }
}
