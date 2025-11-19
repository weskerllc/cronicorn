import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ComponentType } from "react";

interface IconContainerProps {
    /**
     * Icon component to display (Lucide or Tabler)
     */
    icon: ComponentType<{ className?: string }>;
    /**
     * Visual variant for the container
     */
    variant?: "default" | "primary" | "success" | "error" | "warning";
    /**
     * Size of the container and icon
     */
    size?: "sm" | "md" | "lg";
    /**
     * Additional className for the container
     */
    className?: string;
}

/**
 * IconContainer - A reusable rounded container for icons with consistent styling.
 * Used for avatar-like icon displays with colored backgrounds.
 */
export function IconContainer({
    icon: Icon,
    variant = "default",
    size = "md",
    className,
}: IconContainerProps) {
    const variantStyles = {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
        error: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
        warning: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    };

    const sizeStyles = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
    };

    const iconSizeStyles = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    };

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full shrink-0",
                variantStyles[variant],
                sizeStyles[size],
                className,
            )}
        >
            <Icon className={iconSizeStyles[size]} />
        </div>
    );
}
