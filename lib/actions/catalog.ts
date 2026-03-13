'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ServiceInsert        = Database['public']['Tables']['service_catalog']['Insert']
type ProductInsert        = Database['public']['Tables']['product_catalog']['Insert']
type ServiceVariantInsert = Database['public']['Tables']['service_variants']['Insert']

// ─── Servicios ───────────────────────────────────────────────────────────────

export async function getServices(onlyActive = true) {
  const supabase = await createClient()

  let query = supabase
    .from('service_catalog')
    .select('*')
    .order('name')

  if (onlyActive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getServicesWithVariants(onlyActive = true) {
  const supabase = await createClient()

  let query = supabase
    .from('service_catalog')
    .select('*, service_variants(id, name, price, is_active, sort_order, hair_length_min, hair_length_max)')
    .order('name')
    .order('sort_order', { foreignTable: 'service_variants' })

  if (onlyActive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function createService(
  input: Pick<ServiceInsert, 'name' | 'description' | 'base_price' | 'commission_type' | 'commission_value' | 'qr_code'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_catalog')
    .insert(input)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { data }
}

export async function updateService(
  id: string,
  input: { name?: string; base_price?: number; commission_pct?: number; description?: string | null }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_catalog')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { data }
}

export async function toggleService(id: string, is_active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('service_catalog')
    .update({ is_active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { success: true }
}

// Retorna type + value del servicio para guardar snapshot en la boleta.
// Si hay una regla específica para la trabajadora, tiene prioridad (siempre como %).
export async function resolveCommission(serviceId: string, workerId?: string) {
  const supabase = await createClient()

  // 1. Buscar regla específica para esta trabajadora
  if (workerId) {
    const { data: rule } = await supabase
      .from('commission_rules')
      .select('commission_type, commission_value')
      .eq('service_id', serviceId)
      .eq('worker_id', workerId)
      .is('valid_until', null)
      .maybeSingle()

    if (rule) {
      return {
        commission_type:  rule.commission_type  as 'percentage' | 'fixed',
        commission_value: rule.commission_value,
      }
    }
  }

  // 2. Usar la configuración por defecto del servicio
  const { data } = await supabase
    .from('service_catalog')
    .select('commission_type, commission_value')
    .eq('id', serviceId)
    .single()

  return {
    commission_type:  data?.commission_type  ?? 'percentage' as const,
    commission_value: data?.commission_value ?? 0,
  }
}


// ─── Productos ───────────────────────────────────────────────────────────────

export async function getProducts(onlyActive = true) {
  const supabase = await createClient()

  let query = supabase
    .from('product_catalog')
    .select('*')
    .order('name')

  if (onlyActive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getProductByBarcode(barcode: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('barcode', barcode)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data
}

export async function createProduct(input: Pick<ProductInsert, 'name' | 'barcode' | 'price'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_catalog')
    .insert(input)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { data }
}

export async function toggleProduct(id: string, is_active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('product_catalog')
    .update({ is_active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { success: true }
}

// ─── Variantes de servicios ───────────────────────────────────────────────────

export async function getVariantsByService(serviceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_variants')
    .select('*')
    .eq('service_id', serviceId)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return data
}

export async function createServiceVariant(input: Pick<ServiceVariantInsert, 'service_id' | 'name' | 'price' | 'sort_order' | 'hair_length_min' | 'hair_length_max'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_variants')
    .insert(input)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { data }
}

export async function updateServiceVariant(id: string, input: { name?: string; price?: number; sort_order?: number; is_active?: boolean; hair_length_min?: number | null; hair_length_max?: number | null }) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_variants')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { data }
}

export async function deleteServiceVariant(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('service_variants')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/catalog')
  return { success: true }
}
