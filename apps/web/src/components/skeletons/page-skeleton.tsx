import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

interface PageSkeletonProps {
    /**
     * Whether to show action buttons in the header
     * @default true
     */
    showHeaderActions?: boolean;
    /**
     * Whether to show description below the title
     * @default true
     */
    showDescription?: boolean;
    /**
     * Content layout variant
     * - "table": Shows a table-like skeleton with rows (default for list pages)
     * - "cards": Shows a grid of card skeletons
     * - "form": Shows a form-like skeleton with input fields
     * - "dashboard": Shows dashboard-like charts and widgets
     * @default "table"
     */
    variant?: "table" | "cards" | "form" | "dashboard";
}

/**
 * PageSkeleton - A reusable skeleton component for authenticated pages.
 * Provides consistent loading state across different page types.
 */
export function PageSkeleton({
    showHeaderActions = true,
    showDescription = true,
    variant = "table",
}: PageSkeletonProps) {
    return (
        <div>
            {/* Page Header Skeleton */}
            <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    {showDescription && <Skeleton className="h-4 w-64" />}
                </div>
                {showHeaderActions && (
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                )}
            </div>

            {/* Content Skeleton based on variant */}
            {variant === "table" && <TableSkeleton />}
            {variant === "cards" && <CardsSkeleton />}
            {variant === "form" && <FormSkeleton />}
            {variant === "dashboard" && <DashboardSkeleton />}
        </div>
    );
}

/**
 * Table skeleton - mimics DataTable with search and rows
 */
function TableSkeleton() {
    return (
        <div className="space-y-4">
            {/* Search bar skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-24" />
            </div>

            {/* Table skeleton */}
            <div className="rounded-md border">
                {/* Table header */}
                <div className="border-b bg-muted/50 px-4 py-3">
                    <div className="flex gap-8">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16 ml-auto" />
                    </div>
                </div>

                {/* Table rows */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="border-b last:border-b-0 px-4 py-4">
                        <div className="flex items-center gap-8">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-8 w-20 ml-auto" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
        </div>
    );
}

/**
 * Cards skeleton - mimics a grid of cards
 */
function CardsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Form skeleton - mimics a form with input fields
 */
function FormSkeleton() {
    return (
        <div className="max-w-2xl space-y-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-3 w-48" />
                </div>
            ))}

            <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full" />
            </div>

            <div className="flex gap-3 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
            </div>
        </div>
    );
}

/**
 * Dashboard skeleton - mimics charts and stats widgets
 */
function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>

            {/* Table section */}
            <Skeleton className="h-48 w-full rounded-lg" />

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
    );
}

// Export individual skeletons for direct use if needed
export { CardsSkeleton, DashboardSkeleton, FormSkeleton, TableSkeleton };
