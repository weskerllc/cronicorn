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
          dot: "bg-emerald-500 dark:bg-emerald-400 shadow-emerald-500/30",
          bg: "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40",
          text: "text-emerald-700 dark:text-emerald-300",
          glow: "shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/20",
        };
      case "warning":
        return {
          dot: "bg-amber-500 dark:bg-amber-400 shadow-amber-500/30",
          bg: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40",
          text: "text-amber-700 dark:text-amber-300",
          glow: "shadow-lg shadow-amber-100/50 dark:shadow-amber-900/20",
        };
      case "critical":
        return {
          dot: "bg-red-500 dark:bg-red-400 shadow-red-500/30",
          bg: "bg-red-50/90 dark:bg-red-950/40 border-red-200/60 dark:border-red-800/40",
          text: "text-red-700 dark:text-red-300",
          glow: "shadow-lg shadow-red-100/50 dark:shadow-red-900/20",
        };
      default:
        return {
          dot: "bg-muted-foreground",
          bg: "bg-muted/50 border-border",
          text: "text-muted-foreground",
          glow: "shadow-lg shadow-muted/50",
        };
    }
  };

  const styles = getConditionStyles(condition.status);

  return (
    <div
      className={cn(
        "group relative p-2 rounded-md border backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl",
        styles.bg,
        styles.glow,
        className,
      )}
      role="status"
      aria-label={`${condition.label}: ${condition.value} - ${condition.description}`}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-background/20 to-transparent pointer-events-none" />

      <div className="relative flex gap-2 items-center">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 group-hover:scale-110", styles.dot)}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-muted-foreground flex-auto truncate uppercase tracking-[0.1em] opacity-80">
            {condition.label}
          </span>

        </div>

        <div className="text-base font-bold text-foreground tabular-nums tracking-tight">
          {condition.value}
        </div>

        {condition.description && (
          <p className={cn("text-xs truncate font-medium transition-colors duration-300 flex-auto text-end", styles.text)}>
            {condition.description}

          </p>
        )}
      </div>
    </div>
  );
}
