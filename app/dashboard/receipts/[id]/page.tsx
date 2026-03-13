import { notFound, redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/auth'
import { getReceipt } from '@/lib/actions/receipts'
import { getWorkers } from '@/lib/actions/workers'
import { getServicesWithVariants, getProducts } from '@/lib/actions/catalog'
import { ReceiptDetailClient } from './receipt-detail-client'

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const [receipt, workers, services, products] = await Promise.all([
    getReceipt(id),
    getWorkers(true),
    getServicesWithVariants(true),
    getProducts(true),
  ])

  if (!receipt) notFound()

  return (
    <ReceiptDetailClient
      receipt={receipt}
      workers={workers ?? []}
      services={services ?? []}
      products={products ?? []}
      userRole={profile.role}
    />
  )
}
