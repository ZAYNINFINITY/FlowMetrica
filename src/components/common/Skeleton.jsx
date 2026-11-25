export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-raised/80 ${className}`}
    />
  );
}

/** Shape-matched placeholder so layout does not jump when data arrives. */
export function WorkspaceSkeleton({ label = 'Loading analysis' }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="surface space-y-4 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[260px] w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="surface space-y-4 p-5">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 2 }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-2">
      <span className="sr-only">Loading scenarios</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface space-y-4 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
