import { notFound, redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { getMyProfile } from '@/lib/actions/auth'
import { getWorkerPayrollDetail } from '@/lib/actions/reports'
import { getHonorariosRate } from '@/lib/actions/settings'
import { getWorkerCurrentNomina, getWorkerPayrollHistory } from '@/lib/actions/payroll-payments'
import { sendPayrollEmail } from '@/lib/actions/email'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { VoucherActions } from '@/components/ui/print-button'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import { SendEmailButton } from '@/components/ui/send-email-button'
import { PayrollPayControl } from '@/components/ui/payroll-pay-control'
import { PayrollHistoryPanel } from './payroll-history-panel'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PayrollVoucherPage({
  searchParams,
}: {
  searchParams: Promise<{ workerId?: string; from?: string; to?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const { workerId: qWorkerId, from, to } = await searchParams

  let workerId = qWorkerId
  if (profile.role === 'worker') {
    const myWorker = Array.isArray(profile.workers) ? profile.workers[0] : profile.workers
    if (!myWorker) redirect('/dashboard')
    workerId = myWorker.id
  }

  if (!workerId) notFound()

  const isWorker     = profile.role === 'worker'
  const isHistorical = !!(from && to)

  const [honorariosRate, history] = await Promise.all([
    getHonorariosRate(),
    getWorkerPayrollHistory(workerId),
  ])

  // ── Vista histórica (período ya pagado) ────────────────────────────────────
  if (isHistorical) {
    const fromISO = `${from}T00:00:00`
    const toISO   = `${to}T23:59:59`

    const detail = await getWorkerPayrollDetail(workerId, fromISO, toISO)
    if (!detail) notFound()

    const descuento  = Math.round(detail.total_comisiones * honorariosRate) / 100
    const netoAPagar = Math.round((detail.total_comisiones - descuento) * 100) / 100

    // Buscar el pago en el historial ya cargado (evita query extra y posibles desajustes)
    const existingRaw    = history.find(p => p.date_from === from && p.date_to === to) ?? null
    const existingPayment = existingRaw
      ? { ...existingRaw, payment_method: existingRaw.payment_method as 'cash' | 'transfer' }
      : null
    // Solo se puede deshacer el pago más reciente de la trabajadora
    const canUndo = !!existingRaw && history[0]?.date_from === from && history[0]?.date_to === to

    const byDate = buildByDate(detail.services)
    const dates  = [...byDate.keys()].sort()

    return (
      <VoucherLayout workerId={workerId} history={history} activeFrom={from} activeTo={to}>
        <VoucherCard
          workerName={detail.worker.full_name}
          fromLabel={formatDateShort(fromISO)}
          toLabel={formatDateShort(toISO)}
          nServicios={detail.n_servicios}
          byDate={byDate} dates={dates}
          totalComisiones={detail.total_comisiones}
          descuento={descuento}
          honorariosRate={honorariosRate}
          netoAPagar={netoAPagar}
        />
        <div className="flex flex-col gap-3 print:hidden">
          <PayrollPayControl
            workerId={workerId}
            netAmount={netoAPagar}
            initialPayment={existingPayment}
            variant="block"
            readOnly={isWorker}
            canUndo={canUndo}
          />
          <VoucherActions
            backHref={isWorker ? `/dashboard/reports/payroll?workerId=${workerId}` : `/dashboard/workers`}
            backLabel={isWorker ? 'Mi nómina' : 'Equipo'}
          />
          {detail.worker.email && (
            <SendEmailButton
              action={sendPayrollEmail.bind(null, workerId, from, to)}
              label={`Enviar a ${detail.worker.full_name.split(' ')[0]}`}
            />
          )}
        </div>
      </VoucherLayout>
    )
  }

  // ── Nómina vigente (sin fechas = período abierto) ──────────────────────────
  const [nomina, workerRow] = await Promise.all([
    getWorkerCurrentNomina(workerId),
    (async () => {
      const sb = await createClient()
      const { data } = await sb.from('workers').select('full_name, email').eq('id', workerId).single()
      return data
    })(),
  ])

  if (!workerRow) notFound()

  const descuento  = Math.round(nomina.total_comisiones * honorariosRate) / 100
  const netoAPagar = Math.round((nomina.total_comisiones - descuento) * 100) / 100

  const byDate = buildByDate(nomina.services)
  const dates  = [...byDate.keys()].sort()

  // Etiqueta del período: primer servicio → hoy
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })
  const fromLabel = nomina.firstServiceDate
    ? formatDateShort(nomina.firstServiceDate + 'T00:00:00')
    : '—'
  const toLabel = nomina.n_servicios > 0 ? today : '—'

  return (
    <VoucherLayout workerId={workerId} history={history}>
      <VoucherCard
        workerName={workerRow.full_name}
        fromLabel={fromLabel}
        toLabel={toLabel}
        nServicios={nomina.n_servicios}
        byDate={byDate} dates={dates}
        totalComisiones={nomina.total_comisiones}
        descuento={descuento}
        honorariosRate={honorariosRate}
        netoAPagar={netoAPagar}
        isCurrentPeriod
      />
      <div className="flex flex-col gap-3 print:hidden">
        {nomina.n_servicios > 0 ? (
          <PayrollPayControl
            workerId={workerId}
            netAmount={netoAPagar}
            initialPayment={null}
            variant="block"
            readOnly={isWorker}
          />
        ) : (
          <div className="rounded-2xl border-2 border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
            <p className="text-sm text-zinc-400">Sin servicios pendientes de pago.</p>
          </div>
        )}
        <VoucherActions
          backHref={isWorker ? '/dashboard' : '/dashboard/workers'}
          backLabel={isWorker ? 'Inicio' : 'Equipo'}
        />
        {workerRow.email && nomina.n_servicios > 0 && nomina.firstServiceDate && (
          <SendEmailButton
            action={sendPayrollEmail.bind(null, workerId, nomina.firstServiceDate, new Date().toISOString().slice(0, 10))}
            label={`Enviar a ${workerRow.full_name.split(' ')[0]}`}
          />
        )}
      </div>
    </VoucherLayout>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type AnyService = {
  id: string
  price_charged: number
  commission_amt: number
  commission_type: string
  commission_value: number
  variant_name?: string | null
  service_catalog?: { name: string } | null
  receipts: unknown
}

function buildByDate(services: AnyService[]) {
  const byDate = new Map<string, AnyService[]>()
  for (const svc of services) {
    const day = (svc.receipts as { issued_at: string }).issued_at.slice(0, 10)
    if (!byDate.has(day)) byDate.set(day, [])
    byDate.get(day)!.push(svc)
  }
  return byDate
}

// ── Shared layout ──────────────────────────────────────────────────────────────

function VoucherLayout({
  children, workerId, history, activeFrom, activeTo,
}: {
  children:    React.ReactNode
  workerId:    string
  history:     Awaited<ReturnType<typeof getWorkerPayrollHistory>>
  activeFrom?: string
  activeTo?:   string
}) {
  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white relative overflow-hidden">
      <div className="print:hidden absolute top-0 right-0 w-[220px] translate-x-[35%] -translate-y-[10%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.13] w-full h-full" />
      </div>
      <div className="print:hidden absolute bottom-0 left-0 w-[160px] -translate-x-[30%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.10] w-full h-full" />
      </div>
      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 py-10 px-4 print:py-0 print:px-0 lg:px-8">
        <div className="w-full max-w-sm mx-auto lg:mx-0 flex flex-col gap-3">
          {children}
        </div>
        <div className="print:hidden w-full max-w-sm mx-auto lg:mx-0 lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-10">
          <PayrollHistoryPanel
            history={history}
            workerId={workerId}
            activeFrom={activeFrom}
            activeTo={activeTo}
          />
        </div>
      </div>
    </div>
  )
}

// ── Voucher card ───────────────────────────────────────────────────────────────

function VoucherCard({
  workerName, fromLabel, toLabel, nServicios, byDate, dates,
  totalComisiones, descuento, honorariosRate, netoAPagar, isCurrentPeriod,
}: {
  workerName:       string
  fromLabel:        string
  toLabel:          string
  nServicios:       number
  byDate:           Map<string, AnyService[]>
  dates:            string[]
  totalComisiones:  number
  descuento:        number
  honorariosRate:   number
  netoAPagar:       number
  isCurrentPeriod?: boolean
}) {
  return (
    <div className="bg-white rounded-3xl shadow-xl print:shadow-none print:rounded-none print:max-w-none">
      {/* Encabezado */}
      <div className="text-center pt-8 pb-6 px-6 border-b border-dashed border-zinc-200">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Scissors size={18} className="text-terra-500" />
          <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Espacio de cuidado personal
        </p>
      </div>

      {/* Info */}
      <div className="px-6 py-5 border-b border-dashed border-zinc-200">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-4">
          {isCurrentPeriod ? 'Nómina vigente' : 'Resumen de nómina'}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Trabajadora</span>
            <span className="font-semibold">{workerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Período</span>
            <span className="font-medium text-right">
              {nServicios > 0 ? `${fromLabel} – ${toLabel}` : 'Sin servicios'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Servicios</span>
            <span className="font-medium">{nServicios}</span>
          </div>
        </div>
      </div>

      {/* Servicios */}
      {nServicios === 0 ? (
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
                      const commLabel = s.commission_type === 'percentage'
                        ? `${s.commission_value}%`
                        : formatCurrency(s.commission_value)
                      return (
                        <div key={s.id} className="pl-3 border-l-2 border-zinc-100">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-[#3D5151]">
                              {s.service_catalog?.name ?? 'Servicio'}
                              {s.variant_name && (
                                <span className="text-zinc-400 font-normal"> · {s.variant_name}</span>
                              )}
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

      {/* Totales */}
      <div className="px-6 py-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Comisión bruta</span>
          <span className="tabular-nums font-semibold">{formatCurrency(totalComisiones)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Desc. honorarios ({honorariosRate}%)</span>
          <span className="tabular-nums font-semibold text-zinc-400">
            − {formatCurrency(descuento)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-dashed border-zinc-200">
          <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Neto a recibir</span>
          <span className="text-2xl font-black tabular-nums text-terra-500">
            {formatCurrency(netoAPagar)}
          </span>
        </div>
      </div>

      {/* Pie */}
      <div className="text-center py-6 px-6 border-t border-dashed border-zinc-200">
        <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
      </div>
    </div>
  )
}
