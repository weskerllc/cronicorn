/**
 * Service-layer types for dashboard operations.
 * These are independent of API contracts (HTTP/JSON).
 */

export type JobStats = {
  total: number;
};

export type EndpointStats = {
  total: number;
  active: number;
  paused: number;
};

export type SuccessRateStats = {
  overall: number;
  trend: "up" | "down" | "stable";
};

export type RecentActivityStats = {
  runs24h: number;
  success24h: number;
  failure24h: number;
};

export type RunTimeSeriesPoint = {
  date: string; // YYYY-MM-DD format
  success: number;
  failure: number;
};

export type EndpointTimeSeriesPoint = {
  date: string; // YYYY-MM-DD format
  endpointId: string;
  endpointName: string;
  success: number;
  failure: number;
};

export type JobHealthItem = {
  jobId: string;
  jobName: string;
  successCount: number;
  failureCount: number;
};

export type FilteredMetrics = {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
};

export type SourceDistributionItem = {
  source: string;
  count: number;
};

export type AISessionTimeSeriesPoint = {
  date: string; // YYYY-MM-DD format
  endpointId: string;
  endpointName: string;
  sessionCount: number;
  totalTokens: number;
};

export type DashboardStats = {
  jobs: JobStats;
  endpoints: EndpointStats;
  successRate: SuccessRateStats;
  recentActivity: RecentActivityStats;
  jobHealth: JobHealthItem[];
  filteredMetrics: FilteredMetrics;
  sourceDistribution: SourceDistributionItem[];
  runTimeSeries: RunTimeSeriesPoint[];
  endpointTimeSeries: EndpointTimeSeriesPoint[];
  endpointTimeSeriesMaxStacked: number;
  aiSessionTimeSeries: AISessionTimeSeriesPoint[];
  aiSessionTimeSeriesMaxStacked: number;
};

// ==================== Job Activity Timeline Types ====================

export type ActivityEvent = {
  type: "run" | "session";
  id: string;
  endpointId: string;
  endpointName: string;
  timestamp: Date;
  // Run-specific fields
  status?: string;
  durationMs?: number;
  source?: string;
  // Session-specific fields
  reasoning?: string;
  toolCalls?: Array<{ tool: string; args: unknown; result: unknown }>;
  tokenUsage?: number;
};

export type JobActivityTimeline = {
  events: ActivityEvent[];
  total: number;
  summary: {
    runsCount: number;
    sessionsCount: number;
    successRate: number;
  };
};
