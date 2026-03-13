import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getPublicClientProfile(token: string) {
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('id, full_name, phone, hair_length_cm')
    .eq('public_token', token)
    .single()

  if (error || !client) return null

  const [hairHistory, visits] = await Promise.all([
    supabaseAdmin
      .from('client_hair_history')
      .select('id, length_cm, recorded_at, receipt_id, service_name, variant_name')
      .eq('client_id', client.id)
      .order('recorded_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('receipts')
      .select(`
        id, issued_at,
        receipt_services (
          variant_name,
          service_catalog ( name )
        )
      `)
      .eq('client_id', client.id)
      .eq('status', 'completed')
      .order('issued_at', { ascending: false })
      .limit(15),
  ])

  return {
    client,
    hairHistory: hairHistory.data ?? [],
    visits:      visits.data      ?? [],
  }
}
