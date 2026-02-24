import { Skeleton } from '@/components/ui/skeleton'

export default function ReceiptDetailLoading() {
  return (
    <>
      {/* Top bar */}
      <div className="h-14 border-b border-zinc-200 bg-white" />

      {/* Two-panel skeleton */}
      <div className="flex md:h-[calc(100vh-56px)]">

        {/* Left panel */}
        <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />

          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>

          <div className="mt-auto border-t border-zinc-200 pt-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>

        {/* Right panel (tablet only) */}
        <div className="hidden md:flex flex-col w-[58%] lg:w-[60%] border-l-2 border-zinc-100 bg-zinc-50 p-4 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-14 rounded-xl" />
            <Skeleton className="flex-1 h-14 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
