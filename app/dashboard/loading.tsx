import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default function DashboardLoading() {
  return (
    <div className="relative overflow-hidden p-4 md:p-8 max-w-3xl mx-auto">
      <div className="absolute top-0 right-0 w-[200px] translate-x-[35%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <Skeleton className="h-3.5 w-28 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
