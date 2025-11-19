import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@cronicorn/ui-library/components/select";

import { PageSection } from "../../components/primitives/page-section";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { DataTable } from "@/components/composed/data-table";
import { endpointsQueryOptions } from "@/lib/api-client/queries/jobs.queries";
import { getEndpointStatus } from "@/lib/endpoint-utils";

export const Route = createFileRoute("/_authed/jobs/$id/endpoints")({
    component: JobEndpointsPage,
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

function JobEndpointsPage() {
    const { id } = Route.useParams();
    const navigate = useNavigate();
    const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all");

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
                <span className="font-medium">
                    {row.original.name}
                </span>
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
    ];

    return (
        <PageSection>
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
                <>
                    <div className="flex items-center justify-between mb-4">
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

                        <Button asChild>
                            <Link to="/jobs/$jobId/endpoints/new" params={{ jobId: id }}>
                                <Plus className="size-4 mr-2" />
                                Add Endpoint
                            </Link>
                        </Button>
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
                        onRowClick={(endpoint) => navigate({ to: "/endpoints/$id", params: { id: endpoint.id } })}
                    />
                </>
            )}
        </PageSection>
    );
}
