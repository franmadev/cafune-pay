import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getPublicReceipt(id: string) {
  const { data, error } = await supabaseAdmin
    .from('receipts')
    .select(`
      id, issued_at, payment_method, total_amount, status,
      workers ( full_name ),
      clients ( full_name ),
      receipt_services (
        id, price_charged,
        service_catalog ( name ),
        workers ( full_name )
      ),
      receipt_products (
        id, quantity, unit_price, subtotal,
        product_catalog ( name )
      )
    `)
    .eq('id', id)
    .eq('status', 'completed')
    .single()

  if (error) return null
  return data
}
