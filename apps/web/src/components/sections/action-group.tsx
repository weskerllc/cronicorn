import { cn } from "@cronicorn/ui-library/lib/utils";

interface ActionGroupProps {
  children: React.ReactNode;
  /**
   * Layout direction. Defaults to "row" (flex-row)
   */
  direction?: "row" | "column";
  /**
   * Alignment on mobile. If true, stacks buttons vertically on small screens
   */
  stackOnMobile?: boolean;
  className?: string;
}

export function ActionGroup({ 
  children, 
  direction = "row",
  stackOnMobile = false,
  className 
}: ActionGroupProps) {
  const directionClasses = direction === "row" 
    ? "flex-row" 
    : "flex-col";
  
  const mobileClasses = stackOnMobile 
    ? "flex-col sm:flex-row" 
    : directionClasses;

  return (
    <div className={cn("flex gap-2", mobileClasses, className)}>
      {children}
    </div>
  );
}
