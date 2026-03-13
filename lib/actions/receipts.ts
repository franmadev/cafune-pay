'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveCommission } from './catalog'
import { calcCommissionAmt } from '@/lib/utils'
import type { Database, PaymentMethod } from '@/lib/supabase/types'

type ReceiptServiceInsert = Database['public']['Tables']['receipt_services']['Insert']
type ReceiptProductInsert = Database['public']['Tables']['receipt_products']['Insert']

// ─── Crear boleta ─────────────────────────────────────────────────────────────

export async function createReceipt(input?: { client_id?: string; notes?: string; worker_id?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      created_by:  user.id,
      client_id:   input?.client_id ?? null,
      worker_id:   input?.worker_id ?? null,
      notes:       input?.notes ?? null,
      status:      'open',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/receipts')
  return { data }
}

// ─── Agregar servicio a boleta ────────────────────────────────────────────────

export async function addServiceToReceipt(input: {
  receipt_id:    string
  service_id:    string
  worker_id:     string
  price_charged: number
  variant_id?:   string
  variant_name?: string
}) {
  const supabase = await createClient()

  // Snapshot de comisión al momento de la venta (override por trabajadora si existe)
  const { commission_type, commission_value } = await resolveCommission(input.service_id, input.worker_id)
  const commission_amt = calcCommissionAmt(input.price_charged, commission_type, commission_value)

  const { data, error } = await supabase
    .from('receipt_services')
    .insert({
      receipt_id:       input.receipt_id,
      service_id:       input.service_id,
      worker_id:        input.worker_id,
      price_charged:    input.price_charged,
      commission_type,
      commission_value,
      commission_amt,
      variant_id:       input.variant_id   ?? null,
      variant_name:     input.variant_name ?? null,
    } satisfies ReceiptServiceInsert)
    .select('*, service_catalog(name), workers(full_name)')
    .single()

  if (error) return { error: error.message }

  // Actualizar total_services en la boleta
  await recalcReceiptTotals(input.receipt_id)

  return { data }
}

// ─── Agregar producto a boleta ────────────────────────────────────────────────

export async function addProductToReceipt(input: {
  receipt_id: string
  product_id: string
  quantity?:  number
}) {
  const supabase = await createClient()

  const { data: product, error: productError } = await supabase
    .from('product_catalog')
    .select('price')
    .eq('id', input.product_id)
    .single()

  if (productError || !product) return { error: 'Producto no encontrado' }

  const { data, error } = await supabase
    .from('receipt_products')
    .insert({
      receipt_id: input.receipt_id,
      product_id: input.product_id,
      quantity:   input.quantity ?? 1,
      unit_price: product.price,
    } satisfies ReceiptProductInsert)
    .select('*, product_catalog(name)')
    .single()

  if (error) return { error: error.message }

  await recalcReceiptTotals(input.receipt_id)

  return { data }
}

// ─── Eliminar líneas de boleta abierta ────────────────────────────────────────

export async function removeServiceLine(receiptServiceId: string, receiptId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('receipt_services')
    .delete()
    .eq('id', receiptServiceId)

  if (error) return { error: error.message }

  await recalcReceiptTotals(receiptId)
  return { success: true }
}

export async function removeProductLine(receiptProductId: string, receiptId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('receipt_products')
    .delete()
    .eq('id', receiptProductId)

  if (error) return { error: error.message }

  await recalcReceiptTotals(receiptId)
  return { success: true }
}

// ─── Cerrar boleta ────────────────────────────────────────────────────────────

export async function completeReceipt(receiptId: string, paymentMethod: PaymentMethod) {
  const supabase = await createClient()

  // Verificar que la boleta tiene al menos un item
  const [{ count: serviceCount }, { count: productCount }] = await Promise.all([
    supabase.from('receipt_services').select('*', { count: 'exact', head: true }).eq('receipt_id', receiptId),
    supabase.from('receipt_products').select('*', { count: 'exact', head: true }).eq('receipt_id', receiptId),
  ])

  if ((serviceCount ?? 0) + (productCount ?? 0) === 0) {
    return { error: 'La boleta no tiene servicios ni productos' }
  }

  const { data, error } = await supabase
    .from('receipts')
    .update({
      status:         'completed',
      payment_method: paymentMethod,
    })
    .eq('id', receiptId)
    .eq('status', 'open')   // solo cierra si está abierta
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/receipts')
  return { data }
}

export async function voidReceipt(receiptId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('receipts')
    .update({ status: 'voided' })
    .eq('id', receiptId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/receipts')
  return { success: true }
}

// ─── Consultas ────────────────────────────────────────────────────────────────

export async function getReceipt(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      clients(id, full_name, phone, email),
      workers(id, full_name),
      receipt_services(
        id, price_charged, commission_type, commission_value, commission_amt, variant_id, variant_name,
        service_catalog(id, name),
        workers(id, full_name)
      ),
      receipt_products(
        id, quantity, unit_price, subtotal,
        product_catalog(id, name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getReceipts(filters?: {
  status?:    'open' | 'completed' | 'voided'
  from?:      string   // ISO date
  to?:        string   // ISO date
  workerId?:  string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('receipts')
    .select(`
      id, status, payment_method, issued_at,
      total_services, total_products, total_amount,
      clients(full_name)
    `)
    .order('issued_at', { ascending: false })

  if (filters?.status)   query = query.eq('status', filters.status)
  if (filters?.from)     query = query.gte('issued_at', filters.from)
  if (filters?.to)       query = query.lte('issued_at', filters.to)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function recalcReceiptTotals(receiptId: string) {
  const supabase = await createClient()

  const [services, products] = await Promise.all([
    supabase
      .from('receipt_services')
      .select('price_charged')
      .eq('receipt_id', receiptId),
    supabase
      .from('receipt_products')
      .select('subtotal')
      .eq('receipt_id', receiptId),
  ])

  const total_services = (services.data ?? []).reduce((s, r) => s + r.price_charged, 0)
  const total_products = (products.data ?? []).reduce((s, r) => s + r.subtotal,      0)

  await supabase
    .from('receipts')
    .update({ total_services, total_products })
    .eq('id', receiptId)
}
