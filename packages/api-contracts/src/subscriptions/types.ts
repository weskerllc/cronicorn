import type { z } from "zod";

import type * as schemas from "./schemas.js";

// ==================== Subscription Types ====================

export type CreateCheckoutRequest = z.infer<typeof schemas.CreateCheckoutRequestSchema>;
export type CreateCheckoutResponse = z.infer<typeof schemas.CreateCheckoutResponseSchema>;
export type CreatePortalRequest = z.infer<typeof schemas.CreatePortalRequestSchema>;
export type CreatePortalResponse = z.infer<typeof schemas.CreatePortalResponseSchema>;
export type SubscriptionStatusResponse = z.infer<typeof schemas.SubscriptionStatusResponseSchema>;
export type ErrorResponse = z.infer<typeof schemas.ErrorSchema>;
