'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ServiceInsert = Database['public']['Tables']['service_catalog']['Insert']
type ProductInsert = Database['public']['Tables']['product_catalog']['Insert']

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

// Retorna type + value del servicio para guardar snapshot en la boleta
export async function resolveCommission(serviceId: string) {
  const supabase = await createClient()

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
