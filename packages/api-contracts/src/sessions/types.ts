import type { z } from "@hono/zod-openapi";

import type {
  AISessionSchema,
  ListSessionsQuerySchema,
  ListSessionsResponseSchema,
  ToolCallSchema,
} from "./schemas.js";

// ==================== Inferred TypeScript Types ====================

export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;
export type AISession = z.infer<typeof AISessionSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
