import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ReactNode } from "react";

interface GridLayoutProps {
    /**
     * Child elements to display in grid
     */
    children: ReactNode;
    /**
     * Number of columns at base breakpoint
     */
    cols?: 1 | 2 | 3 | 4;
    /**
     * Number of columns at md breakpoint (768px+)
     */
    md?: 1 | 2 | 3 | 4;
    /**
     * Number of columns at lg breakpoint (1024px+)
     */
    lg?: 1 | 2 | 3 | 4;
    /**
     * Additional className
     */
    className?: string;
}

/**
 * GridLayout - A reusable responsive grid layout component.
 * Provides consistent grid patterns with breakpoint support.
 */
export function GridLayout({
    children,
    cols = 1,
    md,
    lg,
    className,
}: GridLayoutProps) {
    const colsStyles = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
    };

    const mdStyles = md
        ? {
            1: "md:grid-cols-1",
            2: "md:grid-cols-2",
            3: "md:grid-cols-3",
            4: "md:grid-cols-4",
        }[md]
        : undefined;

    const lgStyles = lg
        ? {
            1: "lg:grid-cols-1",
            2: "lg:grid-cols-2",
            3: "lg:grid-cols-3",
            4: "lg:grid-cols-4",
        }[lg]
        : undefined;

    return (
        <div
            className={cn(
                "grid gap-4",
                colsStyles[cols],
                mdStyles,
                lgStyles,
                className,
            )}
        >
            {children}
        </div>
    );
}
