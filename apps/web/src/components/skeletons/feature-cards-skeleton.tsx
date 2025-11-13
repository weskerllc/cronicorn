import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

export function FeatureCardsSkeleton() {
  return (
    <section className="w-full py-16 md:py-20 lg:py-24" aria-label="Loading features">
      {/* Header skeleton */}
      <div className="text-center mb-12 md:mb-16 space-y-4">
        <Skeleton className="h-10 w-[400px] mx-auto" />
        <Skeleton className="h-6 w-[600px] max-w-full mx-auto" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border border-border/50 rounded-lg p-6 space-y-4"
          >
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
