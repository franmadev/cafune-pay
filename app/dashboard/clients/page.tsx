import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { getClientsWithStats } from '@/lib/actions/clients'
import { ClientsClient } from './clients-client'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const clients = await getClientsWithStats()

  return <ClientsClient initialClients={clients} />
}
