'use server'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Deduplicado con cache(): si layout y página lo llaman en el mismo render,
// solo ejecuta una query a Supabase
const fetchProfile = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*, workers(id, full_name, email)')
    .eq('id', user.id)
    .single()

  return data
})

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient()

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getMyProfile() {
  return fetchProfile()
}
