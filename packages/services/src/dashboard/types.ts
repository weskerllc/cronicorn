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

export type TopEndpoint = {
  id: string;
  name: string;
  jobName: string;
  successRate: number;
  lastRunAt: Date | null;
  runCount: number;
};

export type RecentRun = {
  id: string;
  endpointId: string;
  endpointName: string;
  jobName: string;
  status: string;
  startedAt: Date;
  durationMs: number | null;
  source: string | null;
};

export type RecentAISession = {
  id: string;
  endpointId: string;
  endpointName: string;
  jobName: string;
  analyzedAt: Date;
  reasoning: string;
  tokenUsage: number | null;
  durationMs: number | null;
  toolCallCount: number;
};

export type DashboardStats = {
  jobs: JobStats;
  endpoints: EndpointStats;
  successRate: SuccessRateStats;
  recentActivity: RecentActivityStats;
  runTimeSeries: RunTimeSeriesPoint[];
  topEndpoints: TopEndpoint[];
  recentRuns: RecentRun[];
  recentAISessions: RecentAISession[];
};
