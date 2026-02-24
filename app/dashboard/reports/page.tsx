import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { getCommissionsByWorker, getSalesSummary } from '@/lib/actions/reports'
import { formatCurrency, monthRange } from '@/lib/utils'
import { ReportsDateForm } from './reports-date-form'
import { FileText, ClipboardList } from 'lucide-react'
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

  // Añadir hora para cubrir el día completo
  const fromISO = `${from}T00:00:00`
  const toISO   = `${to}T23:59:59`

  const [summary, commissions] = await Promise.all([
    getSalesSummary(fromISO, toISO),
    getCommissionsByWorker(fromISO, toISO),
  ])

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

      {/* Resumen general */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard label="Total ventas"     value={formatCurrency(summary.total_ventas)}    />
        <SummaryCard label="Servicios"        value={formatCurrency(summary.total_servicios)} />
        <SummaryCard label="Productos"        value={formatCurrency(summary.total_productos)} />
        <SummaryCard label="Comisiones"       value={formatCurrency(summary.total_comisiones)} warn />
        <SummaryCard
          label="Ingreso salón"
          value={formatCurrency(summary.ingreso_salon)}
          className="col-span-2"
          accent
        />
      </div>

      {/* Comisiones por trabajadora */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-700">Comisiones por trabajadora</h2>
        <Link
          href={`/dashboard/reports/payroll/admin?from=${from}&to=${to}`}
          className="flex items-center gap-1.5 text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
        >
          <ClipboardList size={13} />
          Nómina general
        </Link>
      </div>
      {!commissions.length ? (
        <p className="text-sm text-zinc-400 italic">Sin servicios en el período seleccionado.</p>
      ) : (
        <div className="space-y-2">
          {commissions.map((w) => (
            <div key={w.worker_id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-900">{w.full_name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{w.n_servicios} servicio{w.n_servicios !== 1 ? 's' : ''}</span>
                  <Link
                    href={`/dashboard/reports/payroll?workerId=${w.worker_id}&from=${from}&to=${to}`}
                    className="flex items-center gap-1 text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
                  >
                    <FileText size={13} />
                    Nómina
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-zinc-400">Vendió</p>
                  <p className="font-semibold text-zinc-800">{formatCurrency(w.total_ingresos)}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Comisión</p>
                  <p className="font-semibold text-terra-500">{formatCurrency(w.total_comisiones)}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Salón</p>
                  <p className="font-semibold text-zinc-800">{formatCurrency(w.ingreso_salon)}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Totales */}
          <div className="bg-zinc-900 text-white rounded-xl px-4 py-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-zinc-400">Total vendido</p>
                <p className="font-semibold">{formatCurrency(summary.total_servicios)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Total comisiones</p>
                <p className="font-semibold text-rose-400">{formatCurrency(summary.total_comisiones)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Ingreso salón</p>
                <p className="font-semibold text-green-400">{formatCurrency(summary.ingreso_salon)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
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
