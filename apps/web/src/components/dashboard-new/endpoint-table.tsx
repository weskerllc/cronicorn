import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@cronicorn/ui-library/components/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@cronicorn/ui-library/components/pagination";
import { ChartStyle } from "@cronicorn/ui-library/components/chart";
import { ScrollArea } from "@cronicorn/ui-library/components/scroll-area";
import { DashboardCard } from "./dashboard-card";
import type { AISessionTimeSeriesPoint, EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import type { EndpointColorMapping } from "@/lib/endpoint-colors";

interface EndpointTableProps {
    endpointTimeSeries: Array<EndpointTimeSeriesPoint>;
    aiSessionTimeSeries: Array<AISessionTimeSeriesPoint>;
    /** Pre-calculated color mappings for all endpoints */
    colorMappings: Array<EndpointColorMapping>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    onEndpointClick?: (endpointName: string) => void;
}

export function EndpointTable({ endpointTimeSeries, aiSessionTimeSeries, colorMappings, chartConfig, onEndpointClick }: EndpointTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const endpointStats = useMemo(() => {
        const stats = new Map<string, { name: string; runs: number; sessions: number }>();

        endpointTimeSeries.forEach(point => {
            const existing = stats.get(point.endpointId) || { name: point.endpointName, runs: 0, sessions: 0 };
            existing.runs += point.success + point.failure;
            stats.set(point.endpointId, existing);
        });

        aiSessionTimeSeries.forEach(point => {
            const existing = stats.get(point.endpointId) || { name: point.endpointName, runs: 0, sessions: 0 };
            existing.sessions += point.sessionCount;
            stats.set(point.endpointId, existing);
        });

        return Array.from(stats.values());
    }, [endpointTimeSeries, aiSessionTimeSeries]);

    const totalPages = Math.ceil(endpointStats.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStats = endpointStats.slice(startIndex, endIndex);

    const handleRowClick = (endpointName: string) => {
        onEndpointClick?.(endpointName);
    };

    const description = endpointStats.length === 0 ? (
        <>
            <p>No data to display</p>
        </>
    ) : (
        <>
            <p>Active Endpoints: <span className="text-foreground font-medium">{Object.keys(endpointStats).length}</span></p>
        </>
    );


    const paginationFooter = totalPages > 1 ? (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (currentPage <= 3) {
                        pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = currentPage - 2 + i;
                    }

                    return (
                        <PaginationItem key={pageNum}>
                            <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                            >
                                {pageNum}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                <PaginationItem>
                    <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    ) : undefined;

    return (
        <DashboardCard
            title="Endpoints"
            description={description}
            footerSlot={paginationFooter}
        >
            {endpointStats.length === 0 ? (null) : (<>
                <ChartStyle id="endpoint-table" config={chartConfig} />
                <div data-chart="endpoint-table" className="w-full h-full">
                    <ScrollArea className="w-full h-full  [&>[data-radix-scroll-area-viewport]]:h-full">

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-4"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-16 text-right">Runs</TableHead>
                                    <TableHead className="w-20 text-right">Sessions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedStats.map((stat) => {
                                    const mapping = colorMappings.find(m => m.name === stat.name);
                                    if (!mapping) return null;
                                    const { sanitizedKey } = mapping;
                                    return (
                                        <TableRow
                                            key={stat.name}
                                            onClick={() => handleRowClick(stat.name)}
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell>
                                                <div
                                                    className="h-4 w-1 "
                                                    style={{
                                                        backgroundColor: `var(--color-${sanitizedKey})`,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">{stat.name}</TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-sm font-medium">{stat.runs.toLocaleString()}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-sm text-muted-foreground">{stat.sessions.toLocaleString()}</span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </>
            )}
        </DashboardCard>
    );
}
