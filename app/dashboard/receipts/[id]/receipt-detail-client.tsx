'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import {
  ChevronLeft, CheckCircle2, XCircle, Banknote, CreditCard,
  Smartphone, Shuffle, Plus, Trash2, Scan, User, Tag,
  ShoppingBag, AlertCircle, Scissors, FileText, Mail,
} from 'lucide-react'
import {
  addServiceToReceipt,
  addProductToReceipt,
  removeServiceLine,
  removeProductLine,
  completeReceipt,
  voidReceipt,
} from '@/lib/actions/receipts'
import { formatCurrency, formatDate, calcCommissionAmt } from '@/lib/utils'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { Spinner } from '@/components/ui/spinner'
import { playSuccess, playComplete, playError } from '@/lib/sounds'
import type { UserRole, PaymentMethod } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Service = { id: string; name: string; base_price: number; commission_type: 'percentage' | 'fixed'; commission_value: number }
type Worker  = { id: string; full_name: string }
type Product = { id: string; name: string; price: number }

interface ReceiptLine {
  id: string
  price_charged?:    number
  commission_type?:  'percentage' | 'fixed'
  commission_value?: number
  commission_amt?:   number
  quantity?:         number
  unit_price?:       number
  subtotal?:         number
  service_catalog?: { id: string; name: string } | null
  product_catalog?: { id: string; name: string } | null
  workers?:         { id: string; full_name: string } | null
  /** true while the optimistic update hasn't been confirmed yet */
  pending?: boolean
}

type LineAction =
  | { type: 'add';    line: ReceiptLine }
  | { type: 'remove'; id: string }

interface Props {
  receipt: {
    id:             string
    status:         string
    payment_method: string
    issued_at:      string
    total_services: number
    total_products: number
    total_amount:   number
    created_by:     string | null
    workers:        { id: string; full_name: string } | null
    clients:        { id: string; full_name: string; phone: string | null; email: string | null } | null
    receipt_services: ReceiptLine[]
    receipt_products: ReceiptLine[]
  }
  workers:  Worker[]
  services: Service[]
  products: Product[]
  userRole: UserRole
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierta', completed: 'Completada', voided: 'Anulada',
}
const STATUS_CLASS: Record<string, string> = {
  open:      'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  voided:    'bg-zinc-100 text-zinc-500',
}
const PAYMENT_METHODS = [
  { id: 'cash',     label: 'Efectivo',      icon: Banknote },
  { id: 'card',     label: 'Tarjeta',       icon: CreditCard },
  { id: 'transfer', label: 'Transferencia', icon: Smartphone },
  { id: 'mixed',    label: 'Mixto',         icon: Shuffle },
] as const
const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto',
}

// Spring preset for immediate tactile feel
const SPRING = { type: 'spring', stiffness: 500, damping: 28 } as const
const SPRING_FAST = { type: 'spring', stiffness: 700, damping: 24 } as const

// ── Component ─────────────────────────────────────────────────────────────────

