import { Card, CardContent } from "@cronicorn/ui-library/components/card";
import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ComponentType, ReactNode } from "react";

interface AlertCardProps {
    /**
     * Content to display in the alert card
     */
    children: ReactNode;
    /**
     * Visual variant for the card border
     */
    variant?: "default" | "destructive" | "warning" | "info";
    /**
     * Additional className for the card
     */
    className?: string;
}

interface AlertCardContentProps {
    /**
     * Icon component to display (Lucide or Tabler icon)
     */
    icon: ComponentType<{ className?: string }>;
    /**
     * Main content to display alongside the icon
     */
    children: ReactNode;
    /**
     * Additional className for the content wrapper
     */
    className?: string;
}

/**
 * AlertCard - A reusable card component for displaying alerts, notifications, and status messages.
 * Uses consistent padding and styling across the application.
 * 
 * @example
 * ```tsx
 * <AlertCard variant="warning">
 *   <AlertCard.Content icon={AlertCircle}>
 *     <span className="font-semibold">Warning message</span>
 *     <span className="text-sm">Additional details</span>
 *   </AlertCard.Content>
 * </AlertCard>
 * ```
 */
export function AlertCard({
    children,
    variant = "default",
    className,
}: AlertCardProps) {
    const variantStyles = {
        default: "",
        destructive: "border-destructive",
        warning: "border-yellow-500",
        info: "border-blue-500",
    };

    return (
        <Card className={cn("py-4", variantStyles[variant], className)}>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

/**
 * AlertCard.Content - Compound component for consistent icon+text layout within AlertCard
 * 
 * Provides standardized spacing and alignment for icon-based alert content.
 */
function AlertCardContent({ icon: Icon, children, className = "" }: AlertCardContentProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Icon className="h-5 w-5" />
            {children}
        </div>
    );
}

AlertCard.Content = AlertCardContent;
