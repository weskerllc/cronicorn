import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";
import { cn } from "@cronicorn/ui-library/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  /**
   * Icon to display at the top of the card
   */
  icon?: LucideIcon;
  /**
   * Title/label for the stat
   */
  title: string;
  /**
   * Description text below title
   */
  description?: string;
  /**
   * Main value to display
   */
  value: string | number;
  /**
   * Optional subtext below the value
   */
  subtext?: string;
  /**
   * Visual variant for the card
   */
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
  /**
   * Custom content to display instead of value + subtext
   */
  children?: React.ReactNode;
}

export function StatCard({
  icon: Icon,
  title,
  description,
  value,
  subtext,
  variant = "default",
  className,
  children,
}: StatCardProps) {
  const variantStyles = {
    default: "",
    success: "border-green-500/50",
    warning: "border-yellow-500/50",
    danger: "border-red-500/50",
  };

  const valueColorClasses = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children || (
          <div className="space-y-1">
            <p className={cn("text-2xl font-bold", valueColorClasses[variant])}>
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
