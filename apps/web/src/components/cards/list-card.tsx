import { cn } from "@cronicorn/ui-library/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ListCardProps {
    /**
     * Icon to display (optional, or use iconSlot)
     */
    icon?: LucideIcon;
    /**
     * Custom icon slot (overrides icon prop)
     */
    iconSlot?: ReactNode;
    /**
     * Title/main text
     */
    title: ReactNode;
    /**
     * Subtitle or secondary info (optional)
     */
    subtitle?: ReactNode;
    /**
     * Metadata items (array of ReactNodes)
     */
    metadata?: Array<ReactNode>;
    /**
     * Action buttons or menu (typically Button or DropdownMenu)
     */
    actions?: ReactNode;
    /**
     * Whether to show hover effect
     */
    hover?: boolean;
    /**
     * Additional className
     */
    className?: string;
    /**
     * onClick handler for the entire card
     */
    onClick?: () => void;
}

/**
 * ListCard - A reusable card component for list items with icon, title, metadata, and actions.
 * Provides consistent styling for list-based UI patterns.
 */
export function ListCard({
    icon: Icon,
    iconSlot,
    title,
    subtitle,
    metadata,
    actions,
    hover = true,
    className,
    onClick,
}: ListCardProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between p-3 sm:p-4 border rounded-lg transition-colors",
                hover && "hover:bg-accent/50 cursor-pointer",
                className,
            )}
            onClick={onClick}
        >
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                {/* Icon */}
                {(Icon || iconSlot) && (
                    <div className="shrink-0">
                        {iconSlot || (
                            Icon && (
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="space-y-2 flex-1 min-w-0">
                    {/* Title & Subtitle */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm sm:text-base font-semibold leading-tight">{title}</p>
                        {subtitle && <span className="text-xs sm:text-sm text-muted-foreground">{subtitle}</span>}
                    </div>

                    {/* Metadata */}
                    {metadata && metadata.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm text-muted-foreground">
                            {metadata.map((item, index) => (
                                <span key={index}>{item}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {actions && <div className="ml-2 sm:ml-4 shrink-0">{actions}</div>}
        </div>
    );
}
