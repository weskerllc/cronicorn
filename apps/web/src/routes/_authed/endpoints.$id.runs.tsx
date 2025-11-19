import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Badge } from "@cronicorn/ui-library/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";

import { FilterGroup } from "../../components/primitives/filter-group";
import { DataTable } from "../../components/composed/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { PageSection } from "@/components/primitives/page-section";
import { runsQueryOptions } from "@/lib/api-client/queries/runs.queries";


// Extend API contract schema for UI-specific needs (like "all" option and pagination)
const runsSearchSchema = z.object({
  status: z.enum(["all", "success", "failed"]).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(20),
});

export const Route = createFileRoute("/_authed/endpoints/$id/runs")({
  validateSearch: runsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, context, deps }) => {
    // Calculate limit/offset from page/pageSize
    const limit = deps.search.pageSize;
    const offset = (deps.search.page - 1) * deps.search.pageSize;

    // Build filters object
    const filters: { status?: "success" | "failed"; limit: number; offset: number } = {
      limit,
      offset,
    };

    // Add status filter if not "all"
    if (deps.search.status !== "all") {
      filters.status = deps.search.status;
    }

    await context.queryClient.ensureQueryData(runsQueryOptions(params.id, filters));
  },
  component: RunsListPage,
});

type RunRow = {
  runId: string;
  status: "success" | "failure" | "timeout" | "cancelled";
  durationMs?: number;
  startedAt: Date;
};

function RunsListPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Build filters object with pagination
  const limit = search.pageSize;
  const offset = (search.page - 1) * search.pageSize;
  const filters: { status?: "success" | "failed"; limit: number; offset: number } = {
    limit,
    offset,
  };
  if (search.status !== "all") {
    filters.status = search.status;
  }

  const { data } = useSuspenseQuery(runsQueryOptions(id, filters));

  // Calculate total pages for pagination
  const pageCount = Math.ceil(data.total / search.pageSize);

  const columns: Array<ColumnDef<RunRow>> = [
    {
      accessorKey: "runId",
      header: "Run ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono">{row.original.runId.substring(0, 8)}</code>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === "success"
            ? "default"
            : status === "failure"
              ? "destructive"
              : "secondary";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "durationMs",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.durationMs ? `${row.original.durationMs}ms` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "startedAt",
      header: "Started At",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.startedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <PageSection>
      <FilterGroup>
        <FilterGroup.Field label="Status">
          <Select
            value={search.status}
            onValueChange={(value) => {
              navigate({
                search: (prev) => ({ ...prev, status: value as typeof search.status }),
              });
            }}
          >
            <SelectTrigger id="status" className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup.Field>

        <FilterGroup.Field label="Date Range">
          <Select defaultValue="all">
            <SelectTrigger id="dateRange" className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup.Field>
      </FilterGroup>

      <DataTable
        columns={columns}
        data={data.runs.map(run => ({
          ...run,
          status: run.status as "success" | "failure" | "timeout" | "cancelled",
          startedAt: new Date(run.startedAt),
        }))}
        // TODO: Implement backend searching for runs
        // searchKey="runId"
        // searchPlaceholder="Search run ID..."
        emptyMessage="No runs found for the selected filters."
        enablePagination={true}
        defaultPageSize={search.pageSize}
        manualPagination={true}
        pageCount={pageCount}
        pageIndex={search.page - 1} // Convert 1-indexed URL param to 0-indexed
        onPaginationChange={(pagination) => {
          navigate({
            search: (prev) => ({
              ...prev,
              page: pagination.pageIndex + 1, // Convert 0-indexed to 1-indexed
              pageSize: pagination.pageSize,
            }),
            resetScroll: false,
          });
        }}
        onRowClick={(run) => navigate({ to: "/runs/$id", params: { id: run.runId } })}
      />
    </PageSection>
  );
}
