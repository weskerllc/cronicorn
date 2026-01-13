import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@cronicorn/ui-library/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cronicorn/ui-library/components/popover";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { useState } from "react";

import { DateRangePicker } from "../primitives/date-range-picker";
import type { JobHealthItem } from "@cronicorn/api-contracts/dashboard";

export interface DashboardFilters {
    jobId?: string | null;
    startDate?: Date;
    endDate?: Date;
}

interface FilterBarProps {
    filters: DashboardFilters;
    onFilterChange: (key: "jobId", value: string | null) => void;
    onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void;
    availableJobs?: Array<JobHealthItem>;
}

export function FilterBar({
    filters,
    onFilterChange,
    onDateRangeChange,
    availableJobs = [],
}: FilterBarProps) {
    const [jobComboOpen, setJobComboOpen] = useState(false);
    const selectedJobId = filters.jobId ?? "all";

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Filter by:</span>
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

            {/* Date Range Picker */}
            <DateRangePicker
                initialDateFrom={filters.startDate}
                initialDateTo={filters.endDate}
                onUpdate={({ range }) => onDateRangeChange({ startDate: range.from, endDate: range.to ?? new Date() })}
            />

        </div>
    );
}
