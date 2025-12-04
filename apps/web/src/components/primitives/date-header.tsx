import { cn } from "@cronicorn/ui-library/lib/utils";

interface DateHeaderProps {
  /**
   * The date string to display (already formatted)
   */
  date: string;
  /**
   * Optional className for customization
   */
  className?: string;
}

/**
 * DateHeader - A reusable date separator for grouped lists.
 * Displays a date in uppercase, muted style suitable for list grouping.
 */
export function DateHeader({ date, className }: DateHeaderProps) {
  return (
    <div className={cn("text-xs font-medium text-muted-foreground uppercase tracking-wider", className)}>
      {date}
    </div>
  );
}
