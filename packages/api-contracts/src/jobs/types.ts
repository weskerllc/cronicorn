import type { z } from "zod";

import type * as schemas from "./schemas.js";

// ==================== Job Lifecycle Types ====================

export type CreateJobRequest = z.infer<typeof schemas.CreateJobRequestSchema>;
export type UpdateJobRequest = z.infer<typeof schemas.UpdateJobRequestSchema>;
export type JobResponse = z.infer<typeof schemas.JobResponseSchema>;
export type JobWithCountResponse = z.infer<typeof schemas.JobWithCountResponseSchema>;

// ==================== Endpoint Orchestration Types ====================

export type AddEndpointRequest = z.infer<typeof schemas.AddEndpointRequestSchema>;
export type UpdateEndpointRequest = z.infer<typeof schemas.UpdateEndpointRequestSchema>;
export type EndpointResponse = z.infer<typeof schemas.EndpointResponseSchema>;

// ==================== Adaptive Scheduling Types ====================

export type ApplyIntervalHintRequest = z.infer<typeof schemas.ApplyIntervalHintRequestSchema>;
export type ScheduleOneShotRequest = z.infer<typeof schemas.ScheduleOneShotRequestSchema>;
export type PauseResumeRequest = z.infer<typeof schemas.PauseResumeRequestSchema>;

// ==================== Execution Visibility Types ====================

export type ListRunsQuery = z.infer<typeof schemas.ListRunsQuerySchema>;
export type RunSummaryResponse = z.infer<typeof schemas.RunSummaryResponseSchema>;
export type ListRunsResponse = z.infer<typeof schemas.ListRunsResponseSchema>;
export type RunDetailsResponse = z.infer<typeof schemas.RunDetailsResponseSchema>;
export type HealthSummaryQuery = z.infer<typeof schemas.HealthSummaryQuerySchema>;
export type HealthSummaryResponse = z.infer<typeof schemas.HealthSummaryResponseSchema>;
