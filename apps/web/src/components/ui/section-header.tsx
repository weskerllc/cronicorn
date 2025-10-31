import { cn } from "@cronicorn/ui-library/lib/utils";

interface SectionHeaderProps {
    heading: string;
    description?: string;
    align?: "left" | "center" | "right";
    className?: string;
    headingClassName?: string;
    descriptionClassName?: string;
    id?: string;
}

/**
 * Reusable section header component with consistent styling for h2/description pattern
 * Used throughout the splash page for section headings
 */
export default function SectionHeader({
    heading,
    description,
    align = "center",
    className,
    headingClassName,
    descriptionClassName,
    id,
}: SectionHeaderProps) {
    const alignmentClasses = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    };

    return (
        <header className={cn("mb-12 md:mb-16", alignmentClasses[align], className)}>
            <h2
                id={id}
                className={cn(
                    "text-3xl md:text-4xl font-bold mb-3 tracking-tight",
                    headingClassName
                )}
            >
                {heading}
            </h2>
            {description && (
                <p
                    className={cn(
                        "text-base md:text-lg text-muted-foreground max-w-2xl",
                        align === "center" && "mx-auto",
                        descriptionClassName
                    )}
                >
                    {description}
                </p>
            )}
        </header>
    );
}
