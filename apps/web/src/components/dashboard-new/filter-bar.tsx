import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@cronicorn/ui-library/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cronicorn/ui-library/components/popover";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { useState } from "react";

import type { JobHealthItem } from "@cronicorn/api-contracts/dashboard";

export interface DashboardFilters {
    jobId?: string | null;
    timeRange?: string | null;
}

interface FilterBarProps {
    filters: DashboardFilters;
    onFilterChange: (key: keyof DashboardFilters, value: string | null) => void;
    availableJobs?: Array<JobHealthItem>;
}

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
    const [jobComboOpen, setJobComboOpen] = useState(false);
    const selectedJobId = filters.jobId ?? "all";

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Filter by:</span>
            {/* Job Filter */}
            {/* Job Filter */}
            <div className="space-y-2">
                <Popover open={jobComboOpen} onOpenChange={setJobComboOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size={'sm'}
                            variant={selectedJobId !== "all" ? "default" : "outline"}
                            role="combobox"
                            aria-expanded={jobComboOpen}
                            className={"w-[180px] justify-between"}
                        >
                            {selectedJobId === "all"
                                ? "All Jobs"
                                : availableJobs.find((job) => job.jobId === selectedJobId)?.jobName || "All Jobs"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-0">
                        <Command>
                            <CommandInput placeholder="Search jobs..." />
                            <CommandList>
                                <CommandEmpty>No job found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        key="all"
                                        value="all"
                                        onSelect={() => {
                                            onFilterChange("jobId", null);
                                            setJobComboOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedJobId === "all" ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        All Jobs
                                    </CommandItem>
                                    {availableJobs.map((job) => (
                                        <CommandItem
                                            key={job.jobId}
                                            value={job.jobName}
                                            onSelect={() => {
                                                onFilterChange("jobId", job.jobId);
                                                setJobComboOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedJobId === job.jobId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {job.jobName}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Time Range Filter */}
            <Select
                value={filters.timeRange || "7d"}
                onValueChange={(value) => onFilterChange("timeRange", value)}
            >
                <SelectTrigger size="sm" id="timeRange-filter">
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
