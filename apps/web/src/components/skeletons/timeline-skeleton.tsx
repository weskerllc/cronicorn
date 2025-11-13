import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

export function TimelineSkeleton() {
  return (
    <div className="bg-card border rounded-md min-h-[500px] lg:min-h-[600px]">
      {/* Tabs skeleton */}
      <div className="border-b border-border">
        <div className="flex gap-2 p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
