"use client";

import { useCallback, useState } from "react";

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface UseChartRangeSelectOptions {
    /** Callback when user completes a drag selection */
    onDateRangeChange?: (range: DateRange) => void;
    /** Current start date of the displayed range (used to determine granularity) */
    currentStartDate?: Date;
    /** Current end date of the displayed range (used to determine granularity) */
    currentEndDate?: Date;
}

export interface ChartRangeSelectResult {
    /** Current left boundary of selection (timestamp) */
    refAreaLeft: number | null;
    /** Current right boundary of selection (timestamp) */
    refAreaRight: number | null;
    /** Whether a selection is in progress */
    isSelecting: boolean;
    /** Props to spread on the chart container for cursor styling */
    containerStyle: { cursor?: string; userSelect?: "none" };
    /** Handler for mouse down on chart */
    handleMouseDown: (e: { activeLabel?: string }) => void;
    /** Handler for mouse move on chart */
    handleMouseMove: (e: { activeLabel?: string }) => void;
    /** Handler for mouse up on chart (also use for mouse leave) */
    handleMouseUp: () => void;
}

/**
 * Hook for implementing drag-to-select date range filtering on Recharts charts.
 *
 * Usage:
 * ```tsx
 * const {
 *   refAreaLeft,
 *   refAreaRight,
 *   containerStyle,
 *   handleMouseDown,
 *   handleMouseMove,
 *   handleMouseUp,
 * } = useChartRangeSelect({ onDateRangeChange });
 *
 * <ChartContainer style={containerStyle}>
 *   <AreaChart
 *     onMouseDown={onDateRangeChange ? handleMouseDown : undefined}
 *     onMouseMove={onDateRangeChange ? handleMouseMove : undefined}
 *     onMouseUp={onDateRangeChange ? handleMouseUp : undefined}
 *     onMouseLeave={onDateRangeChange ? handleMouseUp : undefined}
 *   >
 *     {refAreaLeft && refAreaRight && (
 *       <ReferenceArea x1={refAreaLeft} x2={refAreaRight} ... />
 *     )}
 *   </AreaChart>
 * </ChartContainer>
 * ```
 */
/**
 * Determines if the current range uses hourly granularity (≤14 days).
 * When using hourly granularity, we preserve exact times in selections.
 * When using daily granularity, we normalize to day bounds.
 */
function isHourlyGranularity(startDate?: Date, endDate?: Date): boolean {
    if (!startDate || !endDate) return false;
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    return diffDays <= 14;
}

export function useChartRangeSelect({
    onDateRangeChange,
    currentStartDate,
    currentEndDate,
}: UseChartRangeSelectOptions): ChartRangeSelectResult {
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    // Note: activeLabel is typed as string in Recharts, but contains our numeric timestamp
    const handleMouseDown = useCallback(
        (e: { activeLabel?: string }) => {
            if (e.activeLabel && onDateRangeChange) {
                const timestamp = Number(e.activeLabel);
                if (!isNaN(timestamp)) {
                    setRefAreaLeft(timestamp);
                    setIsSelecting(true);
                }
            }
        },
        [onDateRangeChange]
    );

    const handleMouseMove = useCallback(
        (e: { activeLabel?: string }) => {
            if (isSelecting && e.activeLabel) {
                const timestamp = Number(e.activeLabel);
                if (!isNaN(timestamp)) {
                    setRefAreaRight(timestamp);
                }
            }
        },
        [isSelecting]
    );

    const handleMouseUp = useCallback(() => {
        if (refAreaLeft !== null && refAreaRight !== null && onDateRangeChange) {
            // Sort to ensure left < right regardless of drag direction
            const [left, right] = [refAreaLeft, refAreaRight].sort((a, b) => a - b);

            const newStartDate = new Date(left);
            const newEndDate = new Date(right);

            // For hourly granularity (≤14 days), preserve exact times
            // For daily granularity (>14 days), normalize to day bounds
            if (!isHourlyGranularity(currentStartDate, currentEndDate)) {
                // Normalize using local time to match chart display (which uses local midnight)
                newStartDate.setHours(0, 0, 0, 0);
                newEndDate.setHours(23, 59, 59, 999);
            }

            onDateRangeChange({ startDate: newStartDate, endDate: newEndDate });
        }

        // Reset selection state
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setIsSelecting(false);
    }, [refAreaLeft, refAreaRight, onDateRangeChange, currentStartDate, currentEndDate]);

    return {
        refAreaLeft,
        refAreaRight,
        isSelecting,
        containerStyle: onDateRangeChange ? { cursor: "crosshair", userSelect: "none" as const } : {},
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    };
}
