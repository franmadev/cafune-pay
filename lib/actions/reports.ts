'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Comisiones por trabajadora en un período ────────────────────────────────

export async function getCommissionsByWorker(from: string, to: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipt_services')
    .select(`
      price_charged,
      commission_amt,
      workers!inner(id, full_name),
      receipts!inner(issued_at, status)
    `)
    .eq('receipts.status', 'completed')
    .gte('receipts.issued_at', from)
    .lte('receipts.issued_at', to)

  if (error) throw new Error(error.message)

  // Agrupar por trabajadora en memoria (más portable que GROUP BY en RLS)
  const grouped: Record<string, {
    worker_id:        string
    full_name:        string
    total_ingresos:   number
    total_comisiones: number
    ingreso_salon:    number
    n_servicios:      number
  }> = {}

  for (const row of data ?? []) {
    const worker = row.workers as { id: string; full_name: string }
    if (!grouped[worker.id]) {
      grouped[worker.id] = {
        worker_id:        worker.id,
        full_name:        worker.full_name,
        total_ingresos:   0,
        total_comisiones: 0,
        ingreso_salon:    0,
        n_servicios:      0,
      }
    }
    grouped[worker.id].total_ingresos   += row.price_charged
    grouped[worker.id].total_comisiones += row.commission_amt
    grouped[worker.id].ingreso_salon    += row.price_charged - row.commission_amt
    grouped[worker.id].n_servicios      += 1
  }

  return Object.values(grouped).sort((a, b) => b.total_ingresos - a.total_ingresos)
}

// ─── Resumen total de ventas en un período ────────────────────────────────────

export async function getSalesSummary(from: string, to: string) {
  const supabase = await createClient()

  const [servicesResult, productsResult] = await Promise.all([
    supabase
      .from('receipt_services')
      .select('price_charged, commission_amt, receipts!inner(issued_at, status)')
      .eq('receipts.status', 'completed')
      .gte('receipts.issued_at', from)
      .lte('receipts.issued_at', to),
    supabase
      .from('receipt_products')
      .select('subtotal, receipts!inner(issued_at, status)')
      .eq('receipts.status', 'completed')
      .gte('receipts.issued_at', from)
      .lte('receipts.issued_at', to),
  ])

  if (servicesResult.error) throw new Error(servicesResult.error.message)
  if (productsResult.error) throw new Error(productsResult.error.message)

  const total_servicios  = (servicesResult.data ?? []).reduce((s, r) => s + r.price_charged,  0)
  const total_comisiones = (servicesResult.data ?? []).reduce((s, r) => s + r.commission_amt,  0)
  const total_productos  = (productsResult.data ?? []).reduce((s, r) => s + r.subtotal,        0)
  const ingreso_salon    = total_servicios - total_comisiones + total_productos

  return {
    total_servicios:  Math.round(total_servicios  * 100) / 100,
    total_comisiones: Math.round(total_comisiones * 100) / 100,
    total_productos:  Math.round(total_productos  * 100) / 100,
    total_ventas:     Math.round((total_servicios + total_productos) * 100) / 100,
    ingreso_salon:    Math.round(ingreso_salon    * 100) / 100,
  }
}

// ─── Detalle de boletas en un período ────────────────────────────────────────

export async function getReceiptsDetail(from: string, to: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id, issued_at, payment_method, total_services, total_products, total_amount,
      clients(full_name),
      receipt_services(
        price_charged, commission_amt,
        workers(full_name),
        service_catalog(name)
      ),
      receipt_products(
        quantity, unit_price, subtotal,
        product_catalog(name)
      )
    `)
    .eq('status', 'completed')
    .gte('issued_at', from)
    .lte('issued_at', to)
    .order('issued_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

// ─── Nómina: calcular y guardar entradas de un período ───────────────────────

export async function buildPayrollEntries(periodId: string) {
  const supabase = await createClient()

  // Obtener el período
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodId)
    .single()

  if (periodError || !period) return { error: 'Período no encontrado' }
  if (period.status !== 'open')  return { error: 'El período ya está cerrado o pagado' }

  // Servicios del período
  const { data: services, error: servicesError } = await supabase
    .from('receipt_services')
    .select(`
      worker_id, price_charged, commission_amt,
      receipts!inner(issued_at, status)
    `)
    .eq('receipts.status', 'completed')
    .gte('receipts.issued_at', period.start_date)
    .lte('receipts.issued_at', period.end_date + 'T23:59:59')

  if (servicesError) return { error: servicesError.message }

  // Agrupar por trabajadora
  const grouped: Record<string, { total_services_amt: number; total_commission: number }> = {}

  for (const row of services ?? []) {
    if (!grouped[row.worker_id]) {
      grouped[row.worker_id] = { total_services_amt: 0, total_commission: 0 }
    }
    grouped[row.worker_id].total_services_amt += row.price_charged
    grouped[row.worker_id].total_commission   += row.commission_amt
  }

  // Insertar/actualizar entradas (upsert)
  const entries = Object.entries(grouped).map(([worker_id, totals]) => ({
    period_id:          periodId,
    worker_id,
    total_services_amt: Math.round(totals.total_services_amt * 100) / 100,
    total_commission:   Math.round(totals.total_commission   * 100) / 100,
  }))

  if (entries.length === 0) return { error: 'Sin servicios en este período' }

  const { data, error } = await supabase
    .from('payroll_entries')
    .upsert(entries, { onConflict: 'period_id,worker_id' })
    .select()

  if (error) return { error: error.message }

  return { data, count: data.length }
}

// ─── Nómina: detalle por trabajadora para un rango de fechas ─────────────────

export async function getWorkerPayrollDetail(workerId: string, from: string, to: string) {
  const supabase = await createClient()

  const [workerResult, servicesResult] = await Promise.all([
    supabase
      .from('workers')
      .select('id, full_name, phone, email')
      .eq('id', workerId)
      .single(),
    supabase
      .from('receipt_services')
      .select(`
        id, price_charged, commission_amt, commission_type, commission_value,
        service_catalog(name),
        receipts!inner(id, issued_at, status, payment_method, clients(full_name))
      `)
      .eq('worker_id', workerId)
      .eq('receipts.status', 'completed')
      .gte('receipts.issued_at', from)
      .lte('receipts.issued_at', to),
  ])

  if (workerResult.error || !workerResult.data) return null
  if (servicesResult.error) throw new Error(servicesResult.error.message)

  const services = (servicesResult.data ?? []).sort((a, b) => {
    const ra = a.receipts as { issued_at: string }
    const rb = b.receipts as { issued_at: string }
    return ra.issued_at.localeCompare(rb.issued_at)
  })

  const total_ingresos   = services.reduce((s, r) => s + r.price_charged, 0)
  const total_comisiones = services.reduce((s, r) => s + r.commission_amt, 0)

  return {
    worker:           workerResult.data,
    services,
    total_ingresos:   Math.round(total_ingresos   * 100) / 100,
    total_comisiones: Math.round(total_comisiones * 100) / 100,
    ingreso_salon:    Math.round((total_ingresos - total_comisiones) * 100) / 100,
    n_servicios:      services.length,
  }
}

// ─── Nómina: resumen de un período ───────────────────────────────────────────

export async function getPayrollSummary(periodId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payroll_entries')
    .select('*, workers(full_name, phone), payroll_periods(name, start_date, end_date, status)')
    .eq('period_id', periodId)
    .order('workers(full_name)')

  if (error) throw new Error(error.message)
  return data
}
