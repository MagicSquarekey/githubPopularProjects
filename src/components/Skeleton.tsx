export function SkeletonCard() {
  return (
    <div className="flex h-44 flex-col rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="mb-2 h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
      <div className="mb-4 h-3 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
      <div className="mt-auto flex gap-3">
        <div className="h-3 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="h-3 w-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
