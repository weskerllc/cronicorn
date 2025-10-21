import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Archive, Edit, Plus } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { GetJobsResponse } from "@/lib/api-client/queries/jobs.queries";
import {
  JOBS_QUERY_KEY,
  archiveJob,
  jobsQueryOptions,
} from "@/lib/api-client/queries/jobs.queries";
import { DataTable } from "@/components/data-table";

type JobRow = GetJobsResponse["jobs"][number];

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

  const columns: Array<ColumnDef<JobRow>> = [
    {
      accessorKey: "name",
      header: "Job Name",
      cell: ({ row }) => (
        <Link
          to="/jobs/$id"
          params={{ id: row.original.id }}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-md">
          {row.original.description ? (
            <span className="text-sm text-gray-600 line-clamp-2">{row.original.description}</span>
          ) : (
            <span className="text-sm text-gray-400 italic">No description</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "endpointCount",
      header: () => <div className="text-right">Endpoints</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Badge variant="outline">
            {row.original.endpointCount} {row.original.endpointCount === 1 ? "endpoint" : "endpoints"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
            >
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/jobs/$id" params={{ id: row.original.id }}>
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$id/edit" params={{ id: row.original.id }}>
                <Edit className="size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleArchive(row.original.id, row.original.name)}
              disabled={archiveMutation.isPending}
              className="text-red-600"
            >
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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
        <>
          <DataTable
            columns={columns}
            data={jobs}
            searchKey="name"
            searchPlaceholder="Search jobs..."
            emptyMessage="No jobs found."
            enablePagination={true}
            defaultPageSize={10}
          />
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Click on a job name to view its details, endpoints, and recent
              activity.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
