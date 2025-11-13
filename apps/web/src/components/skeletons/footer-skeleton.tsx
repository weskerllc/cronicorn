import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

export function FooterSkeleton() {
  return (
    <div className="w-full px-4 md:px-8 border-t border-border/40">
      <section className="py-16 max-w-7xl mx-auto text-sm">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            {/* Logo and tagline skeleton */}
            <div className="col-span-2 mb-8 lg:mb-0 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-12 w-12 rounded" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
            
            {/* Menu columns skeleton */}
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Theme switcher skeleton */}
          <div className="flex pt-8">
            <Skeleton className="h-10 w-32" />
          </div>
        </footer>
      </section>
    </div>
  );
}
