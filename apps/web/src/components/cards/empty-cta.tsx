import { Button } from "@cronicorn/ui-library/components/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@cronicorn/ui-library/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyCTAProps {
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description: string;
  /**
   * Optional icon to display above the title
   */
  icon?: LucideIcon;
  /**
   * Button configuration (deprecated - use action instead)
   */
  button?: {
    text: string;
    icon: React.ReactNode;
    link: string;
  };
  /**
   * Custom action element (buttons, etc.)
   */
  action?: React.ReactNode;
  /**
   * Variant for different empty state styles
   */
  variant?: "card" | "centered";
  /**
   * Additional className
   */
  className?: string;
}

/**
 * EmptyCTA (Empty State) - A reusable empty state component with optional icon and action.
 * Supports both card-based and centered layouts.
 */
export function EmptyCTA({
  title,
  description,
  icon: Icon,
  button,
  action,
  variant = "card",
  className,
}: EmptyCTAProps) {
  const content = (
    <>
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action || (button && (
        <Button asChild>
          <Link to={button.link}>
            {button.icon}
            {button.text}
          </Link>
        </Button>
      ))}
    </>
  );

  if (variant === "centered") {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="max-w-md mx-auto space-y-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md text-center bg-muted/50 p-8 sm:p-12", className)}>
      <div className="max-w-md mx-auto space-y-4">
        {content}
      </div>
    </div>
  );
}
