import { Skeleton, SkeletonRow } from '@/components/ui/skeleton'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default function ReceiptsLoading() {
  return (
    <div className="relative overflow-hidden p-4 md:p-8 max-w-4xl mx-auto">
      <div className="absolute top-0 right-0 w-[200px] translate-x-[35%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}
