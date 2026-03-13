export const dynamic = 'force-dynamic'

import { getWorkers } from '@/lib/actions/workers'
import { getServicesWithVariants, getProducts } from '@/lib/actions/catalog'
import { getWorkerCommissionMap } from '@/lib/actions/worker-commissions'
import { PosClient } from './pos-client'

export default async function PosPage() {
  const [workers, services, products, commissionMap] = await Promise.all([
    getWorkers(true),
    getServicesWithVariants(true),
    getProducts(true),
    getWorkerCommissionMap(),
  ])

  return (
    <PosClient
      workers={workers ?? []}
      services={services ?? []}
      products={products ?? []}
      commissionMap={commissionMap}
    />
  )
}
