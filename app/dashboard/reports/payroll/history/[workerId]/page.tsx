import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Scissors, FileText, CheckCircle, Clock } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getWorker } from '@/lib/actions/workers'
import { getWorkerCurrentNomina, getWorkerPayrollHistory } from '@/lib/actions/payroll-payments'
import { getHonorariosRate } from '@/lib/actions/settings'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function WorkerPayrollHistoryPage({
  params,
}: {
  params: Promise<{ workerId: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const { workerId: paramWorkerId } = await params

  let workerId = paramWorkerId
  if (profile.role === 'worker') {
    const myWorker = Array.isArray(profile.workers) ? profile.workers[0] : profile.workers
    if (!myWorker) redirect('/dashboard')
    workerId = myWorker.id
  }

  const [worker, nomina, history, honorariosRate] = await Promise.all([
    getWorker(workerId),
    getWorkerCurrentNomina(workerId),
    getWorkerPayrollHistory(workerId),
    getHonorariosRate(),
  ])

  if (!worker) notFound()

  const descuento  = Math.round(nomina.total_comisiones * honorariosRate) / 100
  const netoActual = Math.round((nomina.total_comisiones - descuento) * 100) / 100

  const backHref  = profile.role === 'worker' ? '/dashboard' : `/dashboard/workers/${workerId}`
  const backLabel = profile.role === 'worker' ? 'Inicio' : 'Trabajadora'

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-2xl mx-auto">

      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#3D5151] mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3D5151]">Nóminas</h1>
        <p className="text-sm text-zinc-400 mt-1">{worker.full_name}</p>
      </div>

      {/* Nómina vigente */}
      <div className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-dashed border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-terra-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Nómina vigente
            </p>
          </div>
          {nomina.n_servicios > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Pendiente de pago
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full">
              Sin servicios
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          {nomina.firstServiceDate && (
            <p className="text-xs text-zinc-400 mb-4">
              {formatDateShort(nomina.firstServiceDate + 'T00:00:00')}
              {' – '}
              {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })}
            </p>
          )}

          {nomina.n_servicios > 0 ? (
            <>
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Servicios</span>
                  <span className="font-medium">{nomina.n_servicios}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Comisión bruta</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(nomina.total_comisiones)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Desc. honorarios ({honorariosRate}%)</span>
                  <span className="tabular-nums font-semibold text-zinc-400">− {formatCurrency(descuento)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-dashed border-zinc-100">
                <span className="text-sm font-black uppercase tracking-wide text-[#3D5151]">Neto estimado</span>
                <span className="text-xl font-black tabular-nums text-terra-500">{formatCurrency(netoActual)}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Scissors size={24} className="text-zinc-200 mx-auto mb-2" strokeWidth={1} />
              <p className="text-sm text-zinc-400 italic">
                {history.length > 0
                  ? 'No hay servicios nuevos desde el último pago.'
                  : 'Aún no hay servicios registrados.'}
              </p>
            </div>
          )}

          {nomina.n_servicios > 0 && (
            <Link
              href={`/dashboard/reports/payroll?workerId=${workerId}`}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#3D5151] text-white text-sm font-bold rounded-xl hover:bg-[#2d3d3d] transition-colors"
            >
              <FileText size={14} />
              Ver detalle y pagar
            </Link>
          )}
        </div>
      </div>

      {/* Historial de pagos */}
      {history.length > 0 ? (
        <div className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              Historial de pagos
            </p>
          </div>
          <div className="divide-y divide-zinc-50">
            {history.map((p) => (
              <Link
                key={`${p.date_from}-${p.date_to}`}
                href={`/dashboard/reports/payroll?workerId=${workerId}&from=${p.date_from}&to=${p.date_to}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={13} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#3D5151]">
                      {formatDateShort(p.date_from + 'T00:00:00')} – {formatDateShort(p.date_to + 'T23:59:59')}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                      {' · '}
                      {new Date(p.paid_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black tabular-nums text-[#3D5151] group-hover:text-terra-500 transition-colors">
                  {formatCurrency(p.net_amount)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-10 text-center">
          <Scissors size={28} className="text-zinc-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-zinc-400">Aún no hay nóminas pagadas.</p>
        </div>
      )}
    </div>
  )
}
