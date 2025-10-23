import type { Logger } from "../ports/observability.js";

/**
 * Log level enum for type safety
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Captured log entry with level, optional object, and message
 */
export type LogEntry = {
  level: LogLevel;
  obj?: Record<string, unknown>;
  msg?: string;
};

/**
 * Fake Logger implementation for testing.
 *
 * Captures all log calls in memory with level and structured context.
 * Supports child loggers with persistent bindings.
 *
 * @example
 * const logger = new FakeLogger();
 * logger.info({ userId: '123' }, 'user logged in');
 * expect(logger.logs).toHaveLength(1);
 * expect(logger.logs[0]).toEqual({
 *   level: 'info',
 *   obj: { userId: '123' },
 *   msg: 'user logged in'
 * });
 */
export class FakeLogger implements Logger {
  /** All captured log entries in order */
  public readonly logs: LogEntry[] = [];

  /** Persistent bindings from parent loggers */
  private readonly bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  info: Logger["info"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    this.capture("info", msgOrObj, msg);
  };

  warn: Logger["warn"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    this.capture("warn", msgOrObj, msg);
  };

  error: Logger["error"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    this.capture("error", msgOrObj, msg);
  };

  debug: Logger["debug"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    this.capture("debug", msgOrObj, msg);
  };

  child: Logger["child"] = (bindings: Record<string, unknown>): Logger => {
    // Merge parent and new bindings
    const merged = { ...this.bindings, ...bindings };
    // Create child with shared logs array
    const childLogger = Object.create(
      FakeLogger.prototype,
      Object.getOwnPropertyDescriptors(new FakeLogger(merged)),
    );
    // Share logs array so parent sees child's logs
    Object.defineProperty(childLogger, "logs", {
      value: this.logs,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    return childLogger;
  };

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs.length = 0;
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((entry) => entry.level === level);
  }

  private capture(
    level: LogLevel,
    msgOrObj: string | Record<string, unknown>,
    msg?: string,
  ): void {
    if (typeof msgOrObj === "string") {
      // Message-only form
      const entry: LogEntry = { level, msg: msgOrObj };
      // Include bindings if present
      if (Object.keys(this.bindings).length > 0) {
        entry.obj = this.bindings;
      }
      this.logs.push(entry);
    } else {
      // Structured form with bindings merged
      const mergedObj = { ...this.bindings, ...msgOrObj };
      this.logs.push({ level, obj: mergedObj, msg });
    }
  }
}
