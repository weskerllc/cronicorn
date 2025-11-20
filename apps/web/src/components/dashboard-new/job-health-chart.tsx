"use client";

import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@cronicorn/ui-library/components/pagination";
import { useMemo, useState } from "react";
import { Bar, BarChart, LabelList, Rectangle, XAxis, YAxis } from "recharts";
import { DashboardCard } from "./dashboard-card";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";

import type { JobHealthItem } from "@cronicorn/api-contracts/dashboard";

/**
 * Formats a number for compact display in charts
 * @param value - The number to format
 * @returns Formatted string (e.g., "1.2k", "3.5M")
 */
function formatCompactNumber(value: number): string {
    if (value >= 1_000_000) {
        const millions = value / 1_000_000;
        return millions >= 100 ? `${Math.floor(millions)}M` : `${millions.toFixed(1)}M`;
    }
    if (value >= 1_000) {
        const thousands = value / 1_000;
        return thousands >= 100 ? `${Math.floor(thousands)}k` : `${thousands.toFixed(1)}k`;
    }
    return value.toString();
}

const chartConfig = {
    successCount: {
        label: "Success",
        color: "var(--color-success)",
    },
    failureCount: {
        label: "Failed",
        color: "var(--color-destructive)",
    },
    label: {
        color: "var(--color-chart-foreground)",
    },
} satisfies ChartConfig;

interface JobHealthChartProps {
    data: Array<JobHealthItem>;
    onJobClick?: (jobId: string) => void;
    selectedJobId?: string;
}

export function JobHealthChart({
    data,
    onJobClick,
    selectedJobId,
}: JobHealthChartProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const { paginatedData, totalPages } = useMemo(() => {
        const total = Math.ceil(data.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginated = data.slice(start, end);
        return {
            paginatedData: paginated,
            totalPages: total,
        };
    }, [data, currentPage]);

    const activeIndex = useMemo(
        () => paginatedData.findIndex((item) => item.jobId === selectedJobId),
        [paginatedData, selectedJobId]
    );


    const hasData = data.length > 0;

    const description = hasData ? (
        <>
            <p>Active Jobs: <span className="text-foreground font-medium">{data.length}</span></p>
        </>
    ) : (
        "No data to display"
    );


    const paginationFooter = totalPages > 1 ? (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        size={'sm'}

                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                                size={'sm'}
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
                        size={'sm'}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={
                            currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    ) : undefined;

    const title = selectedJobId ? "Runs Per Job • Filtered" : "Runs Per Job";
    return (
        <DashboardCard
            title={title}
            description={description}
            footerSlot={paginationFooter}
            contentClassName="p-0"
        >
            {hasData ? (<ChartContainer config={chartConfig} className="h-full w-full flex overflow-hidden flex-col">
                <BarChart
                    accessibilityLayer
                    data={paginatedData}
                    layout="vertical"
                    width={500}
                    height={Math.max(150, paginatedData.length * 70)}
                    margin={{
                        top: 16,
                        left: 12,
                        right: 36,
                    }}
                    barCategoryGap="25%"
                >
                    {/* <CartesianGrid horizontal={false} /> */}
                    <XAxis hide type="number" />
                    <YAxis
                        dataKey="jobName"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 5)}
                        hide
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent className="pb-2" />} />

                    <Bar
                        dataKey="successCount"
                        stackId="a"
                        fill="var(--color-successCount)"
                        radius={[4, 0, 0, 4]}
                        onClick={(barData) => onJobClick?.(barData.jobId)}
                        style={{ cursor: "pointer" }}
                        isAnimationActive={false}
                        activeIndex={activeIndex}
                        activeBar={(props: any) => {
                            return (
                                <Rectangle
                                    {...props}
                                    fill={props.fill}
                                    fillOpacity={0.8}
                                    stroke="var(--chart-2)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                />
                            )
                        }}
                    >
                        <LabelList
                            dataKey="jobName"
                            position="top"
                            fill="var(--color-foreground)"
                            fontSize={12}
                            content={(props: any) => {
                                const { x, y, value } = props;
                                return (
                                    <text
                                        x={x}
                                        y={y ? y - 4 : 0}
                                        fill="var(--color-foreground)"
                                        fontSize={12}
                                        textAnchor="start"
                                    >
                                        {value}
                                    </text>
                                );
                            }}
                        />
                        <LabelList
                            dataKey="successCount"
                            position="right"
                            offset={8}
                            fill="var(--color-foreground)"
                            fontSize={12}
                            formatter={(value: number) => formatCompactNumber(value)}
                        />
                    </Bar>
                    <Bar
                        dataKey="failureCount"
                        stackId="a"
                        fill="var(--color-failureCount)"
                        radius={[0, 4, 4, 0]}
                        onClick={(barData) => onJobClick?.(barData.jobId)}
                        style={{ cursor: "pointer" }}
                        isAnimationActive={false}
                        activeIndex={activeIndex}
                        activeBar={(props: any) => {
                            return (
                                <Rectangle
                                    {...props}
                                    fill={props.fill}
                                    fillOpacity={0.8}
                                    stroke="var(--chart-1)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                />
                            )
                        }}
                    />
                </BarChart>
            </ChartContainer>
            ) : null}
        </DashboardCard>
    );
}
