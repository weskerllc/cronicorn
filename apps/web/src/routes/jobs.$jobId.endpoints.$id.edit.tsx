import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { clearHints, pauseEndpoint, resetFailures } from "../lib/api-client/queries/endpoints.queries";
import { endpointQueryOptions } from "../lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "../lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/jobs/$jobId/endpoints/$id/edit")({
  loader: async ({ params, context }) => {
    const jobPromise = context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
    const endpointPromise = context.queryClient.ensureQueryData(
      endpointQueryOptions(params.jobId, params.id),
    );
    await Promise.all([jobPromise, endpointPromise]);
  },
  component: EditEndpointPage,
});

function EditEndpointPage() {
  const { jobId, id } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const { data: endpoint } = useSuspenseQuery(endpointQueryOptions(jobId, id));
  
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handlePause = async () => {
    setPauseLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const isPaused = endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date();
      await pauseEndpoint(id, {
        pausedUntil: isPaused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setActionSuccess(isPaused ? "Endpoint resumed" : "Endpoint paused for 24 hours");
      setTimeout(() => window.location.reload(), 1000);
    }
    catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to pause endpoint");
    }
    finally {
      setPauseLoading(false);
    }
  };

  const handleResetFailures = async () => {
    setResetLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await resetFailures(id);
      setActionSuccess("Failure count reset");
      setTimeout(() => window.location.reload(), 1000);
    }
    catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to reset failures");
    }
    finally {
      setResetLoading(false);
    }
  };

  const handleClearHints = async () => {
    setClearLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await clearHints(id);
      setActionSuccess("AI hints cleared");
      setTimeout(() => window.location.reload(), 1000);
    }
    catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear hints");
    }
    finally {
      setClearLoading(false);
    }
  };

  const isPaused = endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date();
  
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const method = formData.get("method") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

    try {
      const { updateEndpoint } = await import("../lib/api-client/queries/endpoints.queries");
      await updateEndpoint(jobId, id, { name, url, method });
      setEditSuccess("Endpoint updated successfully");
      setTimeout(() => window.location.reload(), 1000);
    }
    catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update endpoint");
    }
    finally {
      setEditLoading(false);
    }
  };

  // TODO: Complete form validation with Zod

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <a href={`/jobs/${jobId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to {job.name}
        </a>
      </div>

      {/* AI Hint Visualization */}
      {(endpoint.aiHintIntervalMs || endpoint.aiHintNextRunAt || endpoint.aiHintReason) && (
        <div className="mb-8 p-6 border-2 border-purple-200 rounded-lg bg-purple-50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-xl font-semibold text-purple-900">AI Scheduling Hint Active</h2>
          </div>
          
          <div className="space-y-3">
            {endpoint.aiHintIntervalMs && (
              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-sm text-gray-600">Suggested Interval</p>
                <p className="font-medium text-purple-900">
                  {Math.round(endpoint.aiHintIntervalMs / 60000)} minutes
                  <span className="text-sm text-gray-500 ml-2">
                    ({endpoint.aiHintIntervalMs}ms)
                  </span>
                </p>
              </div>
            )}
            
            {endpoint.aiHintNextRunAt && (
              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-sm text-gray-600">Suggested Next Run</p>
                <p className="font-medium text-purple-900">
                  {new Date(endpoint.aiHintNextRunAt).toLocaleString()}
                </p>
              </div>
            )}
            
            {endpoint.aiHintExpiresAt && (
              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-sm text-gray-600">Hint Expires</p>
                <p className={`font-medium ${
                  new Date(endpoint.aiHintExpiresAt) < new Date() 
                    ? "text-red-600" 
                    : "text-purple-900"
                }`}>
                  {new Date(endpoint.aiHintExpiresAt).toLocaleString()}
                  {new Date(endpoint.aiHintExpiresAt) < new Date() && (
                    <span className="ml-2 text-sm">(Expired)</span>
                  )}
                </p>
              </div>
            )}
            
            {endpoint.aiHintReason && (
              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-sm text-gray-600">Reason</p>
                <p className="text-sm text-gray-700 italic">{endpoint.aiHintReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">Edit Endpoint</h1>

      {editError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {editError}
        </div>
      )}
      
      {editSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          {editSuccess}
        </div>
      )}

      {/* TODO: EditEndpointForm pre-populated with endpoint data */}
      <form onSubmit={handleEditSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Endpoint Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={endpoint.name}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            URL *
          </label>
          <input
            type="url"
            id="url"
            name="url"
            defaultValue={endpoint.url}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="method" className="block text-sm font-medium mb-2">
            HTTP Method *
          </label>
          <select id="method" name="method" defaultValue={endpoint.method} className="w-full px-3 py-2 border rounded-lg">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={editLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </button>
          <a
            href={`/jobs/${jobId}`}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>

      {/* Endpoint Actions */}
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-4">Endpoint Actions</h2>
        
        {actionError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {actionError}
          </div>
        )}
        
        {actionSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
            {actionSuccess}
          </div>
        )}
        
        <div className="space-y-2">
          <button
            onClick={handlePause}
            disabled={pauseLoading}
            className="block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {pauseLoading ? "Loading..." : isPaused ? "Resume Endpoint" : "Pause Endpoint"}
          </button>
          <button
            onClick={handleResetFailures}
            disabled={resetLoading}
            className="block px-4 py-2 border rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {resetLoading ? "Loading..." : "Reset Failure Count"}
          </button>
          <button
            onClick={handleClearHints}
            disabled={clearLoading}
            className="block px-4 py-2 border rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {clearLoading ? "Loading..." : "Clear AI Hints"}
          </button>
        </div>
        
        <div className="mt-6 bg-gray-50 p-4 rounded">
          <h3 className="text-sm font-semibold mb-2">Endpoint State</h3>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify({ 
              pausedUntil: endpoint.pausedUntil,
              failureCount: endpoint.failureCount,
              lastRunAt: endpoint.lastRunAt,
              nextRunAt: endpoint.nextRunAt
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
