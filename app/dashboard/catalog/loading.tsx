import { Skeleton, SkeletonRow } from '@/components/ui/skeleton'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default function CatalogLoading() {
  return (
    <div className="relative overflow-hidden p-4 md:p-8 max-w-3xl mx-auto">
      <div className="absolute top-0 right-0 w-[200px] translate-x-[35%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <Skeleton className="h-6 w-24 mb-4" />

      {/* Tabs */}
      <Skeleton className="h-9 w-48 rounded-xl mb-6" />

      <div className="space-y-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-36 mb-1" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}
