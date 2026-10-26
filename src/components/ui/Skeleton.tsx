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
