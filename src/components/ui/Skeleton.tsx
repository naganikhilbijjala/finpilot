export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

export function CardSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-card">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <Skeleton className={`mt-6 w-full ${height}`} />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Shown instantly while a page's data loads (route-level loading.tsx), so a
 * click gives feedback right away instead of the old page sitting frozen.
 */
export function PageSkeleton({
  title,
  stats = true,
  cards = 2,
}: {
  /** Omit when the real title depends on the data (e.g. a stock page). */
  title?: string;
  stats?: boolean;
  cards?: number;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        {title ? (
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        ) : (
          <Skeleton className="h-8 w-48" />
        )}
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <span className="sr-only">Loading{title ? ` ${title}` : ""}…</span>
      </div>
      {stats && <StatsSkeleton />}
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} height={i === 0 ? "h-72" : "h-48"} />
      ))}
    </div>
  );
}
