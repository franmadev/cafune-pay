'use client'

import { useState, useOptimistic } from 'react'
import Link from 'next/link'
import { ChevronRight, FileText } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button'

type Worker = {
  id:        string
  full_name: string
  phone?:    string | null
  email?:    string | null
  is_active: boolean
}

interface Props {
  workers:          Worker[]
  handleDeactivate: (formData: FormData) => Promise<void>
}

export function WorkersListClient({ workers, handleDeactivate }: Props) {
  const [query, setQuery] = useState('')
  const [optimisticWorkers, applyOptimistic] = useOptimistic(
    workers,
    (state, id: string) =>
      state.map(w => w.id === id ? { ...w, is_active: false } : w)
  )

  const filtered = optimisticWorkers.filter(w =>
    w.full_name.toLowerCase().includes(query.toLowerCase()) ||
    (w.email ?? '').toLowerCase().includes(query.toLowerCase()) ||
    (w.phone ?? '').includes(query)
  )

  async function clientDeactivate(formData: FormData) {
    applyOptimistic(formData.get('id') as string)
    await handleDeactivate(formData)
  }

  return (
    <div className="space-y-3 mb-8">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar por nombre, email o teléfono…"
      />

      {!workers.length && (
        <p className="text-sm text-zinc-400 italic">No hay trabajadoras registradas aún.</p>
      )}
      {workers.length > 0 && !filtered.length && (
        <p className="text-sm text-zinc-400 italic">Sin resultados para &ldquo;{query}&rdquo;</p>
      )}

      {filtered.map((w) => (
        <div
          key={w.id}
          className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between transition-opacity ${
            w.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-60'
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900">{w.full_name}</p>
            <p className="text-xs text-zinc-400">
              {[w.phone, w.email].filter(Boolean).join(' · ') || 'Sin contacto'}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {w.is_active && (
              <>
                <Link
                  href={`/dashboard/reports/payroll?workerId=${w.id}`}
                  title="Ver nómina vigente"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#76A6A5] hover:text-[#3D5151] hover:bg-[#F2F7F7] rounded-lg transition-colors"
                >
                  <FileText size={13} />
                  Nómina
                </Link>
                <form action={clientDeactivate}>
                  <input type="hidden" name="id" value={w.id} />
                  <ConfirmSubmitButton
                    message={`¿Desactivar a ${w.full_name}?`}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-2 py-1"
                  >
                    Desactivar
                  </ConfirmSubmitButton>
                </form>
              </>
            )}
            <Link
              href={`/dashboard/workers/${w.id}`}
              title="Ver detalle"
              className="p-2 text-zinc-300 hover:text-[#3D5151] transition-colors"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
