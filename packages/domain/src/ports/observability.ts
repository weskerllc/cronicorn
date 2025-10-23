/**
 * Observability ports (logging, metrics, tracing)
 */

/**
 * Logger port for structured logging.
 *
 * Supports message-only and structured (object + message) logging.
 * Use child loggers to add persistent context (e.g., endpointId, runId).
 *
 * @example
 * // Message-only logging
 * logger.info('operation completed');
 *
 * @example
 * // Structured logging with context
 * logger.info({ endpointId: '123', durationMs: 45 }, 'endpoint executed');
 *
 * @example
 * // Child logger with persistent context
 * const endpointLogger = logger.child({ endpointId: '123', jobId: '456' });
 * endpointLogger.info('execution started'); // Automatically includes endpointId and jobId
 */
export type Logger = {
  info: ((msg: string) => void) & ((obj: Record<string, unknown>, msg?: string) => void);
  warn: ((msg: string) => void) & ((obj: Record<string, unknown>, msg?: string) => void);
  error: ((msg: string) => void) & ((obj: Record<string, unknown>, msg?: string) => void);
  debug: ((msg: string) => void) & ((obj: Record<string, unknown>, msg?: string) => void);

  /**
   * Create child logger with persistent context bindings.
   *
   * All logs from child include parent's bindings plus new bindings.
   * Useful for request/endpoint scoping.
   *
   * @param bindings - Key-value pairs to include in all child logs
   * @returns New logger instance with persistent bindings
   *
   * @example
   * const endpointLogger = logger.child({ endpointId: '123', jobId: '456' });
   * endpointLogger.info('execution started');
   * // Output includes: { endpointId: '123', jobId: '456', msg: 'execution started' }
   */
  child: (bindings: Record<string, unknown>) => Logger;
};
