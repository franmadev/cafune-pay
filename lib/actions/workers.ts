'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type WorkerInsert = Database['public']['Tables']['workers']['Insert']

export async function getWorkers(onlyActive = true) {
  const supabase = await createClient()

  let query = supabase
    .from('workers')
    .select('id, user_id, full_name, phone, email, is_active')
    .order('full_name')

  if (onlyActive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getWorker(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*, users(email, role)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createWorker(input: Pick<WorkerInsert, 'full_name' | 'phone' | 'email'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workers')
    .insert(input)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/workers')
  return { data }
}

export async function updateWorker(
  id: string,
  input: { full_name?: string; phone?: string; email?: string | null }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/workers')
  return { data }
}

export async function deactivateWorker(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('workers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/workers')
  return { success: true }
}

// ─── Cuentas de usuario ───────────────────────────────────────────────────────

export async function createWorkerAccount(workerId: string, email: string, password: string) {
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }

  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const admin = getSupabaseAdmin()

  // 1. Verificar que el email no tenga ya una cuenta en public.users
  const { data: existing } = await admin
    .from('users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { error: 'Este email ya tiene una cuenta registrada en el sistema' }
  }

  // 2. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }
  const userId = authData.user.id

  // 3. Insertar en la tabla users (upsert por si acaso)
  const { error: userError } = await admin
    .from('users')
    .upsert({ id: userId, email, role: 'worker' }, { onConflict: 'id' })

  if (userError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: userError.message }
  }

  // 4. Vincular al worker
  const supabase = await createClient()
  const { error: linkError } = await supabase
    .from('workers')
    .update({ user_id: userId })
    .eq('id', workerId)

  if (linkError) return { error: linkError.message }

  revalidatePath(`/dashboard/workers/${workerId}`)
  return { ok: true }
}

export async function deleteWorkerAccount(workerId: string) {
  const supabase = await createClient()

  // Obtener el user_id vinculado
  const { data: worker } = await supabase
    .from('workers')
    .select('user_id')
    .eq('id', workerId)
    .single()

  if (!worker?.user_id) return { error: 'Esta trabajadora no tiene cuenta' }

  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const admin = getSupabaseAdmin()

  // Desvincular primero
  await supabase.from('workers').update({ user_id: null }).eq('id', workerId)

  // Eliminar de users y auth
  await admin.from('users').delete().eq('id', worker.user_id)
  await admin.auth.admin.deleteUser(worker.user_id)

  revalidatePath(`/dashboard/workers/${workerId}`)
  return { ok: true }
}
