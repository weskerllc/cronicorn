import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { jobsQueryOptions } from "../lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(jobsQueryOptions());

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* TODO: JobsList component - display job cards with key metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Jobs</h2>
        <div className="text-gray-600">
          {data.jobs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              {/* TODO: Empty state for new users with "Create First Job" CTA */}
              <p className="mb-4">No jobs yet. Create your first job to get started!</p>
              <a
                href="/jobs/new"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Your First Job
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* TODO: Map jobs to JobCard components */}
              {data.jobs.map(job => (
                <div key={job.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold">{job.name}</h3>
                  <p className="text-sm text-gray-500">{job.description}</p>
                  <p className="text-sm mt-2">
                    Endpoints:
                    {" "}
                    {job.endpointCount || 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TODO: AccountSummaryCard - show tier, quota usage, upgrade CTA if needed */}
      <div className="p-6 border rounded-lg bg-blue-50 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Summary</h2>
        <p className="text-sm text-gray-600">
          TODO: Display current tier, endpoints used/limit, AI tokens usage
        </p>
      </div>

      {/* Raw Jobs Data */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Jobs Data</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
