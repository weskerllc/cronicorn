import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ReactNode } from "react";

interface FilterGroupProps {
    /**
     * Child elements (typically Select or Input components with labels)
     */
    children: ReactNode;
    /**
     * Gap size between filter items
     */
    gap?: "2" | "3" | "4";
    /**
     * Additional className
     */
    className?: string;
}

/**
 * FilterGroup - A reusable wrapper for filter controls with consistent layout.
 * Standardizes the spacing and alignment of filter inputs.
 */
export function FilterGroup({
    children,
    gap = "4",
    className,
}: FilterGroupProps) {
    const gapStyles = {
        "2": "gap-2",
        "3": "gap-3",
        "4": "gap-4",
    };

    return (
        <div className={cn("flex items-end", gapStyles[gap], className)}>
            {children}
        </div>
    );
}

interface FilterFieldProps {
    /**
     * Label for the filter field
     */
    label: string;
    /**
     * The input/select element
     */
    children: ReactNode;
    /**
     * ID for label association
     */
    htmlFor?: string;
    /**
     * Additional className
     */
    className?: string;
}

/**
 * FilterField - A labeled filter field wrapper.
 * Provides consistent label and input spacing.
 */
function FilterField({
    label,
    children,
    htmlFor,
    className,
}: FilterFieldProps) {
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>
            {children}
        </div>
    );
}

// Export FilterField as a compound component
FilterGroup.Field = FilterField;
