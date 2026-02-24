import { notFound, redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getWorkerPayrollDetail } from '@/lib/actions/reports'
import { sendPayrollEmail } from '@/lib/actions/email'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { VoucherActions } from '@/components/ui/print-button'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import { SendEmailButton } from '@/components/ui/send-email-button'

export default async function PayrollVoucherPage({
  searchParams,
}: {
  searchParams: Promise<{ workerId?: string; from?: string; to?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile || profile.role === 'worker') redirect('/dashboard')

  const { workerId, from, to } = await searchParams
  if (!workerId || !from || !to) notFound()

  const fromISO = `${from}T00:00:00`
  const toISO   = `${to}T23:59:59`

  const detail = await getWorkerPayrollDetail(workerId, fromISO, toISO)
  if (!detail) notFound()

  // Agrupar servicios por fecha (día)
  const byDate: Map<string, typeof detail.services> = new Map()
  for (const svc of detail.services) {
    const receipt = svc.receipts as { issued_at: string }
    const day = receipt.issued_at.slice(0, 10) // YYYY-MM-DD
    if (!byDate.has(day)) byDate.set(day, [])
    byDate.get(day)!.push(svc)
  }
  const dates = [...byDate.keys()].sort()

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

        {/* ── Info trabajadora ── */}
        <div className="px-6 py-5 border-b border-dashed border-zinc-200">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-4">
            Resumen de nómina
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Trabajadora</span>
              <span className="font-semibold">{detail.worker.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Período</span>
              <span className="font-medium text-right">{fromLabel} – {toLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Servicios</span>
              <span className="font-medium">{detail.n_servicios}</span>
            </div>
          </div>
        </div>

        {/* ── Servicios realizados ── */}
        {detail.n_servicios === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-zinc-400 italic">Sin servicios en este período.</p>
          </div>
        ) : (
          <div className="px-6 py-5 border-b border-dashed border-zinc-200">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-4">
              Servicios realizados
            </p>
            <div className="space-y-5">
              {dates.map((day) => {
                const svcs = byDate.get(day)!
                return (
                  <div key={day}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-300 mb-2">
                      {formatDateShort(day + 'T00:00:00')}
                    </p>
                    <div className="space-y-2.5">
                      {svcs.map((s) => {
                        const commLabel =
                          s.commission_type === 'percentage'
                            ? `${s.commission_value}%`
                            : formatCurrency(s.commission_value)
                        return (
                          <div key={s.id} className="pl-3 border-l-2 border-zinc-100">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#3D5151]">
                                {s.service_catalog?.name ?? 'Servicio'}
                              </span>
                              <span className="tabular-nums font-semibold">
                                {formatCurrency(s.price_charged)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                              <span>Comisión {commLabel}</span>
                              <span className="tabular-nums text-rose-500 font-medium">
                                {formatCurrency(s.commission_amt)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Total a cobrar ── */}
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Total a cobrar</span>
            <span className="text-2xl font-black tabular-nums text-terra-500">
              {formatCurrency(detail.total_comisiones)}
            </span>
          </div>
        </div>

        {/* ── Pie ── */}
        <div className="text-center py-6 px-6 border-t border-dashed border-zinc-200">
          <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6 print:hidden w-full max-w-sm">
        <VoucherActions
          backHref={`/dashboard/reports?from=${from}&to=${to}`}
          backLabel="Volver al reporte"
        />
        {detail.worker.email && (
          <SendEmailButton
            action={sendPayrollEmail.bind(null, workerId, from, to)}
            label={`Enviar a ${detail.worker.full_name.split(' ')[0]}`}
          />
        )}
      </div>
    </div>
  )
}
