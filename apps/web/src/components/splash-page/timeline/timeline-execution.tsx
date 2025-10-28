import { cn } from "@cronicorn/ui-library/lib/utils";
import type { TimelineExecution } from "./timeline-types";


type TimelineExecutionProps = {
  execution: TimelineExecution;
  position: number;
  maxTime: number;
  showInterval?: boolean;
  className?: string;
};

export function TimelineExecutionDot({
  execution,
  position,
  maxTime,
  showInterval = true,
  className,
}: TimelineExecutionProps) {
  const getExecutionStyles = (status: string) => {
    switch (status) {
      case "executed":
        return "bg-emerald-500 dark:bg-emerald-400 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-200/50 dark:ring-emerald-800/50";
      case "escalated":
        return "bg-amber-500 dark:bg-amber-400 shadow-lg shadow-amber-500/40 ring-2 ring-amber-200/50 dark:ring-amber-800/50";
      case "skipped":
        return "bg-muted-foreground shadow-lg shadow-muted-foreground/30 ring-2 ring-muted/50";
      case "scheduled":
        return "bg-primary shadow-lg shadow-primary/40 ring-2 ring-primary/20";
      default:
        return "bg-primary shadow-lg shadow-primary/40 ring-2 ring-primary/20";
    }
  };

  const positionPercent = (execution.time / maxTime) * 100 * 0.8 + 10;
  // Alternating label position: even positions (0, 2, 4...) above, odd positions (1, 3, 5...) below
  const isLabelAbove = position % 2 === 0;
  return (
    <div
      className={cn("absolute top-1/2 transform -translate-y-1/2 transition-all duration-700 ease-out z-10", className)}
      style={{ left: `${positionPercent}%`, transform: `translate(-50%, -50%)` }}
    >
      <div
        className={cn(
          "size-4 rounded-full border-2 border-background transition-all duration-500 hover:scale-110 cursor-pointer",
          getExecutionStyles(execution.status),
        )}
      />
      {showInterval && position > 0 && (
        <div
          className={cn(
            "absolute left-1/2 transform -translate-x-1/2 transition-all duration-500 z-20",
            isLabelAbove ? "-top-13" : "-bottom-13",
          )}
        >
          <div className="bg-popover/95 backdrop-blur-md text-popover-foreground text-xs font-semibold px-3 py-1.5 rounded-lg border border-border shadow-lg whitespace-nowrap">
            {execution.interval}
            m
            <div
              className={cn(
                "absolute left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-border rotate-45",
                isLabelAbove ? "-bottom-1 border-r border-b" : "-top-1 border-l border-t",
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
