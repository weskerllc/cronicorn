import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { runsQueryOptions } from "../lib/api-client/queries/runs.queries";

// Validate search params for filtering
const runsSearchSchema = z.object({
  status: z.enum(["all", "success", "failed"]).optional().default("all"),
  dateRange: z.string().optional(),
});

export const Route = createFileRoute("/endpoints/$id/runs")({
  validateSearch: runsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, context, deps }) => {
    const filters = deps.search.status !== "all" ? { status: deps.search.status } : undefined;
    await context.queryClient.ensureQueryData(runsQueryOptions(params.id, filters));
  },
  component: RunsListPage,
});

function RunsListPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const filters = search.status !== "all" ? { status: search.status } : undefined;
  const { data } = useSuspenseQuery(runsQueryOptions(id, filters));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Run History</h1>

      {/* TODO: Filters UI - status dropdown, date range picker */}
      <div className="mb-6 flex gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-2">
            Status
          </label>
          <select
            id="status"
            value={search.status}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium mb-2">
            Date Range
          </label>
          <select id="dateRange" className="px-3 py-2 border rounded-lg">
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* TODO: RunsTable with status badges, duration, timestamp */}
      {data.runs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No runs found for the selected filters.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Run ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Duration</th>
                <th className="px-4 py-2 text-left">Timestamp</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map(run => (
                <tr key={run.runId} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{run.runId.substring(0, 8)}</td>
                  <td className="px-4 py-2">
                    {/* TODO: Status badge with color coding */}
                    <span className={`px-2 py-1 text-xs rounded ${run.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {run.durationMs}
                    ms
                  </td>
                  <td className="px-4 py-2 text-sm">{new Date(run.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/runs/${run.runId}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO: Pagination - simple prev/next (50 runs per page) */}
      <div className="mt-6 text-sm text-gray-600">
        TODO: Pagination controls
      </div>
    </div>
  );
}
