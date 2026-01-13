"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
} from "@cronicorn/ui-library/components/chart";
import { DashboardCard } from "./dashboard-card";
import type { EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import type { TimeRangeValue } from "@/lib/time-range-labels";
import { getSanitizedKey } from "@/lib/endpoint-colors";
import { formatTimeRangeTooltipLabel, getTimeRangeEndLabel, getTimeRangeStartLabel } from "@/lib/time-range-labels";

interface ExecutionDurationChartProps {
    data: Array<EndpointTimeSeriesPoint>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    /** Selected time range for label display */
    timeRange?: TimeRangeValue;
}

/**
 * Format milliseconds to a human-readable duration string.
 * - < 1 second: show ms (e.g., "234ms")
 * - < 1 minute: show seconds with 1 decimal (e.g., "45.2s")
 * - >= 1 minute: show minutes and seconds (e.g., "2m 30s")
 */
function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

export function ExecutionDurationChart({
    data,
    chartConfig,
    timeRange,
}: ExecutionDurationChartProps) {
    // Transform flat endpoint time-series into grouped-by-date format for Recharts
    const { chartData, endpoints, totalEndpoints } = useMemo(() => {
        // Calculate total duration per endpoint to find top performers
        const endpointTotals = new Map<string, { id: string; name: string; total: number }>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointId);
            if (existing) {
                existing.total += item.totalDurationMs;
            } else {
                endpointTotals.set(item.endpointId, { id: item.endpointId, name: item.endpointName, total: item.totalDurationMs });
            }
        });

        // Sort endpoints by total duration DESC and take top 10 for display
        const MAX_ENDPOINTS = 10;
        const sortedEndpoints = Array.from(endpointTotals.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, MAX_ENDPOINTS)
            .map(ep => ({ id: ep.id, name: ep.name }));

        const endpointList = sortedEndpoints;

        // Group by date (only for top endpoints)
        const dateMap = new Map<string, Record<string, string | number>>();
        const endpointSet = new Set(endpointList.map(ep => ep.name));
        data.forEach(item => {
            // Skip endpoints not in top 10
            if (!endpointSet.has(item.endpointName)) return;
            if (!dateMap.has(item.date)) {
                // Store timestamp for X-axis domain calculation
                // Parse as local time by adding time component (prevents UTC offset issues)
                dateMap.set(item.date, { date: new Date(item.date + 'T00:00:00').getTime() });
            }
            const dateEntry = dateMap.get(item.date)!;
            // Use endpoint name as key for total duration
            dateEntry[item.endpointName] = item.totalDurationMs;
        });

        // Convert to array and sort by date
        const transformedData = Array.from(dateMap.values()).sort((a, b) =>
            Number(a.date) - Number(b.date)
        );

        return {
            chartData: transformedData,
            endpoints: endpointList,
            totalEndpoints: endpointTotals.size,
        };
    }, [data]);

    const hasData = data.some(point => point.totalDurationMs > 0);

    // Calculate total duration
    const totalDuration = useMemo(() => {
        return data.reduce((sum, point) => sum + point.totalDurationMs, 0);
    }, [data]);

    // Calculate max value across all displayed endpoints (not stacked)
    // This ensures the Y-axis shows the true magnitude of each endpoint's duration
    const maxValue = useMemo(() => {
        if (chartData.length === 0) return 0;

        // Find the maximum single value across all data points and endpoints
        const max = chartData.reduce((maxVal, dataPoint) => {
            const pointMax = endpoints.reduce((pointMaxVal, endpoint) => {
                const value = dataPoint[endpoint.name];
                return Math.max(pointMaxVal, typeof value === 'number' ? value : 0);
            }, 0);
            return Math.max(maxVal, pointMax);
        }, 0);

        // Add 10% padding and round up to a nice whole number
        return Math.ceil(max * 1.1);
    }, [chartData, endpoints]);

    const description = hasData ? (
        <>
            <p>
                Total: <span className="text-foreground font-medium">{formatDuration(totalDuration)}</span>
                {totalEndpoints > endpoints.length && (
                    <span className="text-muted-foreground text-xs ml-2">
                        (Showing top {endpoints.length} of {totalEndpoints})
                    </span>
                )}
            </p>
        </>
    ) : (
        "No data to display"
    );

    return (
        <DashboardCard
            title="Execution Duration"
            description={description}
            contentClassName="p-3"
        >
            {hasData ? (
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-full w-full"
                >
                    <AreaChart data={chartData}>
                        <defs>
                            {endpoints
                                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                .filter(ep => ep && ep.name && typeof ep.name === "string")
                                .map((endpoint) => {
                                    const endpointName = endpoint.name;
                                    const sanitizedKey = getSanitizedKey(endpointName);
                                    if (!sanitizedKey) return null;
                                    return (
                                        <linearGradient
                                            key={endpoint.id}
                                            id={`fill-duration-${endpoint.id}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.4}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.05}
                                            />
                                        </linearGradient>
                                    );
                                })}
                        </defs>
                        <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={true}
                            tickMargin={8}
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            ticks={chartData.length >= 2 ? [chartData[0].date as number, chartData[chartData.length - 1].date as number] : undefined}
                            tickFormatter={(_value, index) => {
                                // Show start label on left, end label on right
                                if (index === 0) {
                                    return getTimeRangeStartLabel(timeRange);
                                }
                                return getTimeRangeEndLabel();
                            }}
                        />
                        <YAxis
                            domain={[0, maxValue || 'auto']}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            allowDecimals={false}
                            width={75}
                            tickFormatter={(value) => formatDuration(value)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;

                                // Filter out zero values from tooltip
                                const filteredPayload = payload.filter(item => {
                                    const value = typeof item.value === 'number' ? item.value : 0;
                                    return value > 0;
                                });

                                const date = new Date(Number(payload[0]?.payload?.date));
                                const formattedDateLabel = formatTimeRangeTooltipLabel(date, timeRange);

                                // If all values are zero, show "No activity" message
                                if (filteredPayload.length === 0) {
                                    return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="text-muted-foreground text-xs">
                                                {formattedDateLabel}
                                            </div>
                                            <div className="text-muted-foreground mt-1 text-xs">No activity</div>
                                        </div>
                                    );
                                }

                                // Custom tooltip that shows endpoint names with formatted durations
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[8rem]">
                                        <div className="text-foreground text-xs font-medium mb-1.5">
                                            {formattedDateLabel}
                                        </div>
                                        <div className="grid gap-1">
                                            {filteredPayload.map((item, index) => {
                                                const endpointName = item.name || item.dataKey;
                                                const sanitizedKey = getSanitizedKey(String(endpointName));
                                                const value = typeof item.value === 'number' ? item.value : 0;
                                                return (
                                                    <div key={index} className="flex items-center gap-2 text-xs">
                                                        <div
                                                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                            style={{
                                                                backgroundColor: sanitizedKey ? `var(--color-${sanitizedKey})` : item.color,
                                                            }}
                                                        />
                                                        <span className="text-muted-foreground flex-1">{endpointName}</span>
                                                        <span className="text-foreground font-mono font-medium tabular-nums">
                                                            {formatDuration(value)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        {endpoints
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                            .filter(ep => ep && ep.name && typeof ep.name === "string")
                            .map((endpoint) => {
                                const endpointName = endpoint.name;
                                const sanitizedKey = getSanitizedKey(endpointName);
                                if (!sanitizedKey) return null;
                                return (
                                    <Area
                                        key={endpoint.id}
                                        dataKey={endpointName}
                                        type="natural"
                                        fill={`url(#fill-duration-${endpoint.id})`}
                                        stroke={`var(--color-${sanitizedKey})`}
                                        strokeWidth={2}
                                        fillOpacity={0.6}
                                    />
                                );
                            })}
                    </AreaChart>
                </ChartContainer>
            ) : null}
        </DashboardCard>
    );
}
