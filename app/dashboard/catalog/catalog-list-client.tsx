'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchInput } from '@/components/ui/search-input'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { createServiceVariant, deleteServiceVariant, updateServiceVariant, toggleProduct, toggleService } from '@/lib/actions/catalog'

const SPRING = { type: 'spring', stiffness: 500, damping: 28 } as const

// ── Services list ─────────────────────────────────────────────────────────────

type ServiceVariant = {
  id:              string
  name:            string
  price:           number
  is_active:       boolean
  sort_order:      number
  hair_length_min: number | null
  hair_length_max: number | null
}

type Service = {
  id:               string
  name:             string
  base_price:       number
  commission_type:  string
  commission_value: number
  description?:     string | null
  is_active:        boolean
  service_variants: ServiceVariant[]
}

interface ServicesProps {
  services: Service[]
  toggleAction: (formData: FormData) => Promise<void>
}

// ── Variant modal ─────────────────────────────────────────────────────────────

interface VariantModalProps {
  open:      boolean
  variant:   ServiceVariant | null  // null = crear nuevo
  onClose:   () => void
  onSave:    (v: ServiceVariant) => void
  serviceId: string
  nextOrder: number
  isPending: boolean
  onSubmit:  (data: { name: string; price: number; hair_length_min: number | null; hair_length_max: number | null }) => void
}

