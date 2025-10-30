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
        "relative px-3 py-2.5 rounded border border-border bg-background flex items-center gap-3",
        styles.border,
        className,
      )}
      role="status"
      aria-label={`${condition.label}: ${condition.value} - ${condition.description}`}
    >
      <span className="text-xs font-medium text-muted-foreground/80 min-w-[100px]">
        {condition.label}
      </span>
      <span className="text-sm font-bold text-foreground font-mono tabular-nums">
        {condition.value}
      </span>
      {condition.description && (
        <span className={cn("text-xs font-medium flex-1 text-right", styles.text)}>
          {condition.description}
        </span>
      )}
    </div>
  );
}
