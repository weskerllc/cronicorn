import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";
import { EmptyCTA } from "../../components/cards/empty-cta";
import { PageHeader } from "../../components/composed/page-header";
import { PageSection } from "@/components/primitives/page-section";
;
import type { ColumnDef } from "@tanstack/react-table";

import type { GetJobsResponse } from "@/lib/api-client/queries/jobs.queries";
import {
  JOBS_QUERY_KEY,
  archiveJob,
  jobsQueryOptions,
} from "@/lib/api-client/queries/jobs.queries";
import { DASHBOARD_QUERY_KEY } from "@/lib/api-client/queries/dashboard.queries";
import { DataTable } from "@/components/composed/data-table";

type JobRow = GetJobsResponse["jobs"][number];

type StatusFilter = "all" | "active" | "paused" | "archived";

export const Route = createFileRoute("/_authed/jobs/")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: JobsListPage,
});

function JobsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  // Query with status filter
  const { data: jobsData } = useSuspenseQuery(
    jobsQueryOptions(statusFilter === "all" ? {} : { status: statusFilter })
  );

  // Since we're filtering at the API level now, use all jobs returned
  const jobs = jobsData.jobs;

  const columns: Array<ColumnDef<JobRow>> = [
    {
      accessorKey: "name",
      header: "Job Name",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-md">
          {row.original.description ? (
            <span className="text-sm text-muted-foreground line-clamp-2">{row.original.description}</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">No description</span>
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
  ];

  return (
    <>

      <PageHeader
        text="Jobs"
        description="Manage your scheduled jobs and their endpoints"
        slotRight={
          <div className="flex gap-2 items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="paused">Paused Only</SelectItem>
                <SelectItem value="archived">Archived Only</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link to="/jobs/new">
                <Plus className="size-4" />
                Create Job
              </Link>
            </Button>
          </div>
        }
      />

      <PageSection>
        {jobs.length === 0 ? (
          <EmptyCTA
            title="No Jobs Yet"
            description="Create your first job to start scheduling"
          />
        ) : (
          <DataTable
            columns={columns}
            data={jobs}
            searchKey="name"
            searchPlaceholder="Search jobs..."
            emptyMessage="No jobs found."
            enablePagination={true}
            defaultPageSize={10}
            onRowClick={(job) => navigate({ to: "/jobs/$id", params: { id: job.id } })}
          />
        )}
      </PageSection>
    </>
  );
}
