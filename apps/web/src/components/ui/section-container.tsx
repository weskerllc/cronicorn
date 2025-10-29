import { cn } from "@cronicorn/ui-library/lib/utils";
import type { ReactNode } from "react";

interface SectionContainerProps {
    children: ReactNode;
    className?: string;
    innerClassName?: string;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
    paddingY?: "none" | "sm" | "md" | "lg" | "xl";
    borderBottom?: boolean;
    id?: string;
    ariaLabelledBy?: string;
}

/**
 * Reusable section container with consistent spacing, borders, and max-width patterns
 * Used throughout the splash page for section layouts
 */
export default function SectionContainer({
    children,
    className,
    innerClassName,
    maxWidth = "5xl",
    paddingY = "lg",
    borderBottom = false,
    id,
    ariaLabelledBy,
}: SectionContainerProps) {
    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
    };

    const paddingClasses = {
        none: "",
        sm: "py-8 md:py-12",
        md: "py-12 md:py-16",
        lg: "py-16 md:py-20",
        xl: "py-20 md:py-24",
    };

    return (
        <section
            id={id}
            aria-labelledby={ariaLabelledBy}
            className={cn(
                "relative w-full",
                paddingClasses[paddingY],
                borderBottom && "border-b border-border/40",
                className
            )}
        >
            <div className={cn("mx-auto", maxWidthClasses[maxWidth], innerClassName)}>
                {children}
            </div>
        </section>
    );
}
