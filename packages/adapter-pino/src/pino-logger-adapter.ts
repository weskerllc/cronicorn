import type { Logger } from "@cronicorn/domain";
import type { Logger as PinoLogger } from "pino";

/**
 * Pino implementation of the Logger port.
 *
 * Wraps a pino logger instance and delegates to pino's methods.
 * Supports both message-only and structured logging patterns.
 */
export class PinoLoggerAdapter implements Logger {
  constructor(private readonly pino: PinoLogger) {}

  info: Logger["info"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    if (typeof msgOrObj === "string") {
      this.pino.info(msgOrObj);
    }
    else {
      this.pino.info(msgOrObj, msg);
    }
  };

  warn: Logger["warn"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    if (typeof msgOrObj === "string") {
      this.pino.warn(msgOrObj);
    }
    else {
      this.pino.warn(msgOrObj, msg);
    }
  };

  error: Logger["error"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    if (typeof msgOrObj === "string") {
      this.pino.error(msgOrObj);
    }
    else {
      this.pino.error(msgOrObj, msg);
    }
  };

  debug: Logger["debug"] = (msgOrObj: string | Record<string, unknown>, msg?: string): void => {
    if (typeof msgOrObj === "string") {
      this.pino.debug(msgOrObj);
    }
    else {
      this.pino.debug(msgOrObj, msg);
    }
  };

  child: Logger["child"] = (bindings: Record<string, unknown>): Logger => {
    return new PinoLoggerAdapter(this.pino.child(bindings));
  };
}
