import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChartStyle } from "@cronicorn/ui-library/components/chart";
import { DashboardCard } from "./dashboard-card";
import type { AISessionTimeSeriesPoint, EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import type { EndpointColorMapping } from "@/lib/endpoint-colors";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/composed/data-table";

interface EndpointTableProps {
    endpointTimeSeries: Array<EndpointTimeSeriesPoint>;
    aiSessionTimeSeries: Array<AISessionTimeSeriesPoint>;
    /** Pre-calculated color mappings for all endpoints */
    colorMappings: Array<EndpointColorMapping>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    onEndpointClick?: (endpointName: string) => void;
}

type EndpointStat = {
    id: string;
    name: string;
    runs: number;
    totalDurationMs: number;
    sessions: number;
    tokens: number;
};

/**
 * Format milliseconds to a human-readable duration string.
 */
function formatDuration(ms: number): string {
    if (ms === 0) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

export function EndpointTable({ endpointTimeSeries, aiSessionTimeSeries, colorMappings, chartConfig, onEndpointClick }: EndpointTableProps) {
    const navigate = useNavigate();

    const endpointStats = useMemo(() => {
        const stats = new Map<string, EndpointStat>();

        endpointTimeSeries.forEach(point => {
            const existing = stats.get(point.endpointId) || { id: point.endpointId, name: point.endpointName, runs: 0, totalDurationMs: 0, sessions: 0, tokens: 0 };
            existing.runs += point.success + point.failure;
            existing.totalDurationMs += point.totalDurationMs;
            stats.set(point.endpointId, existing);
        });

        aiSessionTimeSeries.forEach(point => {
            const existing = stats.get(point.endpointId) || { id: point.endpointId, name: point.endpointName, runs: 0, totalDurationMs: 0, sessions: 0, tokens: 0 };
            existing.sessions += point.sessionCount;
            existing.tokens += point.totalTokens;
            stats.set(point.endpointId, existing);
        });

        return Array.from(stats.values());
    }, [endpointTimeSeries, aiSessionTimeSeries]);

    const columns: Array<ColumnDef<EndpointStat>> = useMemo(() => [
        {
            id: "color",
            header: "",
            cell: ({ row }) => {
                const mapping = colorMappings.find(m => m.name === row.original.name);
                if (!mapping || !mapping.sanitizedKey) return null;
                return (
                    <div
                        className="h-4 w-1"
                        style={{
                            backgroundColor: `var(--color-${mapping.sanitizedKey})`,
                        }}
                    />
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <span className="font-medium text-sm">{row.original.name}</span>
            ),
        },
        {
            accessorKey: "runs",
            header: "Runs",
            cell: ({ row }) => (
                <div className=" font-medium">
                    {row.original.runs.toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: "totalDurationMs",
            header: "Duration",
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {formatDuration(row.original.totalDurationMs)}
                </div>
            ),
        },
        {
            accessorKey: "sessions",
            header: "Sessions",
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {row.original.sessions.toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: "tokens",
            header: "Tokens",
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {row.original.tokens.toLocaleString()}
                </div>
            ),
        },
    ], [colorMappings]);

    const handleRowClick = (row: EndpointStat) => {
        navigate({ to: "/endpoints/$id", params: { id: row.id } });
        onEndpointClick?.(row.name);
    };

    const description = endpointStats.length === 0 ? (
        <p>No data to display</p>
    ) : (
        <p>Active Endpoints: <span className="text-foreground font-medium">{endpointStats.length}</span></p>
    );

    return (
        <DashboardCard
            title="Endpoints"
            description={description}
        >
            {endpointStats.length === 0 ? null : (
                <div data-chart="endpoint-table" className="w-full h-full overflow-hidden">
                    <ChartStyle id="endpoint-table" config={chartConfig} />
                    <DataTable
                        columns={columns}
                        data={endpointStats}
                        enablePagination={true}
                        defaultPageSize={20}
                        emptyMessage="No endpoints found."
                        onRowClick={handleRowClick}
                        getRowId={(row) => row.id}
                        initialSorting={[{ id: "runs", desc: true }]}
                        headerClassName="bg-card sticky top-0 z-10"
                        containerClassName="border-none"
                    />
                </div>
            )}
        </DashboardCard>
    );
}
