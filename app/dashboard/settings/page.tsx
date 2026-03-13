import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { getHonorariosRate } from '@/lib/actions/settings'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'worker') redirect('/dashboard')

  const honorariosRate = await getHonorariosRate()

  return <SettingsClient honorariosRate={honorariosRate} />
}
