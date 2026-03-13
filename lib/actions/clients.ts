'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ClientRow    = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']

// ─── Búsqueda ─────────────────────────────────────────────────────────────────

export async function searchClients(query: string): Promise<ClientRow[]> {
  if (!query.trim()) return []
  const supabase = await createSupabaseClient()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,rut.ilike.%${query}%`)
    .limit(8)

  return data ?? []
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function addClient(
  input: Pick<ClientInsert, 'full_name' | 'phone' | 'rut' | 'hair_length_cm'>
) {
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase
    .from('clients')
    .insert(input)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ─── Historial de largo ───────────────────────────────────────────────────────

/**
 * Registra un nuevo largo en el historial Y actualiza el cache hair_length_cm en clients.
 * Reemplaza updateClientHairLength.
 */
export async function recordHairLength(
  clientId:    string,
  lengthCm:    number,
  receiptId?:  string,
  serviceName?: string,
  variantName?: string,
) {
  const supabase = await createSupabaseClient()

  const [historyResult, updateResult] = await Promise.all([
    supabase
      .from('client_hair_history')
      .insert({
        client_id:    clientId,
        length_cm:    lengthCm,
        receipt_id:   receiptId   ?? null,
        service_name: serviceName ?? null,
        variant_name: variantName ?? null,
      }),
    supabase
      .from('clients')
      .update({ hair_length_cm: lengthCm })
      .eq('id', clientId),
  ])

  if (historyResult.error) return { error: historyResult.error.message }
  if (updateResult.error)  return { error: updateResult.error.message }
  return { success: true }
}

export async function getClientHairHistory(clientId: string) {
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase
    .from('client_hair_history')
    .select('id, length_cm, recorded_at, receipt_id, service_name, variant_name')
    .eq('client_id', clientId)
    .order('recorded_at', { ascending: false })
    .limit(30)

  if (error) return []
  return data
}

// ─── Dashboard: listado con stats ────────────────────────────────────────────

export async function getClientsWithStats(query?: string) {
  const supabase = await createSupabaseClient()

  let q = supabase
    .from('clients')
    .select('id, full_name, phone, rut, hair_length_cm, public_token, created_at')
    .order('full_name', { ascending: true })

  if (query?.trim()) {
    q = q.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,rut.ilike.%${query}%`)
  }

  const { data: clients } = await q.limit(100)
  if (!clients?.length) return []

  // Count visits per client
  const ids = clients.map(c => c.id)
  const { data: counts } = await supabase
    .from('receipts')
    .select('client_id')
    .in('client_id', ids)
    .eq('status', 'completed')

  const visitMap = new Map<string, number>()
  for (const r of counts ?? []) {
    if (r.client_id) visitMap.set(r.client_id, (visitMap.get(r.client_id) ?? 0) + 1)
  }

  return clients.map(c => ({
    ...c,
    visit_count: visitMap.get(c.id) ?? 0,
  }))
}

