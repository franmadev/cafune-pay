import { Skeleton } from '@/components/ui/skeleton'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default function ReportsLoading() {
  return (
    <div className="relative overflow-hidden p-4 md:p-8 max-w-3xl mx-auto">
      <div className="absolute top-0 right-0 w-[200px] translate-x-[35%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <Skeleton className="h-6 w-28 mb-4" />

      {/* Filtro fechas */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`bg-white border border-zinc-200 rounded-xl p-4 space-y-2 ${i === 4 ? 'col-span-2' : ''}`}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>

      <Skeleton className="h-4 w-48 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-8 rounded" />
              <Skeleton className="h-8 rounded" />
              <Skeleton className="h-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
