import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { getSalesSummary } from '@/lib/actions/reports'
import { formatCurrency, monthRange } from '@/lib/utils'
import { ReportsDateForm } from './reports-date-form'
import { Users } from 'lucide-react'
import { AdminGate } from '@/components/ui/admin-gate'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile || profile.role === 'worker') redirect('/dashboard')

  const { from: spFrom, to: spTo } = await searchParams
  const defaults = monthRange()
  const from = spFrom ?? defaults.from
  const to   = spTo   ?? defaults.to

  const fromISO = `${from}T00:00:00`
  const toISO   = `${to}T23:59:59`

  const summary = await getSalesSummary(fromISO, toISO)

  return (
    <AdminGate>
    <div className="relative p-4 md:p-8 max-w-3xl mx-auto overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] md:w-[280px] translate-x-[30%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <div className="absolute bottom-0 left-0 w-[140px] md:w-[190px] -translate-x-[25%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.08] w-full h-full" />
      </div>
      <h1 className="relative text-xl font-semibold text-zinc-900 mb-4">Reportes</h1>

      {/* Filtro de fechas */}
      <ReportsDateForm from={from} to={to} />

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard label="Total ventas"  value={formatCurrency(summary.total_ventas)}    />
        <SummaryCard label="Servicios"     value={formatCurrency(summary.total_servicios)} />
        <SummaryCard label="Productos"     value={formatCurrency(summary.total_productos)} />
        <SummaryCard label="Comisiones"    value={formatCurrency(summary.total_comisiones)} warn />
        <SummaryCard
          label="Ingreso salón"
          value={formatCurrency(summary.ingreso_salon)}
          className="col-span-2"
          accent
        />
      </div>

      {/* Enlace a nóminas */}
      <Link
        href="/dashboard/workers"
        className="flex items-center justify-between bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 hover:border-rose-200 hover:bg-rose-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Users size={16} className="text-zinc-400 group-hover:text-rose-500 transition-colors" />
          <div>
            <p className="text-sm font-semibold text-zinc-700 group-hover:text-rose-700 transition-colors">
              Nóminas del equipo
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Ver y pagar nóminas por trabajadora</p>
          </div>
        </div>
        <span className="text-xs text-zinc-300 group-hover:text-rose-400 transition-colors">→</span>
      </Link>
    </div>
    </AdminGate>
  )
}

function SummaryCard({
  label, value, accent, warn, className = '',
}: {
  label: string; value: string; accent?: boolean; warn?: boolean; className?: string
}) {
  return (
    <div className={`rounded-xl p-4 border ${
      accent ? 'bg-rose-50 border-rose-200' :
      warn   ? 'bg-amber-50 border-amber-200' :
               'bg-white border-zinc-200'
    } ${className}`}>
      <p className={`text-xs font-medium mb-1 ${
        accent ? 'text-rose-600' : warn ? 'text-amber-600' : 'text-zinc-500'
      }`}>{label}</p>
      <p className="text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  )
}
