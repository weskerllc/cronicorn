import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";
import { Label } from "@cronicorn/ui-library/components/label";
import { Card } from "@cronicorn/ui-library/components/card";

import type { JobHealthItem } from "@cronicorn/api-contracts/dashboard";

export interface DashboardFilters {
    jobId?: string | null;
    source?: string | null;
    timeRange?: string | null;
}

interface FilterBarProps {
    filters: DashboardFilters;
    onFilterChange: (key: keyof DashboardFilters, value: string | null) => void;
    availableJobs?: Array<JobHealthItem>;
}

const SOURCE_OPTIONS = [
    { value: "baseline-cron", label: "Baseline (Cron)" },
    { value: "baseline-interval", label: "Baseline (Interval)" },
    { value: "ai-interval", label: "AI Interval" },
    { value: "ai-oneshot", label: "AI One-Shot" },
    { value: "clamped-min", label: "Clamped (Min)" },
    { value: "clamped-max", label: "Clamped (Max)" },
    { value: "paused", label: "Paused" },
];

const TIME_RANGE_OPTIONS = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
];

export function FilterBar({
    filters,
    onFilterChange,
    availableJobs = [],
}: FilterBarProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Job Filter */}
            <div className="space-y-2">
                <Select
                    value={filters.jobId ?? 'all'}
                    onValueChange={(value) =>
                        onFilterChange("jobId", value === "all" ? null : value)
                    }
                >
                    <SelectTrigger id="job-filter">
                        <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {availableJobs.map((job) => (
                            <SelectItem key={job.jobId} value={job.jobId}>
                                {job.jobName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Source Filter */}
            <Select
                value={filters.source || "all"}
                onValueChange={(value) =>
                    onFilterChange("source", value === "all" ? null : value)
                }
            >
                <SelectTrigger id="source-filter">
                    <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>


            <Select
                value={filters.timeRange || "7d"}
                onValueChange={(value) => onFilterChange("timeRange", value)}
            >
                <SelectTrigger id="timeRange-filter">
                    <SelectValue placeholder="Last 7 Days" />
                </SelectTrigger>
                <SelectContent>
                    {TIME_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

        </div>
    );
}
