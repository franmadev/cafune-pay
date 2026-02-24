import { getWorkers } from '@/lib/actions/workers'
import { getServices, getProducts } from '@/lib/actions/catalog'
import { PosClient } from './pos-client'

export default async function PosPage() {
  const [workers, services, products] = await Promise.all([
    getWorkers(true),
    getServices(true),
    getProducts(true),
  ])

  return (
    <PosClient
      workers={workers ?? []}
      services={services ?? []}
      products={products ?? []}
    />
  )
}
