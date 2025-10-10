/**
 * @cronicorn/scheduler - AI-Powered Job Scheduler
 *
 * Public API exports for the scheduler package.
 * Use this in production apps/api to instantiate the scheduler.
 */

// Scheduler-specific AI tool types
export type {
  AIClient,
  Tool,
  ToolArgs,
  ToolFn,
  ToolObj,
  ToolResult,
  Tools,
} from "./domain/ports.js";

// Tool utilities (for building custom AI tool integrations)
export { callTool, defineTools, tool } from "./domain/ports.js";

// Core scheduler class (composition root)
export { Scheduler } from "./domain/scheduler.js";
