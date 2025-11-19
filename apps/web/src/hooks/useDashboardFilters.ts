import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import type { DashboardSearch } from "../routes/_authed/dashboard";

/**
 * Custom hook for managing dashboard filter state via URL search params
 * Provides methods to update, clear, and reset filters while preserving other params
 */
export function useDashboardFilters() {
    const navigate = useNavigate({ from: "/dashboard" });
    const search = useSearch({ from: "/_authed/dashboard" });

    /**
     * Update a single filter value
     */
    const updateFilter = useCallback(
        (key: keyof DashboardSearch, value: string | undefined) => {
            navigate({
                search: (prev: DashboardSearch) => ({
                    ...prev,
                    [key]: value || undefined,
                }),
                resetScroll: false, // Prevent scroll to top when filters change
            });
        },
        [navigate]
    );

    /**
     * Update multiple filters at once
     */
    const updateFilters = useCallback(
        (updates: Partial<DashboardSearch>) => {
            navigate({
                search: (prev: DashboardSearch) => ({
                    ...prev,
                    ...updates,
                }),
                resetScroll: false, // Prevent scroll to top when filters change
            });
        },
        [navigate]
    );

    /**
     * Clear a specific filter (set to undefined)
     */
    const clearFilter = useCallback(
        (key: keyof DashboardSearch) => {
            navigate({
                search: (prev: DashboardSearch) => ({
                    ...prev,
                    [key]: undefined,
                }),
                resetScroll: false, // Prevent scroll to top when filters change
            });
        },
        [navigate]
    );

    /**
     * Clear all filters (reset to defaults)
     */
    const clearAllFilters = useCallback(() => {
        navigate({
            search: {
                timeRange: '7d', // Keep default timeRange
            },
            resetScroll: false, // Prevent scroll to top when filters change
        });
    }, [navigate]);

    /**
     * Toggle a filter - if it's already set to the value, clear it; otherwise set it
     */
    const toggleFilter = useCallback(
        (key: keyof DashboardSearch, value: string) => {
            const currentValue = search[key];
            navigate({
                search: (prev: DashboardSearch) => ({
                    ...prev,
                    [key]: currentValue === value ? undefined : value,
                }),
                resetScroll: false, // Prevent scroll to top when filters change
            });
        },
        [navigate, search]
    );

    return {
        // Current filter values
        filters: search,

        // Update methods
        updateFilter,
        updateFilters,
        clearFilter,
        clearAllFilters,
        toggleFilter,
    };
}
