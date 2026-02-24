'use client'

import { useState, useOptimistic } from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { formatCurrency } from '@/lib/utils'

// ── Services list ─────────────────────────────────────────────────────────────

type Service = {
  id:               string
  name:             string
  base_price:       number
  commission_type:  string
  commission_value: number
  description?:     string | null
  is_active:        boolean
}

interface ServicesProps {
  services: Service[]
  toggleAction: (formData: FormData) => Promise<void>
}

export function ServicesListClient({ services, toggleAction }: ServicesProps) {
  const [query, setQuery] = useState('')
  const [optimisticServices, applyOptimistic] = useOptimistic(
    services,
    (state, id: string) =>
      state.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s)
  )

  const filtered = optimisticServices.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(query.toLowerCase()) ||
    String(s.base_price).includes(query)
  )

  async function clientToggle(formData: FormData) {
    applyOptimistic(formData.get('id') as string)
    await toggleAction(formData)
  }

  return (
    <div className="space-y-3 mb-6">
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar servicio…" />

      {!services.length && (
        <p className="text-sm text-zinc-400 italic">Sin servicios en el catálogo.</p>
      )}
      {services.length > 0 && !filtered.length && (
        <p className="text-sm text-zinc-400 italic">Sin resultados para &ldquo;{query}&rdquo;</p>
      )}

      {filtered.map((s) => (
        <div
          key={s.id}
          className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between transition-opacity ${
            s.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-50'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">{s.name}</p>
            <p className="text-xs text-zinc-400">
              {formatCurrency(s.base_price)} · comisión{' '}
              {s.commission_type === 'fixed'
                ? formatCurrency(s.commission_value)
                : `${s.commission_value}%`}
              {s.description && ` · ${s.description}`}
            </p>
          </div>
          <form action={clientToggle}>
            <input type="hidden" name="id"        value={s.id} />
            <input type="hidden" name="is_active"  value={String(s.is_active)} />
            <button
              type="submit"
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                s.is_active
                  ? 'text-zinc-400 hover:text-red-500'
                  : 'text-green-600 hover:text-green-700 font-medium'
              }`}
            >
              {s.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}

// ── Products list ─────────────────────────────────────────────────────────────

type Product = {
  id:        string
  name:      string
  price:     number
  barcode?:  string | null
  is_active: boolean
}

interface ProductsProps {
  products: Product[]
}

export function ProductsListClient({ products }: ProductsProps) {
  const [query, setQuery] = useState('')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.barcode ?? '').toLowerCase().includes(query.toLowerCase()) ||
    String(p.price).includes(query)
  )

  return (
    <div className="space-y-3 mb-6">
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar producto o código…" />

      {!products.length && (
        <p className="text-sm text-zinc-400 italic">Sin productos en el catálogo.</p>
      )}
      {products.length > 0 && !filtered.length && (
        <p className="text-sm text-zinc-400 italic">Sin resultados para &ldquo;{query}&rdquo;</p>
      )}

      {filtered.map((p) => (
        <div
          key={p.id}
          className={`bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between ${
            p.is_active ? '' : 'opacity-50'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">{p.name}</p>
            <p className="text-xs text-zinc-400">
              {formatCurrency(p.price)}
              {p.barcode && <span className="font-mono ml-1.5">{p.barcode}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
