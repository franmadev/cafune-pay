export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-200 ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-32" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}