export function ReceiptDetailClient({ receipt, workers, services, products, userRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Optimistic state ─────────────────────────────────────────────────────
  const [optimisticServices, dispatchService] = useOptimistic<ReceiptLine[], LineAction>(
    receipt.receipt_services,
    (cur, action) =>
      action.type === 'add'
        ? [...cur, action.line]
        : cur.filter(l => l.id !== action.id)
  )
  const [optimisticProducts, dispatchProduct] = useOptimistic<ReceiptLine[], LineAction>(
    receipt.receipt_products,
    (cur, action) =>
      action.type === 'add'
        ? [...cur, action.line]
        : cur.filter(l => l.id !== action.id)
  )

  // Worker who registered the sale (via direct worker_id FK)
  const createdByWorker = receipt.workers ?? null

  // Optimistic totals (computed from optimistic lists)
  const optServicesTotal = optimisticServices.reduce((s, l) => s + (l.price_charged ?? 0), 0)
  const optProductsTotal = optimisticProducts.reduce((s, l) => s + (l.subtotal ?? 0), 0)
  const optTotal         = optServicesTotal + optProductsTotal

  // ── UI state ─────────────────────────────────────────────────────────────
  const [sheet,        setSheet]       = useState<'service' | 'product' | 'complete' | null>(null)
  const [showScanner,  setShowScanner] = useState(false)
  const [error,        setError]       = useState<string | null>(null)
  const [catalogTab,   setCatalogTab]  = useState<'service' | 'product'>('service')
  const [confirmVoid,  setConfirmVoid] = useState(false)

  // Service form
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedWorkerId,  setSelectedWorkerId]  = useState(workers[0]?.id ?? '')
  const [priceCharged,      setPriceCharged]      = useState('')

  // Product form
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty,               setQty]               = useState(1)

  const selectedService = services.find(s => s.id === selectedServiceId)
  const isOpen   = receipt.status === 'open'
  const canAdmin = userRole === 'admin' || userRole === 'superadmin'
  const hasItems = optimisticServices.length > 0 || optimisticProducts.length > 0

  function refresh() { router.refresh() }
  function openSheet(s: typeof sheet) { setError(null); setSheet(s) }
  function closeSheet() { setSheet(null) }

  // Commission preview
  const commissionPreview = selectedService && priceCharged
    ? selectedService.commission_type === 'fixed'
      ? `Comisión fija: ${formatCurrency(selectedService.commission_value)}`
      : `Comisión: ${selectedService.commission_value}% = ${formatCurrency(
          calcCommissionAmt(Number(priceCharged), selectedService.commission_type, selectedService.commission_value)
        )}`
    : null

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleServiceSelect(id: string) {
    setSelectedServiceId(id)
    const svc = services.find(s => s.id === id)
    if (svc) setPriceCharged(String(svc.base_price))
  }

  function handleAddService() {
    if (!selectedServiceId || !selectedWorkerId || !priceCharged || !selectedService) return
    setError(null)

    const worker = workers.find(w => w.id === selectedWorkerId)
    const price  = Number(priceCharged)

    // Build optimistic line
    const optimisticLine: ReceiptLine = {
      id:              `opt-svc-${Date.now()}`,
      service_catalog: { id: selectedServiceId, name: selectedService.name },
      workers:         { id: selectedWorkerId, full_name: worker?.full_name ?? '' },
      price_charged:   price,
      commission_type:  selectedService.commission_type,
      commission_value: selectedService.commission_value,
      commission_amt:   calcCommissionAmt(price, selectedService.commission_type, selectedService.commission_value),
      pending:         true,
    }

    startTransition(async () => {
      dispatchService({ type: 'add', line: optimisticLine })
      closeSheet()
      setSelectedServiceId('')
      setPriceCharged('')

      const result = await addServiceToReceipt({
        receipt_id:    receipt.id,
        service_id:    selectedServiceId,
        worker_id:     selectedWorkerId,
        price_charged: price,
      })

      if (result.error) {
        playError()
        setError(result.error)
      } else {
        playSuccess()
        refresh()
      }
    })
  }

  function handleAddProduct() {
    if (!selectedProductId) return
    setError(null)

    const product = products.find(p => p.id === selectedProductId)!
    const optimisticLine: ReceiptLine = {
      id:              `opt-prod-${Date.now()}`,
      product_catalog: { id: selectedProductId, name: product.name },
      quantity:        qty,
      unit_price:      product.price,
      subtotal:        product.price * qty,
      pending:         true,
    }

    startTransition(async () => {
      dispatchProduct({ type: 'add', line: optimisticLine })
      closeSheet()
      setSelectedProductId('')
      setQty(1)

      const result = await addProductToReceipt({ receipt_id: receipt.id, product_id: selectedProductId, quantity: qty })

      if (result.error) {
        playError()
        setError(result.error)
      } else {
        playSuccess()
        refresh()
      }
    })
  }

  function handleRemoveService(lineId: string) {
    startTransition(async () => {
      dispatchService({ type: 'remove', id: lineId })
      await removeServiceLine(lineId, receipt.id)
      refresh()
    })
  }

  function handleRemoveProduct(lineId: string) {
    startTransition(async () => {
      dispatchProduct({ type: 'remove', id: lineId })
      await removeProductLine(lineId, receipt.id)
      refresh()
    })
  }

  function handleComplete(method: PaymentMethod) {
    setError(null)
    startTransition(async () => {
      const result = await completeReceipt(receipt.id, method)
      if (result.error) {
        playError()
        setError(result.error)
      } else {
        playComplete()
        closeSheet()
        refresh()
      }
    })
  }

  function handleVoid() {
    startTransition(async () => {
      await voidReceipt(receipt.id)
      router.push('/dashboard/receipts')
    })
  }

  function handleBarcodeScan(code: string) {
    setShowScanner(false)
    const match = products.find(p => p.name.toLowerCase().includes(code.toLowerCase()))
    if (match) setSelectedProductId(match.id)
    setCatalogTab('product')
    openSheet('product')
  }

  // ── Shared sub-renders ────────────────────────────────────────────────────

  function ServiceCard({ svc }: { svc: Service }) {
    const active = selectedServiceId === svc.id
    return (
      <motion.button
        onClick={() => handleServiceSelect(svc.id)}
        disabled={!isOpen}
        whileTap={{ scale: 0.91 }}
        animate={{ scale: active ? 1.04 : 1 }}
        transition={SPRING}
        className={`p-4 rounded-2xl border-2 text-left min-h-[90px] flex flex-col justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
          active
            ? 'border-rose-600 bg-white shadow-lg shadow-rose-100'
            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
        }`}
      >
        <p className="text-sm font-bold text-zinc-900 leading-snug">{svc.name}</p>
        <p className="text-base font-black text-terra-500 mt-2 tabular-nums">{formatCurrency(svc.base_price)}</p>
      </motion.button>
    )
  }

  function ProductCard({ p }: { p: Product }) {
    const active = selectedProductId === p.id
    return (
      <motion.button
        onClick={() => setSelectedProductId(p.id)}
        disabled={!isOpen}
        whileTap={{ scale: 0.91 }}
        animate={{ scale: active ? 1.04 : 1 }}
        transition={SPRING}
        className={`p-4 rounded-2xl border-2 text-left min-h-[90px] flex flex-col justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
          active
            ? 'border-rose-600 bg-white shadow-lg shadow-rose-100'
            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
        }`}
      >
        <p className="text-sm font-bold text-zinc-900 leading-snug">{p.name}</p>
        <p className="text-base font-black text-terra-500 mt-2 tabular-nums">{formatCurrency(p.price)}</p>
      </motion.button>
    )
  }

  function WorkerChip({ w }: { w: Worker }) {
    const active = selectedWorkerId === w.id
    return (
      <motion.button
        key={w.id}
        onClick={() => setSelectedWorkerId(w.id)}
        whileTap={{ scale: 0.90 }}
        animate={{ scale: active ? 1.06 : 1 }}
        transition={SPRING}
        className={`px-5 py-3 rounded-2xl text-sm font-bold border-2 transition-colors ${
          active
            ? 'border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-200'
            : 'border-zinc-200 text-zinc-600 bg-white hover:border-zinc-300'
        }`}
      >
        {w.full_name}
      </motion.button>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-200 h-14 flex items-center px-4 md:px-6 justify-between">
        <Link
          href="/dashboard/receipts"
          className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-800 active:opacity-60 transition-colors"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Boletas</span>
        </Link>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full"
              >
                <AlertCircle size={13} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${STATUS_CLASS[receipt.status]}`}>
            {STATUS_LABEL[receipt.status]}
          </span>
        </div>
      </div>

      {/* ── Layout: two-panel when open, single centered when closed ── */}
      <div className={`relative flex md:h-[calc(100vh-56px)] ${!isOpen ? 'bg-[#F2F7F7]' : ''}`}>

        {/* Monstera decorations */}
        <div className="absolute top-0 right-0 w-[200px] translate-x-[30%] -translate-y-[15%] pointer-events-none select-none" aria-hidden="true">
          <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.09] w-full h-full" />
        </div>
        <div className="absolute bottom-0 left-0 w-[140px] -translate-x-[25%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
          <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.07] w-full h-full" />
        </div>

        {/* ══ Main content ══ */}
        <div className="flex-1 min-w-0 flex flex-col md:overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className={`space-y-4 ${isOpen ? 'p-4 md:p-6' : 'p-4 md:p-8 max-w-2xl mx-auto w-full'}`}>

              {/* ── Info card ── */}
              <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">

                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                  <p className="text-sm font-semibold text-zinc-500">{formatDate(receipt.issued_at)}</p>
                  <p className="text-xs font-mono text-zinc-300 tracking-widest">{receipt.id.slice(0, 8).toUpperCase()}</p>
                </div>

                {/* Detail rows */}
                <div className="divide-y divide-zinc-50">
                  {receipt.clients && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <User size={15} className="text-zinc-300 flex-shrink-0" />
                      <span className="text-sm font-semibold text-zinc-800">{receipt.clients.full_name}</span>
                      {receipt.clients.phone && (
                        <span className="text-sm text-zinc-400 ml-auto">{receipt.clients.phone}</span>
                      )}
                    </div>
                  )}
                  {receipt.clients?.email && (
                    <div className="flex items-center gap-3 px-5 py-3">
                      <Mail size={14} className="text-zinc-300 flex-shrink-0" />
                      <span className="text-xs text-zinc-400">{receipt.clients.email}</span>
                    </div>
                  )}
                  {receipt.status === 'completed' && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-zinc-600">Forma de pago</span>
                      <span className="text-sm font-semibold text-zinc-800 ml-auto">
                        {PAYMENT_LABEL[receipt.payment_method] ?? receipt.payment_method}
                      </span>
                    </div>
                  )}
                  {createdByWorker && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <Tag size={14} className="text-zinc-300 flex-shrink-0" />
                      <span className="text-sm text-zinc-400">Ingresada por</span>
                      <span className="text-sm font-semibold text-zinc-700 ml-auto">{createdByWorker.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Services list ── */}
              {(optimisticServices.length > 0 || isOpen) && (
                <div>
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Scissors size={12} />
                    Servicios
                    {optimisticServices.length > 0 && (
                      <span className="bg-zinc-200 text-zinc-600 text-[10px] px-1.5 py-0.5 rounded-full ml-auto">
                        {optimisticServices.length}
                      </span>
                    )}
                  </h2>
                  <AnimatePresence initial={false}>
                    {optimisticServices.map((line) => (
                      <motion.div
                        key={line.id}
                        initial={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                        animate={{ opacity: line.pending ? 0.65 : 1, scale: 1, height: 'auto', marginBottom: 10 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                        transition={SPRING}
                        className="bg-white border border-zinc-100 rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900 leading-snug">{line.service_catalog?.name}</p>
                            {line.pending && <Spinner size={13} className="text-zinc-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            {line.workers?.full_name}
                            {line.commission_amt ? (
                              <span className="text-zinc-300"> · com. {formatCurrency(line.commission_amt)}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <p className="text-base font-black text-zinc-900 tabular-nums">
                            {formatCurrency(line.price_charged ?? 0)}
                          </p>
                          {isOpen && !line.pending && (
                            <motion.button
                              onClick={() => handleRemoveService(line.id)}
                              disabled={isPending}
                              whileTap={{ scale: 0.78, rotate: -12 }}
                              transition={SPRING_FAST}
                              className="p-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-40"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {optimisticServices.length === 0 && (
                    <p className="text-sm text-zinc-400 italic py-2">Sin servicios</p>
                  )}
                  {/* Mobile-only add button */}
                  {isOpen && (
                    <motion.button
                      onClick={() => { setCatalogTab('service'); openSheet('service') }}
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING}
                      className="md:hidden mt-2 w-full py-4 rounded-2xl border-2 border-dashed border-zinc-200 text-sm font-medium text-zinc-500 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Agregar servicio
                    </motion.button>
                  )}
                </div>
              )}

              {/* ── Products list ── */}
              {(optimisticProducts.length > 0 || isOpen) && (
                <div>
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShoppingBag size={12} />
                    Productos
                    {optimisticProducts.length > 0 && (
                      <span className="bg-zinc-200 text-zinc-600 text-[10px] px-1.5 py-0.5 rounded-full ml-auto">
                        {optimisticProducts.length}
                      </span>
                    )}
                  </h2>
                  <AnimatePresence initial={false}>
                    {optimisticProducts.map((line) => (
                      <motion.div
                        key={line.id}
                        initial={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                        animate={{ opacity: line.pending ? 0.65 : 1, scale: 1, height: 'auto', marginBottom: 10 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                        transition={SPRING}
                        className="bg-white border border-zinc-100 rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900 leading-snug">{line.product_catalog?.name}</p>
                            {line.pending && <Spinner size={13} className="text-zinc-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            {line.quantity} × {formatCurrency(line.unit_price ?? 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <p className="text-base font-black text-zinc-900 tabular-nums">
                            {formatCurrency(line.subtotal ?? 0)}
                          </p>
                          {isOpen && !line.pending && (
                            <motion.button
                              onClick={() => handleRemoveProduct(line.id)}
                              disabled={isPending}
                              whileTap={{ scale: 0.78, rotate: -12 }}
                              transition={SPRING_FAST}
                              className="p-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-40"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {optimisticProducts.length === 0 && (
                    <p className="text-sm text-zinc-400 italic py-2">Sin productos</p>
                  )}
                  {isOpen && (
                    <div className="md:hidden mt-2 flex gap-2">
                      <motion.button
                        onClick={() => { setCatalogTab('product'); openSheet('product') }}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING}
                        className="flex-1 py-4 rounded-2xl border-2 border-dashed border-zinc-200 text-sm font-medium text-zinc-500 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Agregar producto
                      </motion.button>
                      <motion.button
                        onClick={() => setShowScanner(true)}
                        whileTap={{ scale: 0.90 }}
                        transition={SPRING}
                        className="py-4 px-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-500"
                      >
                        <Scan size={18} />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {isOpen && (
                <p className="hidden md:block text-xs text-zinc-400 text-center py-2">
                  Selecciona del panel derecho →
                </p>
              )}
            </div>
          </div>

          {/* ── Total + actions ── */}
          <div className={`flex-shrink-0 bg-white border-t border-zinc-200 ${
            isOpen
              ? 'p-4 md:p-5 md:mx-6 md:mb-6 md:rounded-2xl md:border-2 md:border-zinc-100 md:shadow-sm'
              : 'p-4 md:px-8 md:py-6 max-w-2xl mx-auto w-full md:border-none md:bg-transparent'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Scissors size={12} className="text-zinc-400" />
                  <span>Servicios</span>
                  <motion.span
                    key={optServicesTotal}
                    initial={{ opacity: 0.5, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING}
                    className="font-bold text-zinc-800 tabular-nums"
                  >
                    {formatCurrency(optServicesTotal)}
                  </motion.span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <ShoppingBag size={12} className="text-zinc-400" />
                  <span>Productos</span>
                  <motion.span
                    key={optProductsTotal}
                    initial={{ opacity: 0.5, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING}
                    className="font-bold text-zinc-800 tabular-nums"
                  >
                    {formatCurrency(optProductsTotal)}
                  </motion.span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 leading-none mb-1">TOTAL</p>
                <motion.p
                  key={optTotal}
                  initial={{ scale: 1.08, color: '#76A6A5' }}
                  animate={{ scale: 1, color: '#3D5151' }}
                  transition={SPRING}
                  className="text-3xl md:text-4xl font-black leading-none tabular-nums"
                >
                  {formatCurrency(optTotal)}
                </motion.p>
              </div>
            </div>

            {isOpen ? (
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {confirmVoid ? (
                    <motion.div
                      key="confirm-void"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={SPRING}
                      className="flex gap-2.5"
                    >
                      <button
                        onClick={() => setConfirmVoid(false)}
                        className="flex-1 py-4 border-2 border-zinc-200 text-zinc-600 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <motion.button
                        onClick={handleVoid}
                        disabled={isPending}
                        whileTap={{ scale: 0.94 }}
                        transition={SPRING}
                        className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isPending ? <Spinner size={16} /> : <XCircle size={17} />}
                        Confirmar anulación
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={SPRING}
                      className="flex gap-3"
                    >
                      {canAdmin && (
                        <motion.button
                          onClick={() => setConfirmVoid(true)}
                          disabled={isPending}
                          whileTap={{ scale: 0.94 }}
                          transition={SPRING}
                          className="py-4 px-5 border-2 border-red-200 text-red-500 rounded-2xl text-sm font-bold hover:bg-red-50 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                        >
                          <XCircle size={17} /> Anular
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => openSheet('complete')}
                        disabled={isPending || !hasItems}
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                        className="flex-1 py-4 bg-rose-900 text-white rounded-2xl text-base font-black hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/15"
                      >
                        {isPending ? (
                          <><Spinner size={18} /> Procesando...</>
                        ) : (
                          <><CheckCircle2 size={20} /> Completar</>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`py-4 rounded-2xl text-sm font-bold text-center ${
                  receipt.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {receipt.status === 'completed'
                    ? `✓ Completada — ${PAYMENT_LABEL[receipt.payment_method] ?? receipt.payment_method}`
                    : 'Boleta anulada'}
                </div>
                {receipt.status === 'completed' && (
                  <Link
                    href={`/dashboard/receipts/${receipt.id}/voucher`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-emerald-200 text-emerald-700 rounded-2xl text-sm font-bold hover:bg-emerald-50 active:scale-[0.98] transition-all"
                  >
                    <FileText size={16} />
                    Ver comprobante
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT: Catalog panel — only when receipt is open ══ */}
        {isOpen && <div className="hidden md:flex flex-col bg-zinc-50 border-l-2 border-zinc-100 w-[58%] lg:w-[60%] flex-shrink-0 overflow-hidden">

          {/* Tab row */}
          <div className="flex gap-3 p-4 border-b border-zinc-200 bg-white flex-shrink-0">
            {(['service', 'product'] as const).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setCatalogTab(tab)}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                  catalogTab === tab
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {tab === 'service' ? <><Scissors size={16} /> Servicios</> : <><ShoppingBag size={16} /> Productos</>}
              </motion.button>
            ))}
          </div>

          {/* Scrollable grid */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">

            {catalogTab === 'service' && (
              <div>
                {services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                    <Tag size={40} strokeWidth={1} className="mb-3 text-zinc-300" />
                    <p className="text-sm">No hay servicios en el catálogo</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
                      {services.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
                    </div>
                    <AnimatePresence>
                      {selectedService && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 12 }}
                          transition={SPRING}
                          className="space-y-5"
                        >
                          {/* Worker chips */}
                          <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Trabajadora</p>
                            <div className="flex flex-wrap gap-2.5">
                              {workers.map((w) => <WorkerChip key={w.id} w={w} />)}
                            </div>
                          </div>
                          {/* Price */}
                          <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Precio cobrado</p>
                            <input
                              type="number"
                              value={priceCharged}
                              onChange={(e) => setPriceCharged(e.target.value)}
                              inputMode="numeric"
                              min="0"
                              step="1"
                              suppressHydrationWarning
                              className="w-full px-5 py-4 rounded-2xl border-2 border-zinc-200 bg-white text-2xl font-black text-zinc-900 focus:outline-none focus:border-rose-400 transition-colors tabular-nums"
                              placeholder={String(selectedService.base_price)}
                            />
                            {commissionPreview && (
                              <p className="text-sm text-zinc-400 mt-2 flex items-center gap-1.5">
                                <Tag size={13} /> {commissionPreview}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}

            {catalogTab === 'product' && (
              <div>
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                    <ShoppingBag size={40} strokeWidth={1} className="mb-3 text-zinc-300" />
                    <p className="text-sm">No hay productos en el catálogo</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
                      {products.map((p) => <ProductCard key={p.id} p={p} />)}
                    </div>
                    <AnimatePresence>
                      {selectedProductId && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 12 }}
                          transition={SPRING}
                        >
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Cantidad</p>
                          <div className="flex items-center gap-4">
                            <motion.button
                              onClick={() => setQty(q => Math.max(1, q - 1))}
                              whileTap={{ scale: 0.82 }}
                              transition={SPRING_FAST}
                              className="w-14 h-14 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-700 text-2xl font-bold"
                            >
                              −
                            </motion.button>
                            <motion.span
                              key={qty}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              transition={SPRING_FAST}
                              className="text-4xl font-black text-zinc-900 w-14 text-center tabular-nums"
                            >
                              {qty}
                            </motion.span>
                            <motion.button
                              onClick={() => setQty(q => q + 1)}
                              whileTap={{ scale: 0.82 }}
                              transition={SPRING_FAST}
                              className="w-14 h-14 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-700 text-2xl font-bold"
                            >
                              +
                            </motion.button>
                            <span className="text-base font-bold text-zinc-500 ml-1 tabular-nums">
                              = {formatCurrency((products.find(p => p.id === selectedProductId)?.price ?? 0) * qty)}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sticky add button */}
          <div className="flex-shrink-0 p-4 border-t border-zinc-200 bg-white">
            {catalogTab === 'service' ? (
              <motion.button
                onClick={handleAddService}
                disabled={!isOpen || !selectedServiceId || !priceCharged || !selectedWorkerId || isPending}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="w-full py-5 bg-rose-900 text-white rounded-2xl text-base font-black hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/15"
              >
                {isPending
                  ? <><Spinner size={20} /> Agregando...</>
                  : selectedService
                    ? <><Plus size={22} strokeWidth={2.5} /> Agregar — {formatCurrency(Number(priceCharged) || selectedService.base_price)}</>
                    : <><Plus size={22} strokeWidth={2.5} /> Selecciona un servicio</>
                }
              </motion.button>
            ) : (
              <div className="flex gap-3">
                <motion.button
                  onClick={handleAddProduct}
                  disabled={!isOpen || !selectedProductId || isPending}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING}
                  className="flex-1 py-5 bg-rose-900 text-white rounded-2xl text-base font-black hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/15"
                >
                  {isPending
                    ? <><Spinner size={20} /> Agregando...</>
                    : <><Plus size={22} strokeWidth={2.5} /> {selectedProductId ? `Agregar ×${qty}` : 'Selecciona un producto'}</>
                  }
                </motion.button>
                <motion.button
                  onClick={() => setShowScanner(true)}
                  disabled={!isOpen}
                  whileTap={{ scale: 0.88 }}
                  transition={SPRING}
                  className="py-5 px-5 rounded-2xl border-2 border-zinc-200 text-zinc-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"
                >
                  <Scan size={22} />
                </motion.button>
              </div>
            )}
          </div>
        </div>}
      </div>

      {/* ── Mobile bottom sheets ── */}
      <div className="md:hidden">
        <BottomSheet open={sheet === 'service'} onClose={closeSheet} title="Agregar servicio">
          <div className="pb-6">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Servicio</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {services.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
            </div>
            <AnimatePresence>
              {selectedService && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Trabajadora</p>
                    <div className="flex flex-wrap gap-2">
                      {workers.map((w) => <WorkerChip key={w.id} w={w} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Precio cobrado</p>
                    <input
                      type="number"
                      value={priceCharged}
                      onChange={(e) => setPriceCharged(e.target.value)}
                      inputMode="numeric"
                      min="0"
                      step="1"
                      suppressHydrationWarning
                      className="w-full px-4 py-4 rounded-2xl border-2 border-zinc-200 text-2xl font-black focus:outline-none focus:border-rose-400 transition-colors tabular-nums"
                      placeholder={String(selectedService.base_price)}
                    />
                    {commissionPreview && <p className="text-xs text-zinc-400 mt-1.5">{commissionPreview}</p>}
                  </div>
                  <motion.button
                    onClick={handleAddService}
                    disabled={isPending || !priceCharged || !selectedWorkerId}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING}
                    className="w-full py-5 bg-rose-900 text-white rounded-2xl text-base font-black disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? <><Spinner size={18} /> Agregando...</> : 'Agregar servicio'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BottomSheet>

        <BottomSheet open={sheet === 'product'} onClose={closeSheet} title="Agregar producto">
          <div className="pb-6">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Producto</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            <AnimatePresence>
              {selectedProductId && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Cantidad</p>
                    <div className="flex items-center gap-4">
                      <motion.button onClick={() => setQty(q => Math.max(1, q - 1))} whileTap={{ scale: 0.82 }} transition={SPRING_FAST} className="w-14 h-14 rounded-2xl border-2 border-zinc-200 text-2xl font-bold text-zinc-700">−</motion.button>
                      <motion.span key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={SPRING_FAST} className="text-4xl font-black text-zinc-900 w-10 text-center tabular-nums">{qty}</motion.span>
                      <motion.button onClick={() => setQty(q => q + 1)} whileTap={{ scale: 0.82 }} transition={SPRING_FAST} className="w-14 h-14 rounded-2xl border-2 border-zinc-200 text-2xl font-bold text-zinc-700">+</motion.button>
                      <span className="text-sm font-bold text-zinc-500 tabular-nums">= {formatCurrency((products.find(p => p.id === selectedProductId)?.price ?? 0) * qty)}</span>
                    </div>
                  </div>
                  <motion.button
                    onClick={handleAddProduct}
                    disabled={isPending}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING}
                    className="w-full py-5 bg-rose-900 text-white rounded-2xl text-base font-black disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? <><Spinner size={18} /> Agregando...</> : 'Agregar producto'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BottomSheet>
      </div>

      {/* ── Complete sheet (all sizes) ── */}
      <BottomSheet open={sheet === 'complete'} onClose={closeSheet} title="¿Cómo paga?">
        <div className="pb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                onClick={() => handleComplete(id as PaymentMethod)}
                disabled={isPending}
                whileTap={{ scale: 0.94 }}
                transition={SPRING}
                className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              >
                <Icon size={30} strokeWidth={1.5} />
                <span className="text-sm font-bold">{label}</span>
              </motion.button>
            ))}
          </div>
          {canAdmin && (
            <motion.button
              onClick={() => { closeSheet(); setTimeout(() => setConfirmVoid(true), 200) }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <XCircle size={17} /> Anular boleta
            </motion.button>
          )}
        </div>
      </BottomSheet>

      {/* ── Barcode scanner ── */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
