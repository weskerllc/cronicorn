/**
 * Job entity - organizational container for related endpoints.
 */

/**
 * Job lifecycle status.
 */
export type JobStatus = "active" | "archived";

/**
 * Job - groups related endpoints for organizational purposes.
 *
 * Jobs serve as containers to organize endpoints (e.g., all endpoints for a flash sale,
 * all monitoring endpoints for a service). They provide a logical grouping for UI/UX
 * and enable batch operations on related endpoints.
 */
export type Job = {
  readonly id: string;
  readonly userId: string; // Owner of this job (replaced tenantId/ownerUserId per MVP simplification)
  readonly name: string;
  readonly description?: string;
  readonly status: JobStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
};
