import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { healthQueryOptions } from "../../../../lib/api-client/queries/runs.queries";

export const Route = createFileRoute("/endpoints/$id/health/")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(healthQueryOptions(params.id));
  },
  component: EndpointHealthPage,
});

function EndpointHealthPage() {
  const { id } = Route.useParams();
  const { data: health } = useSuspenseQuery(healthQueryOptions(id));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Endpoint Health</h1>

      {/* TODO: HealthMetrics cards - success rate, total runs, avg duration, failure count */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-600 mb-2">Success Rate</h3>
        <p className="text-2xl font-bold">
          {health.successCount + health.failureCount > 0
            ? `${((health.successCount / (health.successCount + health.failureCount)) * 100).toFixed(1)}%`
            : "N/A"}
        </p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-600 mb-2">Total Runs</h3>
        <p className="text-2xl font-bold">{health.successCount + health.failureCount}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm text-gray-600 mb-2">Avg Duration</h3>
        <p className="text-2xl font-bold">
          {health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
        </p>
      </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Failures</p>
          <p className="text-2xl font-bold text-red-600">{health.failureCount || 0}</p>
        </div>
      </div>

            {/* Raw Health Data */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Health Summary Data</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>

      {/* TODO: Add health metrics visualization (charts) */}
      {/* TODO: Add configurable time range filter */}
      {/* TODO: Add recent failures section - need to fetch from runs API */}
      {/* TODO: Show failure streak info using health.failureStreak */}
      {/* TODO: Show last run status using health.lastRun */}
    </div>
  );
}
