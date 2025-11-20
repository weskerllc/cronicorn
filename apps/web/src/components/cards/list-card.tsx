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
 * Displays content in a column layout with actions at the bottom.
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
                "flex flex-col p-4 border rounded-lg transition-colors",
                hover && "hover:bg-accent/50 cursor-pointer",
                className,
            )}
            onClick={onClick}
        >
            {/* Icon */}
            {(Icon || iconSlot) && (
                <div className="mb-3">
                    {iconSlot || (
                        Icon && (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Title & Subtitle */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <p className="font-semibold">{title}</p>
                {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
            </div>

            {/* Metadata */}
            {metadata && metadata.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-2 text-sm text-muted-foreground mb-3">
                    {metadata.map((item, index) => (
                        <span key={index}>{item}</span>
                    ))}
                </div>
            )}

            {/* Actions */}
            {actions && <div className="mt-auto pt-3 border-t">{actions}</div>}
        </div>
    );
}
