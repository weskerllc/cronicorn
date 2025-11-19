import { AlertTriangle } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import type { LucideIcon } from "lucide-react";

/**
 * Props for the ErrorState component
 */
export interface ErrorStateProps {
    /**
     * Main error title
     */
    title?: string;
    /**
     * Error message or description
     */
    message: string;
    /**
     * Optional action button configuration
     */
    action?: {
        label: string;
        onClick: () => void;
    };
    /**
     * Icon to display (defaults to AlertTriangle)
     */
    icon?: LucideIcon;
    /**
     * Whether to center the error state (default: true)
     */
    centered?: boolean;
    /**
     * Minimum height when centered (default: "400px")
     */
    minHeight?: string;
    /**
     * Additional CSS classes
     */
    className?: string;
}

/**
 * ErrorState component for displaying error messages with optional actions
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load data"
 *   message="An error occurred while fetching the endpoint data."
 *   action={{ label: "Retry", onClick: handleRetry }}
 * />
 * ```
 */
export function ErrorState({
    title = "Something went wrong",
    message,
    action,
    icon: Icon = AlertTriangle,
    centered = true,
    minHeight = "400px",
    className,
}: ErrorStateProps) {
    const content = (
        <div className={`flex flex-col items-center gap-3 text-center ${className || ""}`}>
            <div className="rounded-full bg-destructive/10 p-3">
                <Icon className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
                <h3 className="font-semibold text-destructive">{title}</h3>
                <p className="text-sm text-muted-foreground max-w-md">{message}</p>
            </div>
            {action && (
                <Button onClick={action.onClick} variant="outline" size="sm">
                    {action.label}
                </Button>
            )}
        </div>
    );

    if (centered) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight }}>
                {content}
            </div>
        );
    }

    return content;
}
