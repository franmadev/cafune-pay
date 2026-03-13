'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getHonorariosRate(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'honorarios_rate_pct')
    .single()
  return data ? parseFloat(data.value) : 15.25
}

export async function updateHonorariosRate(pct: number) {
  if (pct < 0 || pct > 100) return { error: 'Porcentaje inválido' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'honorarios_rate_pct', value: String(pct), updated_at: new Date().toISOString() })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { ok: true }
}
