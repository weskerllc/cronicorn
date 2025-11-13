import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

export function LogoGridSkeleton() {
  return (
    <div className="w-full py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Heading skeleton */}
        <div className="mb-12 md:mb-16 space-y-3 text-center">
          <Skeleton className="h-10 w-96 mx-auto" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>

        {/* Logo grid skeleton */}
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 md:gap-x-16 md:gap-y-12">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-28" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
