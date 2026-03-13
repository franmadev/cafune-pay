'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PayrollPaymentMethod = 'cash' | 'transfer'

// ─── Nómina vigente de una trabajadora (servicios desde el último pago) ────────

export async function getWorkerCurrentNomina(workerId: string) {
  const supabase = await createClient()

  // Obtener el último pago para saber desde cuándo empieza la nómina actual
  const { data: lastPayment } = await supabase
    .from('payroll_payments')
    .select('paid_at, date_from, date_to, net_amount, payment_method')
    .eq('worker_id', workerId)
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Obtener servicios desde el último paid_at (o todos si no hay pago)
  let query = supabase
    .from('receipt_services')
    .select(`
      id, price_charged, commission_amt, commission_type, commission_value,
      variant_name,
      service_catalog(name),
      receipts!inner(id, issued_at, status, payment_method, clients(full_name))
    `)
    .eq('worker_id', workerId)
    .eq('receipts.status', 'completed')

  if (lastPayment?.paid_at) {
    query = query.gt('receipts.issued_at', lastPayment.paid_at)
  }

  const { data: services, error: servicesError } = await query
  if (servicesError) console.error('[getWorkerCurrentNomina]', servicesError)

  const svcs = (services ?? []).sort((a, b) => {
    const ra = a.receipts as { issued_at: string }
    const rb = b.receipts as { issued_at: string }
    return ra.issued_at.localeCompare(rb.issued_at)
  })

  const total_ingresos   = svcs.reduce((s, r) => s + r.price_charged,  0)
  const total_comisiones = svcs.reduce((s, r) => s + r.commission_amt, 0)

  const firstServiceDate = svcs.length > 0
    ? (svcs[0].receipts as { issued_at: string }).issued_at.slice(0, 10)
    : null

  return {
    services:         svcs,
    total_ingresos:   Math.round(total_ingresos   * 100) / 100,
    total_comisiones: Math.round(total_comisiones * 100) / 100,
    ingreso_salon:    Math.round((total_ingresos - total_comisiones) * 100) / 100,
    n_servicios:      svcs.length,
    firstServiceDate,               // primer servicio de la nómina vigente
    lastPayment:      lastPayment ?? null,
  }
}

// ─── Registrar pago — auto-calcula el período desde los servicios ──────────────

export async function markPayrollPaid(
  workerId:  string,
  netAmount: number,
  method:    PayrollPaymentMethod,
) {
  const supabase = await createClient()
  const paidAt   = new Date().toISOString()
  const today    = paidAt.slice(0, 10)

  // Saber desde cuándo empieza el período actual
  const { data: lastPayment } = await supabase
    .from('payroll_payments')
    .select('paid_at')
    .eq('worker_id', workerId)
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Primer servicio del período (para calcular date_from)
  let firstSvcQuery = supabase
    .from('receipt_services')
    .select('receipts!inner(issued_at, status)')
    .eq('worker_id', workerId)
    .eq('receipts.status', 'completed')

  if (lastPayment?.paid_at) {
    firstSvcQuery = firstSvcQuery.gt('receipts.issued_at', lastPayment.paid_at)
  }

  const { data: firstSvcRows } = await firstSvcQuery
  // Ordenar en JS para obtener el más antiguo (evita bug con order sobre tabla embebida)
  const firstSvc = (firstSvcRows ?? []).sort((a, b) => {
    const ra = (a.receipts as { issued_at: string }).issued_at
    const rb = (b.receipts as { issued_at: string }).issued_at
    return ra.localeCompare(rb)
  })[0] ?? null
  const dateFrom = firstSvc
    ? (firstSvc.receipts as { issued_at: string }).issued_at.slice(0, 10)
    : today

  const { error } = await supabase
    .from('payroll_payments')
    .insert({
      worker_id:      workerId,
      date_from:      dateFrom,
      date_to:        today,
      net_amount:     netAmount,
      payment_method: method,
      paid_at:        paidAt,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/workers')
  revalidatePath(`/dashboard/reports/payroll/history/${workerId}`)
  revalidatePath(`/dashboard/reports/payroll`)
  return { ok: true, dateFrom, dateTo: today, paidAt, netAmount, method }
}

// ─── Eliminar pago (deshacer) ─────────────────────────────────────────────────

export async function unmarkPayrollPaid(
  workerId: string,
  dateFrom: string,
  dateTo:   string,
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('payroll_payments')
    .delete()
    .eq('worker_id', workerId)
    .eq('date_from',  dateFrom)
    .eq('date_to',    dateTo)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/workers')
  revalidatePath(`/dashboard/reports/payroll/history/${workerId}`)
  revalidatePath(`/dashboard/reports/payroll`)
  return { ok: true }
}

// ─── Pagos para un rango exacto (vistas históricas) ───────────────────────────

export async function getPayrollPayments(dateFrom: string, dateTo: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payroll_payments')
    .select('worker_id, date_from, date_to, net_amount, payment_method, paid_at')
    .eq('date_from', dateFrom)
    .eq('date_to',   dateTo)

  if (error) return []
  return data
}

// ─── Historial de nóminas pagadas de una trabajadora ─────────────────────────

export async function getWorkerPayrollHistory(workerId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('payroll_payments')
    .select('worker_id, date_from, date_to, net_amount, payment_method, paid_at')
    .eq('worker_id', workerId)
    .order('paid_at', { ascending: false })

  return data ?? []
}
