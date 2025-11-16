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
        return "bg-emerald-500 dark:bg-emerald-400";
      case "escalated":
        return "bg-amber-500 dark:bg-amber-400";
      case "skipped":
        return "bg-muted-foreground";
      case "scheduled":
        return "bg-primary";
      default:
        return "bg-primary";
    }
  };

  const positionPercent = (execution.time / maxTime) * 100 * 0.8 + 10;

  const isLabelAbove = position % 2 === 0;

  return (
    <div
      className={cn("absolute top-1/2 transform -translate-y-1/2 transition-all duration-700 ease-out z-10 will-change-[left]", className)}
      style={{ left: `${positionPercent}%`, transform: `translate(-50%, -50%)` }}
    >
      <div
        className={cn(
          "size-2.5 rounded-full border border-background/60 cursor-pointer",
          getExecutionStyles(execution.status),
        )}
      />
      {showInterval && position > 0 && (
        <div className={cn("absolute left-1/2 transform -translate-x-1/2", isLabelAbove ? "-top-9" : "-bottom-9")}>
          <div className="bg-background text-foreground text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-border/50 whitespace-nowrap">
            {execution.interval}m
          </div>
        </div>
      )}
    </div>
  );
}
