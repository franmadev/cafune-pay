import { redirect } from 'next/navigation'
import { getSession } from '@/lib/actions/auth'

export default async function Home() {
  const user = await getSession()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/login')
}
