import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive, Pause, Play, Plus } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { IconDotsVertical } from "@tabler/icons-react";

import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { EmptyCTA } from "@/components/empty-cta";
import { DataTable } from "@/components/data-table";
import {
  JOBS_QUERY_KEY,
  archiveJob,
  endpointsQueryOptions,
  jobQueryOptions,
  pauseJob,
  resumeJob,
} from "@/lib/api-client/queries/jobs.queries";

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

type EndpointRow = {
  id: string;
  name: string;
  url: string;
  method: string;
  status?: string;
};

function JobDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: job } = useSuspenseQuery(jobQueryOptions(id));
  const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));

  // Pause job mutation
  const {
    mutateAsync: pauseJobMutation,
    isPending: isPausing,
    error: pauseError,
  } = useMutation({
    mutationFn: () => pauseJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...JOBS_QUERY_KEY, id] });
    },
  });

  // Resume job mutation
  const {
    mutateAsync: resumeJobMutation,
    isPending: isResuming,
    error: resumeError,
  } = useMutation({
    mutationFn: () => resumeJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...JOBS_QUERY_KEY, id] });
    },
  });

  // Archive job mutation
  const {
    mutateAsync: archiveJobMutation,
    isPending: isArchiving,
    error: archiveError,
  } = useMutation({
    mutationFn: () => archiveJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      navigate({ to: "/jobs" });
    },
  });

  const handlePause = async () => {
    await pauseJobMutation();
  };

  const handleResume = async () => {
    await resumeJobMutation();
  };

  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this job? This action can be undone by resuming the job.")) {
      await archiveJobMutation();
    }
  };

  const error = pauseError || resumeError || archiveError;
  const isLoading = isPausing || isResuming || isArchiving;

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  };

  const columns: Array<ColumnDef<EndpointRow>> = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          to="/endpoints/$id"
          params={{ id: row.original.id }}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.url}</code>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="secondary" className="uppercase">
          {row.original.method}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => <Badge variant="default">Active</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                to="/endpoints/$id"
                params={{ id: row.original.id }}
              >
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/endpoints/$id/edit"
                params={{ id: row.original.id }}
              >
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/endpoints/$id/runs"
                params={{ id: row.original.id }}
              >
                View Runs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/endpoints/$id/health"
                params={{ id: row.original.id }}
              >
                View Health
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        text={job.name}
        description="Job Details"
        slotRight={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/jobs/$id/edit" params={{ id }}>
                Edit Job
              </Link>
            </Button>
            <Button asChild>
              <Link to="/jobs/$jobId/endpoints/new" params={{ jobId: id }}>
                <Plus className="size-4" />
                Add Endpoint
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred"}
          </AlertDescription>
        </Alert>
      )}

      {/* Job Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
          <CardDescription>
            View and manage this job's configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge variant={getStatusVariant(job.status)} className="mt-1 capitalize">
                {job.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Endpoints</div>
              <div className="mt-1 text-sm">{endpointsData.endpoints.length} endpoint(s)</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="mt-1 text-sm">{formatDate(job.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
              <div className="mt-1 text-sm">{formatDate(job.updatedAt)}</div>
            </div>
          </div>

          {job.description && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="mt-1 text-sm">{job.description}</div>
            </div>
          )}

          <div className="flex gap-2 border-t pt-4">
            {job.status === "paused" ? (
              <Button
                variant="default"
                onClick={handleResume}
                disabled={isLoading}
              >
                <Play className="size-4" />
                Resume Job
              </Button>
            ) : job.status === "active" ? (
              <Button
                variant="secondary"
                onClick={handlePause}
                disabled={isLoading}
              >
                <Pause className="size-4" />
                Pause Job
              </Button>
            ) : null}

            {job.status !== "archived" && (
              <Button
                variant="destructive"
                onClick={handleArchive}
                disabled={isLoading}
              >
                <Archive className="size-4" />
                Archive Job
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {endpointsData.endpoints.length === 0 ? (
        <EmptyCTA
          title="No Endpoints Yet"
          description="Add your first endpoint to start scheduling jobs"
          action={
            <Button asChild>
              <Link to="/jobs/$jobId/endpoints/new" params={{ jobId: id }}>
                <Plus className="size-4" />
                Add First Endpoint
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          tableTitle="Endpoints"
          columns={columns}
          data={endpointsData.endpoints.map(ep => ({
            id: ep.id,
            name: ep.name,
            url: ep.url || '',
            method: ep.method || 'GET',
            status: 'active',
          }))}
          searchKey="name"
          searchPlaceholder="Search endpoints..."
          emptyMessage="No endpoints found."
          enablePagination={true}
          defaultPageSize={10}
        />
      )}
    </>
  );
}
