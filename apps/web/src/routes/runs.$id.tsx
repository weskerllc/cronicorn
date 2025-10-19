import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { runQueryOptions } from "../lib/api-client/queries/runs.queries";

export const Route = createFileRoute("/runs/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(runQueryOptions(params.id));
  },
  component: RunDetailsPage,
});

function RunDetailsPage() {
  const { id } = Route.useParams();
  const { data: run } = useSuspenseQuery(runQueryOptions(id));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Run Details</h1>

      {/* TODO: RunSummary section - status, duration, timestamp, endpoint, job, source */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">{run.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="font-medium">{run.durationMs}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Started At</p>
            <p className="font-medium">{new Date(run.startedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Finished At</p>
            <p className="font-medium">
              {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Endpoint Details */}
      {run.endpoint && (
        <div className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Endpoint Details</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{run.endpoint.name}</span>
            </div>
            {run.endpoint.url && (
              <div>
                <span className="text-sm text-gray-600">URL:</span>
                <span className="ml-2 font-mono text-sm">{run.endpoint.url}</span>
              </div>
            )}
            {run.endpoint.method && (
              <div>
                <span className="text-sm text-gray-600">Method:</span>
                <span className="ml-2 font-medium">{run.endpoint.method}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Details */}
        <div className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Request Details</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Endpoint ID:</span> 
              <span className="ml-2 font-mono text-sm">{run.endpointId}</span>
            </div>
          </div>
        </div>

      {/* Response Details */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Response Details</h2>
        
        {run.statusCode && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">Status Code:</span>
            <span className={`ml-2 font-medium ${
              run.statusCode >= 200 && run.statusCode < 300 ? "text-green-600" :
              run.statusCode >= 400 ? "text-red-600" : "text-gray-900"
            }`}>
              {run.statusCode}
            </span>
          </div>
        )}
        
        {run.errorMessage ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Error</p>
            <pre className="text-sm mt-2 whitespace-pre-wrap">{run.errorMessage}</pre>
          </div>
        ) : run.responseBody ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">Response Body:</p>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto max-h-96">
              {JSON.stringify(run.responseBody, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No response body captured</p>
        )}
      </div>

      {/* TODO: SchedulingInfo - next run time, current interval, active AI hints */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Scheduling Info</h2>
        <p className="text-sm text-gray-600">
          TODO: Next scheduled run, current interval, AI hints if any
        </p>
      </div>
    </div>
  );
}
