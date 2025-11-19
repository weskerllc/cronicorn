import { cn } from "@cronicorn/ui-library/lib/utils";

interface PageSectionProps {
  children: React.ReactNode;
  /**
   * Spacing between sections. Defaults to "comfortable" (space-y-6)
   */
  spacing?: "comfortable" | "compact" | "spacious";
  className?: string;
}

export function PageSection({ 
  children, 
  spacing = "comfortable",
  className 
}: PageSectionProps) {
  const spacingClasses = {
    compact: "space-y-4",
    comfortable: "space-y-6",
    spacious: "space-y-8",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}
