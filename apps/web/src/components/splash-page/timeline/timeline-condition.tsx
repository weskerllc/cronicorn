import { cn } from "@cronicorn/ui-library/lib/utils";
import type { TimelineCondition } from "./timeline-types";


type TimelineConditionProps = {
  condition: TimelineCondition;
  className?: string;
};

export function TimelineConditionCard({ condition, className }: TimelineConditionProps) {
  const getConditionStyles = (status: string) => {
    switch (status) {
      case "stable":
        return {
          border: "border-l-2 border-l-emerald-500",
          text: "text-emerald-700 dark:text-emerald-300",
        };
      case "warning":
        return {
          border: "border-l-2 border-l-amber-500",
          text: "text-amber-700 dark:text-amber-300",
        };
      case "critical":
        return {
          border: "border-l-2 border-l-red-500",
          text: "text-red-700 dark:text-red-300",
        };
      default:
        return {
          border: "border-l-2 border-l-muted-foreground",
          text: "text-muted-foreground",
        };
    }
  };

  const styles = getConditionStyles(condition.status);

  return (
    <div
      className={cn(
        "relative px-3 py-2.5 rounded border border-border bg-background grid grid-cols-3 items-center gap-3 min-h-[4rem]",
        styles.border,
        className,
      )}
      role="status"
      aria-label={`${condition.label}: ${condition.value} - ${condition.description}`}
    >
      <div className="text-xs font-medium text-muted-foreground line-clamp-2">
        {condition.label}
      </div>
      <div className="text-sm font-bold text-foreground font-mono tabular-nums line-clamp-2">
        {condition.value}
      </div>
      {condition.description && (
        <div className={cn("text-xs font-medium text-right line-clamp-2", styles.text)}>
          {condition.description}
        </div>
      )}
    </div>
  );
}
