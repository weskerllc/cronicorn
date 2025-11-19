import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ReactNode } from "react";

interface ActionsGroupProps {
    /**
     * Child elements (typically buttons)
     */
    children: ReactNode;
    /**
     * Gap size between items
     */
    gap?: "1" | "2" | "3" | "4";
    /**
     * Orientation of the group
     */
    orientation?: "horizontal" | "vertical";
    /**
     * Whether items should wrap on smaller screens
     */
    wrap?: boolean;
    /**
     * Additional className
     */
    className?: string;
}

/**
 * ActionsGroup - A reusable wrapper for button groups with consistent spacing.
 * Standardizes the layout of action buttons across the application.
 */
export function ActionsGroup({
    children,
    gap = "2",
    orientation = "horizontal",
    wrap = false,
    className,
}: ActionsGroupProps) {
    const gapStyles = {
        "1": "gap-1",
        "2": "gap-2",
        "3": "gap-3",
        "4": "gap-4",
    };

    const orientationStyles = {
        horizontal: "flex-row items-center",
        vertical: "flex-col items-stretch",
    };

    return (
        <div
            className={cn(
                "flex",
                gapStyles[gap],
                orientationStyles[orientation],
                wrap && "flex-wrap",
                className,
            )}
        >
            {children}
        </div>
    );
}
