import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected: DateRange | undefined =
    startDate && endDate ? { from: startDate, to: endDate } : undefined;

  const handlePresetClick = (days: number) => {
    const end = endOfDay(new Date());
    const start = days === 0 ? startOfDay(new Date()) : startOfDay(subDays(end, days));
    onRangeChange({ startDate: start, endDate: end });
    setOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onRangeChange({
        startDate: startOfDay(range.from),
        endDate: endOfDay(range.to),
      });
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) {
      return "Select date range";
    }

    // Check if it matches a preset (for display purposes)
    const now = new Date();
    const daysDiff = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isEndToday =
      format(endDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

    if (isEndToday) {
      if (daysDiff === 0) return "Today";
      if (daysDiff === 7) return "Last 7 days";
      if (daysDiff === 30) return "Last 30 days";
      if (daysDiff === 90) return "Last 90 days";
    }

    return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !startDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Quick select
            </p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePresetClick(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              defaultMonth={startDate}
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
