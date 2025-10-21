import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Archive, Plus } from "lucide-react";

import { Button } from "@cronicorn/ui-library/components/button";

import {
  JOBS_QUERY_KEY,
  archiveJob,
  jobsQueryOptions,
} from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/jobs/")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: JobsListPage,
});

function JobsListPage() {
  const queryClient = useQueryClient();
  const { data: jobsData } = useSuspenseQuery(jobsQueryOptions());
  const jobs = jobsData.jobs;

  const archiveMutation = useMutation({
    mutationFn: archiveJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
    },
  });

  const handleArchive = (jobId: string, jobName: string) => {
    if (
      confirm(
        `Are you sure you want to archive "${jobName}"? This will archive all associated endpoints.`,
      )
    ) {
      archiveMutation.mutate(jobId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Jobs</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your scheduled jobs and their endpoints
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs/new">
            <Plus className="size-4" />
            Create Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="border rounded-lg p-8 sm:p-12 text-center bg-gray-50">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Create your first job to start scheduling API calls and tasks
            </p>
            <Button asChild>
              <Link to="/jobs/new">
                <Plus className="size-4" />
                Create Your First Job
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden sm:table-cell">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">
                    Endpoints
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to="/jobs/$id"
                        params={{ id: job.id }}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {job.description ? (
                        <span className="line-clamp-2">{job.description}</span>
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {job.endpointCount} {job.endpointCount === 1 ? "endpoint" : "endpoints"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/jobs/$id/edit" params={{ id: job.id }}>
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(job.id, job.name)}
                          disabled={archiveMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Archive className="size-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Archive</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Click on a job name to view its details, endpoints, and recent
            activity.
          </p>
        </div>
      )}
    </div>
  );
}
