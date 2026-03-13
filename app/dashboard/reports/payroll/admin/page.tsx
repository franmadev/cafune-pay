import { notFound, redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getCommissionsByWorker, getSalesSummary } from '@/lib/actions/reports'
import { getHonorariosRate } from '@/lib/actions/settings'
import { getPayrollPayments } from '@/lib/actions/payroll-payments'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { VoucherActions } from '@/components/ui/print-button'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import { PayrollPayControl } from '@/components/ui/payroll-pay-control'

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile || profile.role === 'worker') redirect('/dashboard')

  const { from, to } = await searchParams
  if (!from || !to) notFound()

  const fromISO = `${from}T00:00:00`
  const toISO   = `${to}T23:59:59`

  const [commissions, summary, honorariosRate, payments] = await Promise.all([
    getCommissionsByWorker(fromISO, toISO),
    getSalesSummary(fromISO, toISO),
    getHonorariosRate(),
    getPayrollPayments(from, to),
  ])

  const paymentMap = Object.fromEntries(payments.map(p => [p.worker_id, p]))

  const totalDescuento = commissions.reduce((s, w) => {
    return s + Math.round(w.total_comisiones * honorariosRate) / 100
  }, 0)
  const totalNeto = commissions.reduce((s, w) => {
    const desc = Math.round(w.total_comisiones * honorariosRate) / 100
    return s + w.total_comisiones - desc
  }, 0)

  const fromLabel = formatDateShort(fromISO)
  const toLabel   = formatDateShort(toISO)

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white flex flex-col items-center py-10 px-4 print:py-0 print:px-0 relative overflow-hidden">

      {/* Monstera decorations */}
      <div className="print:hidden absolute top-0 right-0 w-[220px] translate-x-[35%] -translate-y-[10%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.13] w-full h-full" />
      </div>
      <div className="print:hidden absolute bottom-0 left-0 w-[160px] -translate-x-[30%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.10] w-full h-full" />
      </div>

      {/* Voucher card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl print:shadow-none print:rounded-none print:max-w-none">

        {/* ── Encabezado ── */}
        <div className="text-center pt-8 pb-6 px-6 border-b border-dashed border-zinc-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scissors size={18} className="text-terra-500" />
            <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            Espacio de cuidado personal
          </p>
        </div>

        {/* ── Info período ── */}
        <div className="px-6 py-5 border-b border-dashed border-zinc-200">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-4">
            Nómina general
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Período</span>
            <span className="font-medium text-right">{fromLabel} – {toLabel}</span>
          </div>
        </div>

        {/* ── Comisiones por trabajadora ── */}
        {commissions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-zinc-400 italic">Sin servicios en este período.</p>
          </div>
        ) : (
          <div className="px-6 py-5 border-b border-dashed border-zinc-200">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-4">
              Por trabajadora
            </p>
            <div className="space-y-4">
              {commissions.map((w) => {
                const desc    = Math.round(w.total_comisiones * honorariosRate) / 100
                const neto    = Math.round((w.total_comisiones - desc) * 100) / 100
                const payment = paymentMap[w.worker_id] ?? null
                return (
                  <div key={w.worker_id} className="pl-3 border-l-2 border-zinc-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-bold text-[#3D5151]">{w.full_name}</p>
                      {payment && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">
                          ✓ {payment.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">
                          {w.n_servicios} servicio{w.n_servicios !== 1 ? 's' : ''} · vendió
                        </span>
                        <span className="tabular-nums font-medium text-zinc-600">
                          {formatCurrency(w.total_ingresos)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Comisión bruta</span>
                        <span className="tabular-nums font-medium text-zinc-600">
                          {formatCurrency(w.total_comisiones)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Desc. honorarios ({honorariosRate}%)</span>
                        <span className="tabular-nums font-medium text-zinc-400">
                          − {formatCurrency(desc)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold pt-0.5 mb-2">
                        <span className="text-[#3D5151]">Neto a pagar</span>
                        <span className="tabular-nums text-terra-500">
                          {formatCurrency(neto)}
                        </span>
                      </div>
                      <PayrollPayControl
                        workerId={w.worker_id}
                        netAmount={neto}
                        initialPayment={payment ? { ...payment, payment_method: payment.payment_method as 'cash' | 'transfer' } : null}
                        variant="inline"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Resumen general ── */}
        <div className="px-6 py-5 space-y-2 border-b border-dashed border-zinc-200">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
            Resumen del período
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Servicios vendidos</span>
            <span className="tabular-nums font-semibold">{formatCurrency(summary.total_servicios)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Productos vendidos</span>
            <span className="tabular-nums font-semibold">{formatCurrency(summary.total_productos)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total ventas</span>
            <span className="tabular-nums font-semibold">{formatCurrency(summary.total_ventas)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1">
            <span className="text-zinc-500">Total comisiones brutas</span>
            <span className="tabular-nums font-semibold text-zinc-400">
              − {formatCurrency(summary.total_comisiones)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Desc. honorarios ({honorariosRate}%)</span>
            <span className="tabular-nums font-semibold text-zinc-400">
              + {formatCurrency(totalDescuento)}
            </span>
          </div>
        </div>

        {/* ── Neto por pagar a trabajadoras ── */}
        <div className="px-6 py-5 border-b border-dashed border-zinc-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black uppercase tracking-wider text-[#3D5151]">Total neto a pagar</span>
            <span className="text-xl font-black tabular-nums text-rose-500">
              {formatCurrency(totalNeto)}
            </span>
          </div>
        </div>

        {/* ── Ingreso neto salón ── */}
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Ingreso salón</span>
            <span className="text-2xl font-black tabular-nums text-terra-500">
              {formatCurrency(summary.ingreso_salon)}
            </span>
          </div>
        </div>

        {/* ── Pie ── */}
        <div className="text-center py-6 px-6 border-t border-dashed border-zinc-200">
          <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
        </div>
      </div>

      <VoucherActions
        backHref={`/dashboard/reports?from=${from}&to=${to}`}
        backLabel="Volver al reporte"
      />
    </div>
  )
}

