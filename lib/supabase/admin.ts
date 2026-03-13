import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Bypass RLS — solo usar en Server Components / Route Handlers
// Se inicializa de forma lazy para evitar errores si la key no está configurada

let _admin: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en .env')
    _admin = createClient<Database>(url, key, { auth: { persistSession: false } })
  }
  return _admin
}

// Para compatibilidad: llama getSupabaseAdmin() en cada uso (lazy)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabaseAdmin() as any)[prop]
  },
})
