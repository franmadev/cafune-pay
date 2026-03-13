import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getMyProfile } from '@/lib/actions/auth'
import { getServicesWithVariants, getProducts, createService, toggleService } from '@/lib/actions/catalog'
import { ProductFormClient } from './product-form-client'
import { ServicesListClient, ProductsListClient } from './catalog-list-client'
import { AdminGate } from '@/components/ui/admin-gate'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile || profile.role === 'worker') redirect('/dashboard')

  const { tab = 'services' } = await searchParams
  const isServices = tab !== 'products'

  const [services, products] = await Promise.all([
    getServicesWithVariants(false),
    getProducts(false),
  ])

  async function handleCreateService(formData: FormData) {
    'use server'
    await createService({
      name:             formData.get('name') as string,
      base_price:       Number(formData.get('price')),
      commission_type:  formData.get('commission_type') as 'percentage' | 'fixed',
      commission_value: Number(formData.get('commission_value')),
      description:      (formData.get('description') as string) || null,
      qr_code:          null,
    })
    revalidatePath('/dashboard/catalog')
  }

  async function handleToggleService(formData: FormData) {
    'use server'
    const id        = formData.get('id')        as string
    const is_active = formData.get('is_active') === 'true'
    await toggleService(id, !is_active)
    revalidatePath('/dashboard/catalog')
  }

  return (
    <AdminGate>
    <div className="relative p-4 md:p-8 max-w-3xl mx-auto overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] md:w-[280px] translate-x-[30%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
      </div>
      <div className="absolute bottom-0 left-0 w-[140px] md:w-[190px] -translate-x-[25%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.08] w-full h-full" />
      </div>
      <h1 className="relative text-xl font-semibold text-zinc-900 mb-4">Catálogo</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6 w-fit">
        <Link
          href="/dashboard/catalog?tab=services"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${isServices ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Servicios
        </Link>
        <Link
          href="/dashboard/catalog?tab=products"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${!isServices ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Productos
        </Link>
      </div>

      {/* Servicios */}
      {isServices && (
        <>
          <ServicesListClient services={services ?? []} toggleAction={handleToggleService} />

          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">Nuevo servicio</h2>
            <form action={handleCreateService} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre</label>
                <input
                  name="name"
                  required
                  suppressHydrationWarning
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Corte de cabello"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Precio base</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  required
                  suppressHydrationWarning
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="15000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de comisión</label>
                <select
                  name="commission_type"
                  required
                  defaultValue="percentage"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Valor de comisión</label>
                <input
                  name="commission_value"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  suppressHydrationWarning
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="40 (% o $)"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Si es porcentaje: ej. 40 → 40%. Si es fijo: ej. 5000 → $5.000 por servicio
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Descripción (opcional)</label>
                <input
                  name="description"
                  suppressHydrationWarning
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-rose-900 text-white rounded-xl text-sm font-medium hover:bg-rose-800 transition-colors"
              >
                Agregar servicio
              </button>
            </form>
          </div>
        </>
      )}

      {/* Productos */}
      {!isServices && (
        <>
          <ProductsListClient products={products ?? []} />

          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">Nuevo producto</h2>
            <ProductFormClient />
          </div>
        </>
      )}
    </div>
    </AdminGate>
  )
}
