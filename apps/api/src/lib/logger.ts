/**
 * Centralized Pino logger for API server
 *
 * Provides structured logging for all API operations.
 * Configured based on NODE_ENV and LOG_LEVEL environment variables.
 */

import pino from "pino";

// eslint-disable-next-line node/no-process-env
const NODE_ENV = process.env.NODE_ENV || "development";
// eslint-disable-next-line node/no-process-env
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");

/**
 * Global Pino logger instance
 * - Development: Pretty-printed with colors
 * - Production: JSON structured logs
 */
export const logger = pino({
  level: LOG_LEVEL,
  ...(NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});
