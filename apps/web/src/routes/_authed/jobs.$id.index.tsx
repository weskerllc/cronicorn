import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive, Pause, Play, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { IconDotsVertical } from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";
import { ActionsGroup } from "../../components/primitives/actions-group";

import { InfoField, InfoGrid } from "../../components/cards/info-grid";
import { DetailSection } from "../../components/cards/detail-section";
import { PageSection } from "../../components/primitives/page-section";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/composed/page-header";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { DataTable } from "@/components/composed/data-table";
import {
  JOBS_QUERY_KEY,
  archiveJob,
  endpointsQueryOptions,
  jobQueryOptions,
  pauseJob,
  resumeJob,
} from "@/lib/api-client/queries/jobs.queries";
import { archiveEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { getEndpointStatus } from "@/lib/endpoint-utils";

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

type EndpointStatus = "active" | "paused" | "archived";

/** Row data for the endpoints table */
type EndpointRow = {
  id: string;
  name: string;
  url: string;
  method: string;
  status: EndpointStatus;
  /** ISO timestamp until which the endpoint is paused (used to compute status) */
  pausedUntil?: string;
};

function JobDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: job } = useSuspenseQuery(jobQueryOptions(id));
  const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all");

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

  // Archive endpoint mutation
  const { mutateAsync: archiveEndpointMutation } = useMutation({
    mutationFn: (endpointId: string) => archiveEndpoint(id, endpointId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", id, "endpoints"] });
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

  const handleArchiveEndpoint = async (endpointId: string, endpointName: string) => {
    if (confirm(`Archive endpoint "${endpointName}"? It will no longer count toward quota or be scheduled.`)) {
      await archiveEndpointMutation(endpointId);
    }
  };

  const error = pauseError || resumeError || archiveError;
  const isLoading = isPausing || isResuming || isArchiving;

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge variant (used for both job and endpoint statuses)
  // Endpoints can be "active" or "paused", jobs can also be "archived"
  const getStatusVariant = (status: EndpointStatus): "default" | "secondary" | "destructive" | "outline" => {
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
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)} className="capitalize">
          {row.original.status}
        </Badge>
      ),
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
            {row.original.status !== "archived" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleArchiveEndpoint(row.original.id, row.original.name)}
              >
                <Archive className="size-4 mr-2" />
                Archive Endpoint
              </DropdownMenuItem>
            )}
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
          <ActionsGroup gap="2">
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
          </ActionsGroup>
        }
      />

      <PageSection>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "An error occurred"}
            </AlertDescription>
          </Alert>
        )}

        <DetailSection
          title="Job Information"
          description="View and manage this job's configuration"
        >
          <InfoGrid columns={2}>
            <InfoField
              label="Status"
              value={
                <Badge variant={getStatusVariant(job.status)} className="capitalize">
                  {job.status}
                </Badge>
              }
            />
            <InfoField
              label="Endpoints"
              value={`${endpointsData.endpoints.length} endpoint(s)`}
            />
            <InfoField label="Created" value={formatDate(job.createdAt)} />
            <InfoField label="Last Updated" value={formatDate(job.updatedAt)} />
          </InfoGrid>

          {job.description && (
            <InfoField label="Description" value={job.description} fullWidth />
          )}

          <ActionsGroup gap="2" className="border-t pt-4">
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
          </ActionsGroup>
        </DetailSection>

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
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Endpoints</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="paused">Paused Only</SelectItem>
                  <SelectItem value="archived">Archived Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DataTable
              tableTitle="Endpoints"
              columns={columns}
              data={endpointsData.endpoints
                .map(ep => ({
                  id: ep.id,
                  name: ep.name,
                  url: ep.url || '',
                  method: ep.method || 'GET',
                  status: getEndpointStatus(ep.pausedUntil, ep.archivedAt),
                  pausedUntil: ep.pausedUntil,
                }))
                .filter(ep => statusFilter === "all" || ep.status === statusFilter)}
              searchKey="name"
              searchPlaceholder="Search endpoints..."
              emptyMessage="No endpoints found."
              enablePagination={true}
              defaultPageSize={10}
            />
          </div>
        )}
      </PageSection>
    </>
  );
}
