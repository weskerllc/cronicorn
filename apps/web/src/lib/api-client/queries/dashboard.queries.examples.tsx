/**
 * Dashboard Query Usage Examples
 *
 * This file demonstrates how to use the dashboard query helpers
 * in React components with TanStack Query.
 */

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { dashboardStatsQueryOptions } from "./dashboard.queries";

// ==================== Basic Usage ====================

/**
 * Simple dashboard stats fetch with loading states
 */
export function DashboardStatsBasic() {
  const { data, isLoading, error } = useQuery(dashboardStatsQueryOptions());

  if (isLoading) return <div>Loading dashboard stats...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>Dashboard Stats</h2>
      <p>Total Jobs: {data.jobs.total}</p>
      <p>Active Endpoints: {data.endpoints.active}</p>
      <p>Success Rate: {data.successRate.overall.toFixed(1)}%</p>
    </div>
  );
}

// ==================== With Suspense ====================

/**
 * Dashboard stats using Suspense boundaries
 * (Requires Suspense/ErrorBoundary wrapper in parent)
 */
export function DashboardStatsSuspense() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions());

  return (
    <div>
      <h2>Dashboard Stats</h2>
      <p>Total Jobs: {data.jobs.total}</p>
      <p>Active Endpoints: {data.endpoints.active}</p>
      <p>Success Rate: {data.successRate.overall.toFixed(1)}%</p>
    </div>
  );
}

// ==================== Custom Time Range ====================

/**
 * Dashboard stats with custom time range
 */
export function DashboardStatsCustomRange() {
  const days = 30; // Last 30 days
  const { data, isLoading } = useQuery(dashboardStatsQueryOptions({ days }));

  if (isLoading) return <div>Loading...</div>;
  if (!data) return null;

  return (
    <div>
      <h2>Dashboard Stats (Last {days} Days)</h2>
      <p>Total Jobs: {data.jobs.total}</p>
      <p>Success Rate: {data.successRate.overall.toFixed(1)}%</p>
      <p>Trend: {data.successRate.trend === "up" ? "↑" : data.successRate.trend === "down" ? "↓" : "→"}</p>
    </div>
  );
}

// ==================== Chart Data Example ====================

/**
 * Using time-series data for charts
 */
export function DashboardTimeSeriesChart() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions({ days: 7 }));

  return (
    <div>
      <h3>Run Time Series (Last 7 Days)</h3>
      {data.runTimeSeries.map((point) => (
        <div key={point.date}>
          {point.date}: {point.success} ✓ / {point.failure} ✗
        </div>
      ))}
    </div>
  );
}

// ==================== Top Endpoints Example ====================

/**
 * Displaying top performing endpoints
 */
export function DashboardTopEndpoints() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions());

  return (
    <div>
      <h3>Top Endpoints</h3>
      <ul>
        {data.topEndpoints.map((ep) => (
          <li key={ep.id}>
            {ep.name} ({ep.jobName}) - Success Rate: {ep.successRate.toFixed(1)}% 
            ({ep.runCount} runs)
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==================== Recent Activity Example ====================

/**
 * Recent runs activity feed
 */
export function DashboardRecentRuns() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions());

  return (
    <div>
      <h3>Recent Activity</h3>
      <p>Runs in last 24h: {data.recentActivity.runs24h}</p>
      <p>Success: {data.recentActivity.success24h} | Failed: {data.recentActivity.failure24h}</p>
      <h4>Latest Runs</h4>
      <ul>
        {data.recentRuns.map((run) => (
          <li key={run.id}>
            {run.endpointName} ({run.jobName}) - 
            Status: {run.status} - 
            Duration: {run.durationMs}ms - 
            {new Date(run.startedAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
