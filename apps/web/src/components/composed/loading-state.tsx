import { cn } from "@cronicorn/ui-library/lib/utils";

interface LoadingStateProps {
    /**
     * Loading message to display
     */
    message?: string;
    /**
     * Size of the spinner
     */
    size?: "sm" | "md" | "lg";
    /**
     * Whether to center vertically
     */
    centered?: boolean;
    /**
     * Minimum height for centered layout
     */
    minHeight?: string;
    /**
     * Additional className
     */
    className?: string;
}

/**
 * LoadingState - A reusable loading indicator with consistent styling.
 * Provides centered spinner with optional message.
 */
export function LoadingState({
    message = "Loading...",
    size = "md",
    centered = true,
    minHeight = "400px",
    className,
}: LoadingStateProps) {
    const sizeStyles = {
        sm: "h-8 w-8 border-2",
        md: "h-12 w-12 border-b-2",
        lg: "h-16 w-16 border-b-2",
    };

    const spinner = (
        <div className="text-center space-y-4">
            <div
                className={cn(
                    "animate-spin rounded-full border-primary mx-auto",
                    sizeStyles[size],
                )}
            />
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
    );

    if (centered) {
        return (
            <div
                className={cn("flex items-center justify-center", className)}
                style={{ minHeight }}
            >
                {spinner}
            </div>
        );
    }

    return <div className={className}>{spinner}</div>;
}
