import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { endpointsQueryOptions, jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/jobs/$id/")({
  loader: async ({ params, context }) => {
    const jobPromise = context.queryClient.ensureQueryData(jobQueryOptions(params.id));
    const endpointsPromise = context.queryClient.ensureQueryData(
      endpointsQueryOptions(params.id),
    );
    await Promise.all([jobPromise, endpointsPromise]);
  },
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { id } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(id));
  const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* TODO: JobHeader - job name/description (editable inline), status badge, actions dropdown */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{job.name}</h1>
        {job.description && <p className="text-gray-600 mt-2">{job.description}</p>}
        <div className="mt-4 flex gap-2">
          <a
            href={`/jobs/${id}/endpoints/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Endpoint
          </a>
          <a
            href={`/jobs/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Edit Job
          </a>
          {/* TODO: Archive, Delete actions */}
        </div>
      </div>

      {/* TODO: EndpointsList table - endpoint name, URL, method, schedule, status, last run, actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Endpoints</h2>
        {endpointsData.endpoints.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No endpoints configured yet.</p>
            <a
              href={`/jobs/${id}/endpoints/new`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add First Endpoint
            </a>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">URL</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {endpointsData.endpoints.map(endpoint => (
                  <tr key={endpoint.id} className="border-t">
                    <td className="px-4 py-2">{endpoint.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{endpoint.url}</td>
                    <td className="px-4 py-2">
                      {/* TODO: Status badge based on endpoint state */}
                      <span className="text-sm">Active</span>
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={`/jobs/${id}/endpoints/${endpoint.id}/edit`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TODO: RecentActivity feed - last 10 runs across all endpoints */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-600 text-sm">TODO: Show last 10 runs with status, duration, timestamp</p>
      </div>
    </div>
  );
}
