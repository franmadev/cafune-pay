import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getMyProfile } from '@/lib/actions/auth'
import { getWorkers, createWorker, deactivateWorker } from '@/lib/actions/workers'
import { SubmitButton } from '@/components/ui/submit-button'
import { WorkersListClient } from './workers-list-client'
import { AdminGate } from '@/components/ui/admin-gate'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'

export default async function WorkersPage() {
  const profile = await getMyProfile()
  if (!profile || profile.role === 'worker') redirect('/dashboard')

  const workers = await getWorkers(false) // todas, activas e inactivas

  async function handleCreate(formData: FormData) {
    'use server'
    await createWorker({
      full_name: formData.get('full_name') as string,
      phone:     (formData.get('phone') as string) || null,
      email:     formData.get('email') as string,
    })
    revalidatePath('/dashboard/workers')
  }

  async function handleDeactivate(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    await deactivateWorker(id)
    revalidatePath('/dashboard/workers')
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
      <h1 className="relative text-xl font-semibold text-zinc-900 mb-6">Trabajadoras</h1>

      {/* Lista con búsqueda */}
      <WorkersListClient workers={workers ?? []} handleDeactivate={handleDeactivate} />

      {/* Agregar trabajadora */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Agregar trabajadora</h2>
        <form action={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre completo</label>
            <input
              name="full_name"
              type="text"
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="María González"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Teléfono (opcional)</label>
            <input
              name="phone"
              type="tel"
              suppressHydrationWarning
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico</label>
            <input
              name="email"
              type="email"
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="maria@ejemplo.cl"
            />
            <p className="text-xs text-zinc-400 mt-1">Para enviarle el resumen de su nómina</p>
          </div>
          <SubmitButton
            pendingText="Guardando..."
            className="w-full py-2.5 bg-rose-900 text-white rounded-xl text-sm font-bold hover:bg-rose-800 transition-colors"
          >
            Agregar trabajadora
          </SubmitButton>
        </form>
      </div>
    </div>
    </AdminGate>
  )
}
