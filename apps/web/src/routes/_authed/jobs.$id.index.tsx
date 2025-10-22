import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";

import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { EmptyCTA } from "@/components/empty-cta";
import { DataTable } from "@/components/data-table";
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

type EndpointRow = {
  id: string;
  name: string;
  url: string;
  method: string;
  status?: string;
};

function JobDetailsPage() {
  const { id } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(id));
  const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));

  const columns: Array<ColumnDef<EndpointRow>> = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          to="/jobs/$jobId/endpoints/$id/edit"
          params={{ jobId: id, id: row.original.id }}
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
                to="/jobs/$jobId/endpoints/$id/edit"
                params={{ jobId: id, id: row.original.id }}
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
        description={job.description || "Manage endpoints for this job"}
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
