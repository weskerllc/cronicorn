import { cn } from "@cronicorn/ui-library/lib/utils";

interface InfoGridProps {
  children: React.ReactNode;
  /**
   * Number of columns. Defaults to 2 on medium screens and up, 1 on mobile.
   */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function InfoGrid({ children, columns = 2, className }: InfoGridProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {children}
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  /**
   * If true, the field will span the full width of the grid
   */
  fullWidth?: boolean;
  className?: string;
}

export function InfoField({ label, value, fullWidth, className }: InfoFieldProps) {
  return (
    <div className={cn("space-y-1", fullWidth && "md:col-span-2 lg:col-span-full", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}
