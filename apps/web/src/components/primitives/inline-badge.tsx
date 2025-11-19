import type { ReactNode } from "react";

/**
 * Props for the InlineBadge component
 */
export interface InlineBadgeProps {
    /**
     * Content to display (text or React node)
     */
    children: ReactNode;
    /**
     * Visual variant
     */
    variant?: "default" | "code" | "muted" | "success" | "warning" | "error";
    /**
     * Size variant
     */
    size?: "sm" | "md";
    /**
     * Additional CSS classes
     */
    className?: string;
}

const variantStyles = {
    default: "bg-primary/10 text-primary",
    code: "bg-muted text-muted-foreground font-mono",
    muted: "bg-muted text-muted-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sizeStyles = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
};

/**
 * InlineBadge component for displaying small inline text badges
 *
 * @example
 * ```tsx
 * // Code-like badge
 * <InlineBadge variant="code">192.168.1.1</InlineBadge>
 *
 * // Status badge
 * <InlineBadge variant="success">Active</InlineBadge>
 * ```
 */
export function InlineBadge({
    children,
    variant = "default",
    size = "sm",
    className,
}: InlineBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
        >
            {children}
        </span>
    );
}
