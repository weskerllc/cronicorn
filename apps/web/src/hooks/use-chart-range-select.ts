"use client";

import { useCallback, useState } from "react";

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface UseChartRangeSelectOptions {
    /** Callback when user completes a drag selection */
    onDateRangeChange?: (range: DateRange) => void;
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
export function useChartRangeSelect({
    onDateRangeChange,
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

            // Convert timestamps to Date objects and normalize to day bounds
            const newStartDate = new Date(left);
            // Normalize using UTC so chart (UTC-based timestamps) maps cleanly to API filters
            newStartDate.setUTCHours(0, 0, 0, 0);

            const newEndDate = new Date(right);
            newEndDate.setUTCHours(23, 59, 59, 999);

            onDateRangeChange({ startDate: newStartDate, endDate: newEndDate });
        }

        // Reset selection state
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setIsSelecting(false);
    }, [refAreaLeft, refAreaRight, onDateRangeChange]);

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
