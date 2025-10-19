import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { jobQueryOptions } from "../lib/api-client/queries/jobs.queries";
import { createEndpoint } from "../lib/api-client/queries/endpoints.queries";

export const Route = createFileRoute("/jobs/$jobId/endpoints/new")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
  },
  component: CreateEndpointPage,
});

function CreateEndpointPage() {
  const { jobId } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const method = formData.get("method") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const intervalMinutes = formData.get("baselineIntervalMs") as string;

    try {
      await createEndpoint(jobId, {
        name,
        url,
        method,
        baselineIntervalMs: intervalMinutes ? Number.parseInt(intervalMinutes) * 60 * 1000 : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints"] });
      navigate({ to: `/jobs/${jobId}` });
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create endpoint");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a href={`/jobs/${jobId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to {job.name}
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-8">Add Endpoint</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* TODO: CreateEndpointForm (url, method, schedule, headers, body) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Endpoint Name *
          </label>
          <input
            type="text"
            id="name"
            required
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Fetch Users API"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            URL *
          </label>
          <input
            type="url"
            id="url"
            required
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="https://api.example.com/users"
          />
        </div>

        <div>
          <label htmlFor="method" className="block text-sm font-medium mb-2">
            HTTP Method *
          </label>
          <select id="method" className="w-full px-3 py-2 border rounded-lg">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label htmlFor="baselineIntervalMs" className="block text-sm font-medium mb-2">
            Baseline Interval (minutes)
          </label>
          <input
            type="number"
            id="baselineIntervalMs"
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="5"
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            How often should this endpoint run?
          </p>
        </div>

        {/* TODO: Advanced section (collapsible) - headers, body, timeout, max response size */}
        <details className="border rounded-lg p-4">
          <summary className="font-medium cursor-pointer">
            Advanced Options
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              TODO: Request headers (key-value pairs), Request body (JSON editor), Timeout, Max response size
            </p>
          </div>
        </details>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Endpoint"}
          </button>
          <a
            href={`/jobs/${jobId}`}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
