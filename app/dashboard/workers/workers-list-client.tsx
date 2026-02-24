'use client'

import { useState, useOptimistic } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button'

type Worker = {
  id:       string
  full_name: string
  phone?:   string | null
  email?:   string | null
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
          <div>
            <p className="text-sm font-medium text-zinc-900">{w.full_name}</p>
            <p className="text-xs text-zinc-400">
              {[w.phone, w.email].filter(Boolean).join(' · ') || 'Sin contacto'}
            </p>
          </div>
          {w.is_active && (
            <form action={clientDeactivate}>
              <input type="hidden" name="id" value={w.id} />
              <ConfirmSubmitButton
                message={`¿Desactivar a ${w.full_name}?`}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-2 py-1"
              >
                Desactivar
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      ))}
    </div>
  )
}
