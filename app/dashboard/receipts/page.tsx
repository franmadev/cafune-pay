import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/actions/auth'
import { ReceiptsListClient } from './receipts-list-client'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

const FILTERS = [
  { value: '',          label: 'Todas' },
  { value: 'open',      label: 'Abiertas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'voided',    label: 'Anuladas' },
]

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const { status } = await searchParams

  const supabase = await createClient()

  let query = supabase
    .from('receipts')
    .select('id, status, payment_method, issued_at, total_amount, clients(full_name)')
    .order('issued_at', { ascending: false })
    .limit(100)

  const validStatuses = ['open', 'completed', 'voided'] as const
  type ValidStatus = typeof validStatuses[number]
  if (status && (validStatuses as readonly string[]).includes(status)) {
    query = query.eq('status', status as ValidStatus)
  }

  const { data: receipts } = await query

  return (
    <div className="relative p-5 md:p-8 lg:p-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] md:w-[300px] translate-x-[28%] -translate-y-[12%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <div className="absolute bottom-0 left-0 w-[140px] md:w-[200px] -translate-x-[22%] translate-y-[18%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.08] w-full h-full" />
      </div>

      {/* Header */}
      <div className="relative mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-zinc-900">Historial de boletas</h1>
        <p className="text-sm text-zinc-400 mt-1">Registro de todas las atenciones</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(({ value, label }) => {
          const active = (status ?? '') === value
          return (
            <Link
              key={value}
              href={value ? `/dashboard/receipts?status=${value}` : '/dashboard/receipts'}
              className={`px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-colors min-h-[48px] flex items-center
                ${active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <ReceiptsListClient
        receipts={(receipts ?? []).map(r => ({ ...r, clients: r.clients as { full_name: string } | null }))}
        activeStatus={status}
      />
    </div>
  )
}