function VariantModal({ open, variant, onClose, isPending, onSubmit }: VariantModalProps) {
  const isEdit = !!variant

  const [name,    setName]    = useState(variant?.name    ?? '')
  const [price,   setPrice]   = useState(variant ? String(variant.price) : '')
  const [hairMin, setHairMin] = useState(variant?.hair_length_min !== null && variant?.hair_length_min !== undefined ? String(variant.hair_length_min) : '')
  const [hairMax, setHairMax] = useState(variant?.hair_length_max !== null && variant?.hair_length_max !== undefined ? String(variant.hair_length_max) : '')

  // Reset when modal opens/changes variant
  const [lastVariantId, setLastVariantId] = useState(variant?.id)
  if (variant?.id !== lastVariantId) {
    setLastVariantId(variant?.id)
    setName(variant?.name ?? '')
    setPrice(variant ? String(variant.price) : '')
    setHairMin(variant?.hair_length_min !== null && variant?.hair_length_min !== undefined ? String(variant.hair_length_min) : '')
    setHairMax(variant?.hair_length_max !== null && variant?.hair_length_max !== undefined ? String(variant.hair_length_max) : '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const p = parseFloat(price)
    if (!name.trim() || isNaN(p) || p < 0) return
    onSubmit({
      name:            name.trim(),
      price:           p,
      hair_length_min: hairMin !== '' ? parseInt(hairMin) : null,
      hair_length_max: hairMax !== '' ? parseInt(hairMax) : null,
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,    y: 20, scale: 0.97 }}
            transition={SPRING}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[420px] bg-white rounded-2xl shadow-2xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-zinc-800">
                {isEdit ? 'Editar variante' : 'Nueva variante'}
              </h3>
              <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ej: Largo xl"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Precio</label>
                <input
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 tabular-nums"
                />
              </div>

              {/* Rango de largo */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                  Rango de largo de cabello <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      value={hairMin}
                      onChange={e => setHairMin(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Mínimo"
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">cm</span>
                  </div>
                  <span className="text-zinc-300">–</span>
                  <div className="flex-1 relative">
                    <input
                      value={hairMax}
                      onChange={e => setHairMax(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Máximo"
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">cm</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Si el servicio tiene variantes por largo, el POS sugerirá automáticamente esta variante cuando el largo ingresado esté dentro del rango.
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending || !name.trim() || !price}
                className="w-full py-3 bg-rose-900 text-white rounded-xl font-bold text-sm hover:bg-rose-800 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
              >
                {isPending ? <Spinner size={15} /> : null}
                {isEdit ? 'Guardar cambios' : 'Crear variante'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Service row ───────────────────────────────────────────────────────────────

function ServiceRow({ service, toggleAction }: { service: Service; toggleAction: (fd: FormData) => Promise<void> }) {
  const [expanded,  setExpanded]  = useState(false)
  const [variants,  setVariants]  = useState<ServiceVariant[]>(service.service_variants)
  const [modal,     setModal]     = useState<{ open: boolean; variant: ServiceVariant | null }>({ open: false, variant: null })
  const [isPending, startTransition] = useTransition()

  function openCreate() { setModal({ open: true, variant: null }) }
  function openEdit(v: ServiceVariant) { setModal({ open: true, variant: v }) }
  function closeModal() { setModal({ open: false, variant: null }) }

  function handleSubmit(data: { name: string; price: number; hair_length_min: number | null; hair_length_max: number | null }) {
    startTransition(async () => {
      if (modal.variant) {
        // Edit
        const result = await updateServiceVariant(modal.variant.id, data)
        if (result.data) {
          setVariants(vs => vs.map(v => v.id === modal.variant!.id ? result.data as ServiceVariant : v))
          closeModal()
        }
      } else {
        // Create
        const result = await createServiceVariant({
          service_id: service.id,
          sort_order:  variants.length,
          ...data,
        })
        if (result.data) {
          setVariants(vs => [...vs, result.data as ServiceVariant])
          closeModal()
        }
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteServiceVariant(id)
      setVariants(vs => vs.filter(v => v.id !== id))
    })
  }

  const hasVariants = variants.length > 0

  return (
    <>
      <div className={`bg-white border rounded-xl overflow-hidden transition-opacity ${
        service.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-50'
      }`}>
        {/* Main row */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">{service.name}</p>
            <p className="text-xs text-zinc-400">
              {hasVariants
                ? <span className="text-terra-500 font-medium">{variants.length} variante{variants.length !== 1 ? 's' : ''}</span>
                : formatCurrency(service.base_price)
              }
              {' · '}comisión{' '}
              {service.commission_type === 'fixed'
                ? formatCurrency(service.commission_value)
                : `${service.commission_value}%`}
              {service.description && ` · ${service.description}`}
            </p>
            {hasVariants && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {variants.map(v => (
                  <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded-full text-[11px] text-zinc-500 font-medium">
                    {v.name} · {formatCurrency(v.price)}
                    {(v.hair_length_min !== null || v.hair_length_max !== null) && (
                      <span className="text-zinc-400"> · {v.hair_length_min ?? '0'}–{v.hair_length_max !== null ? v.hair_length_max : '∞'} cm</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <form action={toggleAction}>
              <input type="hidden" name="id"        value={service.id} />
              <input type="hidden" name="is_active"  value={String(service.is_active)} />
              <button
                type="submit"
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  service.is_active
                    ? 'text-zinc-400 hover:text-red-500'
                    : 'text-green-600 hover:text-green-700 font-medium'
                }`}
              >
                {service.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Gestionar variantes"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Variants panel */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-100 px-4 py-3 space-y-2 bg-zinc-50">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">Variantes</p>

                {variants.length === 0 && (
                  <p className="text-xs text-zinc-400 italic">Sin variantes — agrega una para reemplazar el precio base</p>
                )}

                {variants.map(v => (
                  <div key={v.id} className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-zinc-700">{v.name}</span>
                    {(v.hair_length_min !== null || v.hair_length_max !== null) && (
                      <span className="text-[11px] text-zinc-400 tabular-nums">
                        {v.hair_length_min ?? '0'}–{v.hair_length_max !== null ? `${v.hair_length_max}` : '∞'} cm
                      </span>
                    )}
                    <span className="text-sm font-bold text-terra-500 tabular-nums">{formatCurrency(v.price)}</span>
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      disabled={isPending}
                      className="text-zinc-300 hover:text-zinc-600 transition-colors"
                      title="Editar variante"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      disabled={isPending}
                      className="text-zinc-300 hover:text-red-400 transition-colors"
                      title="Eliminar variante"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={openCreate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 w-full px-3 py-2 border border-dashed border-zinc-300 rounded-xl text-sm text-zinc-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Agregar variante
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <VariantModal
        open={modal.open}
        variant={modal.variant}
        onClose={closeModal}
        onSave={() => {}}
        serviceId={service.id}
        nextOrder={variants.length}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </>
  )
}

export function ServicesListClient({ services, toggleAction }: ServicesProps) {
  const [query, setQuery] = useState('')

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(query.toLowerCase()) ||
    String(s.base_price).includes(query)
  )

  return (
    <div className="space-y-3 mb-6">
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar servicio…" />

      {!services.length && (
        <p className="text-sm text-zinc-400 italic">Sin servicios en el catálogo.</p>
      )}
      {services.length > 0 && !filtered.length && (
        <p className="text-sm text-zinc-400 italic">Sin resultados para &ldquo;{query}&rdquo;</p>
      )}

      {filtered.map(s => (
        <ServiceRow key={s.id} service={s} toggleAction={toggleAction} />
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

function ProductRow({ product }: { product: Product }) {
  const [isActive,    setIsActive]    = useState(product.is_active)
  const [isPending,   startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleProduct(product.id, !isActive)
      setIsActive(v => !v)
    })
  }

  return (
    <div className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between transition-opacity ${
      isActive ? 'border-zinc-200' : 'border-zinc-100 opacity-50'
    }`}>
      <div>
        <p className="text-sm font-medium text-zinc-900">{product.name}</p>
        <p className="text-xs text-zinc-400">
          {formatCurrency(product.price)}
          {product.barcode && <span className="font-mono ml-1.5 text-zinc-300">{product.barcode}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
          isActive
            ? 'text-zinc-400 hover:text-red-500'
            : 'text-green-600 hover:text-green-700 font-medium'
        }`}
      >
        {isActive ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
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

      {filtered.map(p => <ProductRow key={p.id} product={p} />)}
    </div>
  )
}
