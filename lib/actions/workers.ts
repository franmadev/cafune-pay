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
