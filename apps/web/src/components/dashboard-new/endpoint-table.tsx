import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@cronicorn/ui-library/components/table";
import { ChartStyle } from "@cronicorn/ui-library/components/chart";
import type { AISessionTimeSeriesPoint, EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import { buildChartConfigFromMappings, createEndpointColorMappings } from "@/lib/endpoint-colors";

interface EndpointTableProps {
    endpointTimeSeries: Array<EndpointTimeSeriesPoint>;
    aiSessionTimeSeries: Array<AISessionTimeSeriesPoint>;
    onEndpointClick?: (endpointName: string) => void;
}

export function EndpointTable({ endpointTimeSeries, aiSessionTimeSeries, onEndpointClick }: EndpointTableProps) {
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

    const endpointNames = endpointStats.map(stat => stat.name);
    const mappings = createEndpointColorMappings(endpointNames);
    const chartConfig = buildChartConfigFromMappings(mappings);

    const handleRowClick = (endpointName: string) => {
        onEndpointClick?.(endpointName);
    };

    if (endpointStats.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                    No endpoints to display
                </CardContent>
            </Card>
        );
    }

    return (
        <Card data-chart="endpoint-table">
            <ChartStyle id="endpoint-table" config={chartConfig} />
            <CardHeader>
                <CardTitle>Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-16 text-right">Runs</TableHead>
                            <TableHead className="w-20 text-right">Sessions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {endpointStats.map((stat) => {
                            const mapping = mappings.find(m => m.name === stat.name);
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
                                            className="h-3 w-3 rounded-sm"
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
            </CardContent>
        </Card>
    );
}
